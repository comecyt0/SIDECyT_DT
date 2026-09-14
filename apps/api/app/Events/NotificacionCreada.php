<?php

namespace App\Events;

use App\Models\NotificacionLog;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class NotificacionCreada implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public NotificacionLog $notificacion) {}

    public function broadcastOn(): array
    {
        return [new PrivateChannel('user.'.$this->notificacion->user_id)];
    }

    public function broadcastAs(): string
    {
        return 'notification.created';
    }

    public function broadcastWith(): array
    {
        return [
            'id' => $this->notificacion->id,
            'asunto' => $this->notificacion->asunto,
            'mensaje' => $this->notificacion->mensaje,
            'tipo' => $this->notificacion->tipo,
            'solicitud_id' => $this->notificacion->solicitud_id,
            'created_at' => $this->notificacion->created_at?->toIso8601String(),
        ];
    }
}
