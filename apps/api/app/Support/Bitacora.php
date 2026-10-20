<?php

namespace App\Support;

use App\Models\AuditLog;

/**
 * E82 — Textos llanos del historial de acciones para los reportes (mismas reglas que el panel, AuditLogsClient):
 * nada de claves técnicas; si una acción no tiene texto propio, se arma desde su clave.
 */
class Bitacora
{
    public const ACCIONES = [
        'user.2fa_enabled' => 'Activó la verificación en dos pasos',
        'user.2fa_disabled' => 'Desactivó la verificación en dos pasos',
        'user.2fa_recovery_used' => 'Entró con un código de recuperación',
        'user.2fa_recovery_regenerated' => 'Generó nuevos códigos de recuperación',
        'user.created' => 'Creó un usuario',
        'user.updated' => 'Actualizó un usuario',
        'user.deleted' => 'Eliminó un usuario',
        'solicitud.aprobada' => 'Aprobó una solicitud',
        'solicitud.rechazada' => 'Rechazó una solicitud',
        'solicitud.observada' => 'Devolvió una solicitud con observaciones',
        'solicitud.enviada' => 'Envió una solicitud',
        'convenio.generado' => 'Generó un convenio',
        'acceso.aprobado' => 'Aprobó una solicitud de acceso',
        'acceso.rechazado' => 'Rechazó una solicitud de acceso',
        'folios.exportados' => 'Exportó folios',
        'bitacora.exportada' => 'Exportó el historial de acciones',
        'club.formato_descargado' => 'Descargó un formato del club',
    ];

    public const SUJETOS = [
        'User' => 'Usuario', 'Solicitud' => 'Solicitud', 'Convenio' => 'Convenio', 'Empresa' => 'Empresa', 'Convocatoria' => 'Convocatoria',
        'Ministracion' => 'Ministración', 'Informe' => 'Informe', 'SolicitudAcceso' => 'Solicitud de acceso', 'Club' => 'Club',
        'PasswordResetRequest' => 'Restablecimiento de contraseña',
    ];

    public static function accion(string $a): string
    {
        if (isset(self::ACCIONES[$a])) return self::ACCIONES[$a];
        $t = trim(preg_replace('/[._]+/', ' ', preg_replace('/^[a-z_]+\./', '', $a)));

        return $t === '' ? $a : mb_strtoupper(mb_substr($t, 0, 1)).mb_substr($t, 1);
    }

    public static function sujeto(?string $tipo, ?int $id): string
    {
        if (! $tipo) return '—';
        $corto = class_basename($tipo);
        $txt = self::SUJETOS[$corto] ?? $corto;

        return $id ? "{$txt} nº {$id}" : $txt;
    }

    /** Fila lista para reporte (hora del centro). */
    public static function fila(AuditLog $a): array
    {
        $f = \Carbon\Carbon::parse($a->created_at)->setTimezone('America/Mexico_City');

        return [
            'id' => $a->id, 'dia' => $f->format('d/m/Y'), 'hora' => $f->format('H:i'), 'accion' => self::accion((string) $a->action),
            'quien' => $a->user?->name ?? 'El sistema', 'correo' => $a->user?->email, 'sobre' => self::sujeto($a->subject_type, $a->subject_id), 'ip' => $a->ip,
        ];
    }
}
