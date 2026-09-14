<?php

namespace App\Http\Controllers;

use App\Models\PushSubscription;
use Illuminate\Http\Request;

class PushController extends Controller
{
    /**
     * GET /push/vapid-public-key
     * Devuelve la clave pública VAPID que el frontend usa para suscribirse.
     * Sin esto, push no funciona.
     *
     * Para generar las VAPID keys:
     *   1. (Una vez instalado minishlink/web-push) `php artisan tinker`
     *   2. >>> Minishlink\WebPush\VAPID::createVapidKeys()
     *   3. Guardar el resultado en .env:
     *        VAPID_PUBLIC_KEY=<publicKey>
     *        VAPID_PRIVATE_KEY=<privateKey>
     *        VAPID_SUBJECT=mailto:noreply@comecyt.gob.mx
     */
    public function vapidPublicKey()
    {
        return response()->json([
            'public_key' => env('VAPID_PUBLIC_KEY'),
            'configured' => ! empty(env('VAPID_PUBLIC_KEY')),
        ]);
    }

    /**
     * POST /push/subscribe   { endpoint, keys: { p256dh, auth } }
     * Guarda la suscripción del usuario actual; idempotente por (user_id, endpoint).
     */
    public function subscribe(Request $request)
    {
        $data = $request->validate([
            'endpoint' => 'required|string',
            'keys.p256dh' => 'required|string',
            'keys.auth' => 'required|string',
        ]);

        $sub = PushSubscription::updateOrCreate(
            ['user_id' => $request->user()->id, 'endpoint' => $data['endpoint']],
            [
                'p256dh' => $data['keys']['p256dh'],
                'auth' => $data['keys']['auth'],
                'user_agent' => substr((string) $request->userAgent(), 0, 255),
                'last_used_at' => now(),
            ]
        );

        return response()->json([
            'message' => 'Suscripción registrada.',
            'subscription_id' => $sub->id,
        ], 201);
    }

    /**
     * POST /push/unsubscribe   { endpoint }
     * Elimina la suscripción de este endpoint para el usuario actual.
     */
    public function unsubscribe(Request $request)
    {
        $data = $request->validate(['endpoint' => 'required|string']);

        $deleted = PushSubscription::where('user_id', $request->user()->id)
            ->where('endpoint', $data['endpoint'])
            ->delete();

        return response()->json([
            'message' => 'Suscripción eliminada.',
            'deleted' => $deleted,
        ]);
    }

    /**
     * TODO: Push sending (requiere `composer require minishlink/web-push`).
     *
     * Una vez instalado el paquete:
     *
     *   use Minishlink\WebPush\WebPush;
     *   use Minishlink\WebPush\Subscription;
     *
     *   $webPush = new WebPush([
     *       'VAPID' => [
     *           'subject' => env('VAPID_SUBJECT'),
     *           'publicKey' => env('VAPID_PUBLIC_KEY'),
     *           'privateKey' => env('VAPID_PRIVATE_KEY'),
     *       ],
     *   ]);
     *
     *   foreach (PushSubscription::where('user_id', $userId)->get() as $sub) {
     *       $webPush->queueNotification(
     *           Subscription::create([
     *               'endpoint' => $sub->endpoint,
     *               'keys' => ['p256dh' => $sub->p256dh, 'auth' => $sub->auth],
     *           ]),
     *           json_encode(['title' => 'COMECYT', 'body' => $msg, 'url' => $url])
     *       );
     *   }
     *
     *   foreach ($webPush->flush() as $report) {
     *       if (! $report->isSuccess()) {
     *           // Endpoint expirado: eliminar
     *           PushSubscription::where('endpoint', $report->getEndpoint())->delete();
     *       }
     *   }
     *
     * Engancharlo al evento NotificacionCreada o al observer del modelo
     * NotificacionLog para que el push salga junto con el WebSocket.
     */
}
