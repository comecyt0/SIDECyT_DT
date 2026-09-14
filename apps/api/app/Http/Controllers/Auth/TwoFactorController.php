<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Support\Audit;
use BaconQrCode\Renderer\Image\SvgImageBackEnd;
use BaconQrCode\Renderer\ImageRenderer;
use BaconQrCode\Renderer\RendererStyle\RendererStyle;
use BaconQrCode\Writer;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use PragmaRX\Google2FA\Google2FA;

/**
 * Maneja el ciclo de vida del 2FA por TOTP (Google Authenticator / Authy / 1Password).
 *
 * Endpoints (todos requieren JWT):
 *   POST /auth/2fa/setup     → genera secret + QR (aún no activa)
 *   POST /auth/2fa/confirm   → verifica primer código y activa
 *   POST /auth/2fa/disable   → desactiva (requiere password + código vigente)
 *   POST /auth/2fa/recovery  → regenera códigos de recuperación
 *
 * El flujo de login con 2FA se maneja en AuthController::login.
 */
class TwoFactorController extends Controller
{
    private Google2FA $g2fa;

    public function __construct()
    {
        $this->g2fa = new Google2FA;
    }

    /**
     * POST /auth/2fa/setup
     * Genera un secreto nuevo y devuelve QR SVG para que el usuario lo escanee.
     * No activa el 2FA aún — eso ocurre en /confirm.
     */
    public function setup(Request $request)
    {
        $user = $request->user();

        if ($user->hasTwoFactorEnabled()) {
            return response()->json(['error' => 'El 2FA ya está activo. Desactívalo primero para regenerar.'], 422);
        }

        $secret = $this->g2fa->generateSecretKey();
        $user->two_factor_secret = $secret;
        $user->two_factor_confirmed_at = null;
        $user->save();

        $issuer = config('app.name', 'COMECYT');
        $label = $user->email;
        $otpUri = $this->g2fa->getQRCodeUrl($issuer, $label, $secret);

        $renderer = new ImageRenderer(new RendererStyle(220), new SvgImageBackEnd);
        $writer = new Writer($renderer);
        $qrSvg = $writer->writeString($otpUri);

        return response()->json([
            'secret' => $secret,                    // por si el usuario prefiere meterlo a mano
            'qr_svg' => $qrSvg,
            'otp_uri' => $otpUri,
            'message' => 'Escanea el QR en tu app autenticadora y confirma con el primer código de 6 dígitos.',
        ]);
    }

    /**
     * POST /auth/2fa/confirm   { code }
     * Activa el 2FA si el código es válido. Devuelve códigos de recuperación.
     */
    public function confirm(Request $request)
    {
        $request->validate(['code' => 'required|string|size:6']);
        $user = $request->user();

        if (! $user->two_factor_secret) {
            return response()->json(['error' => 'Inicia el setup primero (POST /auth/2fa/setup).'], 422);
        }

        if (! $this->g2fa->verifyKey($user->two_factor_secret, $request->code)) {
            return response()->json(['error' => 'Código inválido. Verifica la hora de tu dispositivo.'], 422);
        }

        $recoveryCodes = collect(range(1, 8))->map(fn () => Str::random(10).'-'.Str::random(10))->all();
        $user->two_factor_recovery_codes = $recoveryCodes;
        $user->two_factor_confirmed_at = now();
        $user->save();

        Audit::log('user.2fa_enabled', $user);

        return response()->json([
            'message' => '2FA activado. Guarda estos códigos de recuperación en un lugar seguro.',
            'recovery_codes' => $recoveryCodes,
        ]);
    }

    /**
     * POST /auth/2fa/disable   { password, code }
     * Requiere contraseña actual y un código TOTP vigente para evitar abuso.
     */
    public function disable(Request $request)
    {
        $request->validate([
            'password' => 'required|string',
            'code' => 'required|string|size:6',
        ]);
        $user = $request->user();

        if (! $user->hasTwoFactorEnabled()) {
            return response()->json(['error' => 'El 2FA no está activo.'], 422);
        }

        if (! \Hash::check($request->password, $user->password)) {
            return response()->json(['error' => 'Contraseña incorrecta.'], 422);
        }

        if (! $this->g2fa->verifyKey($user->two_factor_secret, $request->code)) {
            return response()->json(['error' => 'Código TOTP inválido.'], 422);
        }

        $user->two_factor_secret = null;
        $user->two_factor_recovery_codes = null;
        $user->two_factor_confirmed_at = null;
        $user->save();

        Audit::log('user.2fa_disabled', $user);

        return response()->json(['message' => '2FA desactivado.']);
    }

    /**
     * POST /auth/2fa/recovery   { code }
     * Regenera la lista de códigos de recuperación. Requiere un código TOTP vigente.
     */
    public function regenerateRecoveryCodes(Request $request)
    {
        $request->validate(['code' => 'required|string|size:6']);
        $user = $request->user();

        if (! $user->hasTwoFactorEnabled()) {
            return response()->json(['error' => 'El 2FA no está activo.'], 422);
        }

        if (! $this->g2fa->verifyKey($user->two_factor_secret, $request->code)) {
            return response()->json(['error' => 'Código TOTP inválido.'], 422);
        }

        $recoveryCodes = collect(range(1, 8))->map(fn () => Str::random(10).'-'.Str::random(10))->all();
        $user->two_factor_recovery_codes = $recoveryCodes;
        $user->save();

        Audit::log('user.2fa_recovery_regenerated', $user);

        return response()->json([
            'message' => 'Nuevos códigos generados.',
            'recovery_codes' => $recoveryCodes,
        ]);
    }
}
