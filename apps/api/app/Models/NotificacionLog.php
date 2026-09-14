<?php

namespace App\Models;

use App\Events\NotificacionCreada;
use App\Support\PushSender;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Log;

class NotificacionLog extends Model
{
    // SEV-1 — Las notificaciones se crean server-side. Denylist conservadora:
    // sólo bloquea PK/timestamps. Los endpoints de marcar leído validan ownership.
    protected $guarded = [
        'id',
        'created_at',
        'updated_at',
    ];

    protected $table = 'notificaciones_log';

    protected static function booted(): void
    {
        // Broadcast en tiempo real al crear: la campana del frontend se actualiza al instante
        // (cae a polling si Reverb no está disponible — el broadcast es idempotente al log de DB)
        static::created(function (NotificacionLog $n) {
            if (! $n->user_id) {
                return;
            }

            // Canal 1: WebSocket (Reverb) — campana del frontend al instante
            try {
                broadcast(new NotificacionCreada($n))->toOthers();
            } catch (\Throwable $e) {
                Log::warning('NotificacionCreada broadcast failed', [
                    'error' => $e->getMessage(),
                    'notificacion_id' => $n->id,
                ]);
            }

            // Canal 2: Web Push (notificación nativa del navegador, incluso si la pestaña está cerrada)
            try {
                PushSender::sendToUser($n->user_id, [
                    'title' => $n->asunto ?: 'COMECYT',
                    'body' => strip_tags((string) $n->mensaje),
                    'url' => $n->solicitud_id ? '/solicitante/solicitudes/'.$n->solicitud_id : '/',
                    'tag' => 'notif-'.$n->id,
                ]);
            } catch (\Throwable $e) {
                Log::warning('Push send failed for NotificacionLog', [
                    'error' => $e->getMessage(),
                    'notificacion_id' => $n->id,
                ]);
            }
        });
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function solicitud()
    {
        return $this->belongsTo(Solicitud::class);
    }
}
