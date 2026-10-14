<?php

namespace App\Http\Controllers\Interno;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\Audit;
use BaconQrCode\Renderer\Image\SvgImageBackEnd;
use BaconQrCode\Renderer\ImageRenderer;
use BaconQrCode\Renderer\RendererStyle\RendererStyle;
use BaconQrCode\Writer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use PragmaRX\Google2FA\Google2FA;

/**
 * E72 — 2FA único SIGAE/SICEI. El secreto TOTP vive en `users.two_factor_secret`, cifrado con la APP_KEY de SIGAE;
 * SICEI nunca lo lee: configura, confirma y verifica códigos por aquí (canal interno firmado, InternoSiceiMiddleware).
 * Misma lógica que TwoFactorController (setup/confirm) y AuthController (verificación del reto).
 *
 *   POST /api/interno/sicei/2fa/verificar   { user_id, code } → { valido }
 *   POST /api/interno/sicei/2fa/configurar  { user_id }       → { secret, qr_svg }   (422 si ya está activo)
 *   POST /api/interno/sicei/2fa/confirmar   { user_id, code } → { confirmado, recovery_codes } (422 si el código falla)
 */
class DosFactoresSiceiController extends Controller
{
    private Google2FA $g2fa;

    public function __construct()
    {
        $this->g2fa = new Google2FA;
    }

    public function verificar(Request $request): JsonResponse
    {
        $datos = $request->validate(['user_id' => 'required|integer|min:1', 'code' => 'required|string|size:6']);
        $user = $this->cuenta((int) $datos['user_id']);

        // Mismo tope que el reto de SIGAE: 5 intentos por minuto por cuenta (el canal no permite fuerza bruta)
        $llave = 'interno-sicei-2fa:'.$datos['user_id'];
        if (RateLimiter::tooManyAttempts($llave, 5)) {
            return response()->json(['valido' => false], 429);
        }
        RateLimiter::hit($llave, 60);

        $valido = $user !== null && $user->hasTwoFactorEnabled() && $this->g2fa->verifyKey($user->two_factor_secret, $datos['code']);
        if ($valido) {
            RateLimiter::clear($llave);
        }

        return response()->json(['valido' => $valido]);
    }

    public function configurar(Request $request): JsonResponse
    {
        $datos = $request->validate(['user_id' => 'required|integer|min:1']);
        $user = $this->cuenta((int) $datos['user_id']);
        abort_if($user === null, 404);

        if ($user->hasTwoFactorEnabled()) {
            return response()->json(['error' => 'El 2FA ya está activo.'], 422);
        }

        $secret = $this->g2fa->generateSecretKey();
        $user->two_factor_secret = $secret;
        $user->two_factor_confirmed_at = null;
        $user->save();

        $otpUri = $this->g2fa->getQRCodeUrl(config('app.name', 'COMECYT'), $user->email, $secret);
        $qrSvg = (new Writer(new ImageRenderer(new RendererStyle(220), new SvgImageBackEnd)))->writeString($otpUri);
        Audit::log('user.2fa_setup_desde_sicei', $user);

        return response()->json(['secret' => $secret, 'qr_svg' => $qrSvg]);
    }

    public function confirmar(Request $request): JsonResponse
    {
        $datos = $request->validate(['user_id' => 'required|integer|min:1', 'code' => 'required|string|size:6']);
        $user = $this->cuenta((int) $datos['user_id']);
        abort_if($user === null, 404);

        if (! $user->two_factor_secret || ! $this->g2fa->verifyKey($user->two_factor_secret, $datos['code'])) {
            return response()->json(['confirmado' => false], 422);
        }

        $codigos = collect(range(1, 8))->map(fn () => Str::random(10).'-'.Str::random(10))->all();
        $user->two_factor_recovery_codes = $codigos;
        $user->two_factor_confirmed_at = now();
        $user->save();
        Audit::log('user.2fa_enabled_desde_sicei', $user);

        return response()->json(['confirmado' => true, 'recovery_codes' => $codigos]);
    }

    /** Solo cuentas activas (una cuenta desactivada en SIGAE tampoco opera su 2FA desde SICEI). */
    private function cuenta(int $id): ?User
    {
        return User::where('id', $id)->where('activo', true)->first();
    }
}
