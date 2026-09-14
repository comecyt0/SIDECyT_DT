<?php

namespace App\Support;

use App\Models\PushSubscription;
use Illuminate\Support\Facades\Log;
use Minishlink\WebPush\Subscription;
use Minishlink\WebPush\WebPush;

/**
 * Envío de notificaciones push (Web Push estándar W3C).
 *
 * Requisitos:
 *   - VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT en .env
 *   - Suscripciones en tabla push_subscriptions
 *
 * Uso típico (en un event listener / observer / job):
 *   PushSender::sendToUser($userId, [
 *       'title' => 'Tu solicitud fue aprobada',
 *       'body'  => 'COMECYT-2026-XXX',
 *       'url'   => '/solicitante/solicitudes/123',
 *   ]);
 *
 * Si las VAPID keys no están configuradas, retorna 0 sin lanzar.
 */
class PushSender
{
    /**
     * Envía a TODAS las suscripciones del usuario; retorna conteo de éxitos.
     */
    public static function sendToUser(int $userId, array $payload): int
    {
        if (! env('VAPID_PUBLIC_KEY') || ! env('VAPID_PRIVATE_KEY')) {
            return 0;
        }

        $subscriptions = PushSubscription::where('user_id', $userId)->get();
        if ($subscriptions->isEmpty()) {
            return 0;
        }

        try {
            $webPush = new WebPush([
                'VAPID' => [
                    'subject' => env('VAPID_SUBJECT', 'mailto:noreply@comecyt.gob.mx'),
                    'publicKey' => env('VAPID_PUBLIC_KEY'),
                    'privateKey' => env('VAPID_PRIVATE_KEY'),
                ],
            ]);

            foreach ($subscriptions as $sub) {
                $webPush->queueNotification(
                    Subscription::create([
                        'endpoint' => $sub->endpoint,
                        'keys' => ['p256dh' => $sub->p256dh, 'auth' => $sub->auth],
                    ]),
                    json_encode([
                        'title' => $payload['title'] ?? 'COMECYT',
                        'body' => $payload['body'] ?? '',
                        'url' => $payload['url'] ?? '/',
                        'icon' => $payload['icon'] ?? '/logo.png',
                        'tag' => $payload['tag'] ?? 'comecyt',
                    ])
                );
            }

            $success = 0;
            foreach ($webPush->flush() as $report) {
                if ($report->isSuccess()) {
                    $success++;
                    PushSubscription::where('endpoint', $report->getEndpoint())
                        ->update(['last_used_at' => now()]);
                } else {
                    // Endpoint expirado/inválido (410 Gone) → eliminar suscripción
                    $statusCode = $report->getResponse()?->getStatusCode();
                    if (in_array($statusCode, [404, 410], true)) {
                        PushSubscription::where('endpoint', $report->getEndpoint())->delete();
                    } else {
                        Log::warning('Push send non-success', [
                            'endpoint' => substr($report->getEndpoint(), 0, 80),
                            'reason' => $report->getReason(),
                            'status' => $statusCode,
                        ]);
                    }
                }
            }

            return $success;
        } catch (\Throwable $e) {
            Log::warning('PushSender failed', ['error' => $e->getMessage()]);

            return 0;
        }
    }
}
