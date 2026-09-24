<?php

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;

/**
 * E45 — Mensaje nuevo en un hilo del buzón. Canal PRIVADO `conversacion.{id}`: solo lo escuchan los participantes
 * (autorización en routes/channels.php). ShouldBroadcastNow: el chat no espera a la cola.
 */
class MensajeBuzonEnviado implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets;

    public function __construct(public array $mensaje, public int $conversacionId) {}

    public function broadcastOn(): array
    {
        return [new PrivateChannel('conversacion.'.$this->conversacionId)];
    }

    public function broadcastAs(): string
    {
        return 'mensaje.enviado';
    }

    public function broadcastWith(): array
    {
        return $this->mensaje;
    }
}
