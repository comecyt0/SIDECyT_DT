<?php

namespace App\Notifications\Channels;

use App\Models\NotificacionLog;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\Log;

/**
 * Canal "campana" (24/09/2026): escribe la notificación en `notificaciones_log`, que es lo que lee la campana del
 * panel (y dispara tiempo real + push por el evento `created` del modelo).
 *
 * Antes las notificaciones declaraban el canal 'database' de Laravel, que escribe en la tabla `notifications`:
 * nada del sistema la lee, así que esos avisos nunca aparecían en la campana. Y los avisos solo por correo a un
 * buzón inexistente (el admin tiene un dominio sin MX) se perdían sin rastro. Con este canal, cada aviso queda en
 * el sistema aunque el correo no llegue.
 *
 * La notificación aporta `toCampana()` (o, en su defecto, `toArray()`) con: mensaje, tipo, asunto?, solicitud_id?.
 */
class CampanaChannel
{
    public function send(object $notifiable, Notification $notification): void
    {
        $datos = method_exists($notification, 'toCampana')
            ? $notification->toCampana($notifiable)
            : (method_exists($notification, 'toArray') ? $notification->toArray($notifiable) : []);

        if (! is_array($datos) || empty($notifiable->id)) {
            return;
        }

        $mensaje = trim(strip_tags((string) ($datos['mensaje'] ?? '')));
        try {
            NotificacionLog::create([
                'user_id' => $notifiable->id,
                'correo_destino' => (string) ($notifiable->email ?? ''),
                'asunto' => mb_substr((string) ($datos['asunto'] ?? $mensaje ?: 'Aviso del sistema'), 0, 255),
                'mensaje' => mb_substr($mensaje, 0, 2000),
                'tipo' => mb_substr((string) ($datos['tipo'] ?? 'info'), 0, 60),
                'solicitud_id' => isset($datos['solicitud_id']) ? (int) $datos['solicitud_id'] : null,
                // 02/10/2026: a dónde lleva el aviso (solo rutas internas válidas; si no, null y el front decide).
                'enlace' => \App\Support\EnlaceAviso::valido($datos['enlace'] ?? null),
                'enviado' => false,
            ]);
        } catch (\Throwable $e) {
            Log::warning('CampanaChannel: no se pudo registrar el aviso', ['notificacion' => $notification::class, 'error' => $e->getMessage()]);
        }
    }
}
