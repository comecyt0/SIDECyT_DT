<?php

namespace App\Support;

use App\Models\Club;
use App\Models\ClubFirmado;
use App\Models\User;
use App\Notifications\ClubAviso;
use BaconQrCode\Renderer\GDLibRenderer;
use BaconQrCode\Writer;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Str;

/**
 * E52 · F4 — QR por club (§6.6 y §14). El QR lleva un token opaco (40 caracteres aleatorios) con prefijo; nada del club
 * viaja dentro. El token se guarda CIFRADO (para volver a pintarlo al líder) y como HASH sha256 (para encontrar el club al
 * escanear sin descifrar). Solo se habilita con el club aceptado y su carta de resguardo APROBADA; revocar lo invalida.
 */
class QrClub
{
    public const PREFIJO = 'SIDECYT-CLUB:';

    /** ¿Cumple los requisitos para habilitar su QR? Devuelve el motivo si no. */
    public static function impedimento(Club $club): ?string
    {
        if (! in_array($club->estado, Club::ACEPTADOS, true)) return 'el club no está aceptado';
        // 20/10/2026 (decisión del usuario): en modalidad nacional e internacional no hay kit ni carta de resguardo.
        if (! KitClub::aplica($club->convocatoria?->especieConfig)) return null;
        $aprobada = ClubFirmado::where('club_id', $club->id)->where('tipo', 'resguardo')->where('estado', 'aprobado')->exists();

        return $aprobada ? null : 'su carta de resguardo no está aprobada';
    }

    public static function habilitado(Club $club): bool
    {
        return $club->qr_habilitado_at !== null && $club->qr_hash !== null;
    }

    /** Habilita el QR de uno o varios clubes (solo los que el usuario opera y cumplen requisitos). */
    public static function habilitar(array $clubIds, User $u): array
    {
        $hechos = []; $omitidos = [];
        foreach (Club::whereIn('id', $clubIds)->get() as $c) {
            if (! RevisionClub::puedeAceptar($u, (int) $c->convocatoria_id)) continue;
            if (self::habilitado($c)) { $omitidos[] = ['id' => $c->id, 'nombre' => $c->nombre, 'motivo' => 'ya tenía su QR habilitado']; continue; }
            if ($m = self::impedimento($c)) { $omitidos[] = ['id' => $c->id, 'nombre' => $c->nombre, 'motivo' => $m]; continue; }
            $token = Str::random(40);
            $c->forceFill(['qr_token' => Crypt::encryptString($token), 'qr_hash' => hash('sha256', $token), 'qr_habilitado_at' => now(), 'qr_habilitado_por' => $u->id])->save();
            Audit::log('club.qr_habilitado', $c, ['folio' => $c->folio]);
            $c->loadMissing('lider');
            RevisionClub::avisarLider($c, 'qr_habilitado', [], true);
            $hechos[] = $c->id;
        }

        return ['habilitados' => $hechos, 'omitidos' => $omitidos];
    }

    /** Revoca el QR: el token deja de servir de inmediato; si se vuelve a habilitar, será otro. */
    public static function revocar(Club $club, User $u): void
    {
        $club->forceFill(['qr_token' => null, 'qr_hash' => null, 'qr_habilitado_at' => null, 'qr_habilitado_por' => null])->save();
        Audit::log('club.qr_revocado', $club, ['folio' => $club->folio]);
        $club->loadMissing('lider');
        RevisionClub::avisarLider($club, 'qr_revocado', [], true);
    }

    /** Contenido leído por la cámara → club con QR vigente (o null). Acepta el contenido completo o solo el token. */
    public static function buscar(string $leido): ?Club
    {
        $t = trim($leido);
        if (str_starts_with($t, self::PREFIJO)) $t = substr($t, strlen(self::PREFIJO));
        if (! preg_match('/^[A-Za-z0-9]{40}$/', $t)) return null;

        return Club::where('qr_hash', hash('sha256', $t))->whereNotNull('qr_habilitado_at')->first();
    }

    private static function contenido(Club $club): string
    {
        return self::PREFIJO.Crypt::decryptString($club->qr_token);
    }

    /** PNG del QR (pantalla del líder y PDF). Se sirve PNG, no SVG, por la regla de no servir imágenes SVG. */
    public static function png(Club $club, int $tam = 420): string
    {
        return (new Writer(new GDLibRenderer($tam, 2)))->writeString(self::contenido($club));
    }

    public static function pngDataUri(Club $club, int $tam = 420): string
    {
        return 'data:image/png;base64,'.base64_encode(self::png($club, $tam));
    }
}
