<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\Rol;
use App\Models\User;
use App\Support\Audit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * SSO OIDC (OpenID Connect) — Authorization Code Flow con PKCE.
 *
 * Pensado para integrarse con un IdP institucional (Gob. Estado de México)
 * cuando entreguen las credenciales. Mientras tanto sólo expone los
 * endpoints; si OIDC_* no está configurado retorna 503.
 *
 * Variables .env requeridas:
 *   OIDC_ENABLED=true|false
 *   OIDC_ISSUER=https://idp.edomex.gob.mx
 *   OIDC_CLIENT_ID=comecyt
 *   OIDC_CLIENT_SECRET=...
 *   OIDC_REDIRECT_URI=https://dominio.edomex.gob.mx/api/auth/sso/callback
 *   OIDC_SCOPES="openid profile email"
 *   OIDC_DEFAULT_ROLE_SLUG=solicitante     # Rol asignado a usuarios nuevos vía JIT
 *
 * Endpoints discovery:
 *   GET {issuer}/.well-known/openid-configuration
 *   GET {issuer}/oauth2/authorize
 *   POST {issuer}/oauth2/token
 *   GET {issuer}/oauth2/userinfo
 */
class SsoController extends Controller
{
    /**
     * GET /auth/sso/login
     * Redirige al usuario al endpoint de autorización del IdP con state + PKCE.
     */
    public function login(Request $request)
    {
        if (! $this->enabled()) {
            return response()->json(['error' => 'SSO no habilitado en este servidor.'], 503);
        }

        $state = Str::random(32);
        $codeVerifier = Str::random(64);
        $codeChallenge = rtrim(strtr(base64_encode(hash('sha256', $codeVerifier, true)), '+/', '-_'), '=');

        // Persistimos state+verifier por 10 min para validar en el callback
        Cache::put('oidc:state:'.$state, [
            'verifier' => $codeVerifier,
            'ip' => $request->ip(),
        ], now()->addMinutes(10));

        $authorizeUrl = $this->discovery()['authorization_endpoint'] ?? null;
        if (! $authorizeUrl) {
            return response()->json(['error' => 'No se pudo resolver el authorization_endpoint del IdP.'], 502);
        }

        $params = http_build_query([
            'response_type' => 'code',
            'client_id' => env('OIDC_CLIENT_ID'),
            'redirect_uri' => env('OIDC_REDIRECT_URI'),
            'scope' => env('OIDC_SCOPES', 'openid profile email'),
            'state' => $state,
            'code_challenge' => $codeChallenge,
            'code_challenge_method' => 'S256',
        ]);

        return redirect($authorizeUrl.'?'.$params);
    }

    /**
     * GET /auth/sso/callback?code=...&state=...
     * Intercambia el code por id_token + access_token, valida claims, hace
     * JIT provisioning del usuario si no existe, y emite JWT propio del sistema.
     */
    public function callback(Request $request)
    {
        if (! $this->enabled()) {
            return response()->json(['error' => 'SSO no habilitado en este servidor.'], 503);
        }

        $code = (string) $request->query('code', '');
        $state = (string) $request->query('state', '');
        if (! $code || ! $state) {
            return response()->json(['error' => 'Falta code o state.'], 400);
        }

        $stateData = Cache::pull('oidc:state:'.$state);
        if (! $stateData) {
            return response()->json(['error' => 'State inválido o expirado.'], 422);
        }

        $disco = $this->discovery();
        $tokenEndpoint = $disco['token_endpoint'] ?? null;
        $userinfoEndpoint = $disco['userinfo_endpoint'] ?? null;
        if (! $tokenEndpoint || ! $userinfoEndpoint) {
            return response()->json(['error' => 'Discovery del IdP incompleto.'], 502);
        }

        // 1. Intercambiar code por tokens
        $tokenResp = Http::asForm()
            ->withBasicAuth(env('OIDC_CLIENT_ID'), env('OIDC_CLIENT_SECRET'))
            ->post($tokenEndpoint, [
                'grant_type' => 'authorization_code',
                'code' => $code,
                'redirect_uri' => env('OIDC_REDIRECT_URI'),
                'code_verifier' => $stateData['verifier'],
                'client_id' => env('OIDC_CLIENT_ID'),
            ]);

        if (! $tokenResp->successful()) {
            Log::warning('OIDC token exchange failed', ['body' => $tokenResp->body()]);

            return response()->json(['error' => 'Intercambio de token con el IdP falló.'], 502);
        }

        $accessToken = $tokenResp->json('access_token');
        if (! $accessToken) {
            return response()->json(['error' => 'Sin access_token en respuesta del IdP.'], 502);
        }

        // 2. Pedir userinfo
        $userResp = Http::withToken($accessToken)->get($userinfoEndpoint);
        if (! $userResp->successful()) {
            return response()->json(['error' => 'No se pudo obtener userinfo del IdP.'], 502);
        }

        $claims = $userResp->json();
        $email = $claims['email'] ?? null;
        $name = $claims['name'] ?? ($claims['preferred_username'] ?? null);

        if (! $email) {
            return response()->json(['error' => 'El IdP no devolvió email en los claims.'], 422);
        }

        // 3. JIT provisioning — crear usuario si no existe
        $defaultRoleSlug = env('OIDC_DEFAULT_ROLE_SLUG', 'solicitante');
        $rol = Rol::where('slug', $defaultRoleSlug)->first();

        $user = User::firstOrCreate(
            ['email' => $email],
            [
                'name' => $name ?: $email,
                'password' => Hash::make(Str::random(40)), // password aleatorio, login es vía SSO
                'rol_id' => $rol?->id ?? 4,
                'activo' => true,
            ]
        );

        // Actualizar nombre si cambió en el IdP
        if ($name && $user->name !== $name) {
            $user->update(['name' => $name]);
        }

        Audit::log('user.sso_login', $user, [
            'issuer' => env('OIDC_ISSUER'),
            'jit_provisioned' => $user->wasRecentlyCreated,
        ]);

        // 4. Emitir nuestro JWT (mismo respondWithToken)
        $token = auth('api')->login($user);

        return app(AuthController::class)->callRespondWithToken($token);
    }

    private function enabled(): bool
    {
        return filter_var(env('OIDC_ENABLED', false), FILTER_VALIDATE_BOOLEAN)
            && env('OIDC_ISSUER')
            && env('OIDC_CLIENT_ID')
            && env('OIDC_CLIENT_SECRET')
            && env('OIDC_REDIRECT_URI');
    }

    /**
     * Cachea el resultado de .well-known/openid-configuration por 1 hora.
     */
    private function discovery(): array
    {
        $issuer = rtrim((string) env('OIDC_ISSUER'), '/');

        return Cache::remember('oidc:discovery:'.md5($issuer), now()->addHour(), function () use ($issuer) {
            $resp = Http::timeout(5)->get($issuer.'/.well-known/openid-configuration');

            return $resp->successful() ? $resp->json() : [];
        });
    }
}
