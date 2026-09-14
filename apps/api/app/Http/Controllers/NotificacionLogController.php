<?php

namespace App\Http\Controllers;

use App\Models\NotificacionLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class NotificacionLogController extends Controller
{
    /**
     * Lista notificaciones adaptándose a la estructura real de la tabla notificaciones_log.
     * Campos reales: id, user_id, correo_destino, asunto, mensaje, tipo, solicitud_id,
     *                enviado, error_mensaje, leida_at*, descripcion*, created_at, updated_at
     */
    public function index(Request $request)
    {
        $query = NotificacionLog::with(['user', 'solicitud'])
            ->orderBy('id', 'desc');

        // Solicitantes solo ven sus notificaciones
        $user = Auth::user();
        if ($user && $user->rol_id === config('comecyt.roles.solicitante')) {
            $query->where('user_id', $user->id);
        }

        // Filtrar no leídas (si la columna existe)
        if ($request->get('no_leidas') === 'true') {
            $query->whereNull('leida_at');
        }

        // Para dropdown del bell: devolver todo sin paginar
        if ($request->get('all') === 'true') {
            return response()->json($query->limit(50)->get());
        }

        $perPage = $request->get('per_page', 20);

        return response()->json($query->paginate($perPage));
    }

    /**
     * Detalle de una notificación — solo el dueño puede verla.
     */
    public function show(Request $request, NotificacionLog $notificacion)
    {
        if ($notificacion->user_id !== $request->user()->id) {
            return response()->json(['error' => 'No autorizado'], 403);
        }

        return response()->json($notificacion->load(['user', 'solicitud']));
    }

    /**
     * Marca una notificación como leída — sólo el dueño puede hacerlo.
     */
    public function marcarLeida(Request $request, NotificacionLog $notificacion)
    {
        if ($notificacion->user_id !== $request->user()->id) {
            return response()->json(['error' => 'No autorizado'], 403);
        }

        $notificacion->update(['leida_at' => now()]);

        return response()->json(['message' => 'Notificación marcada como leída.', 'leida_at' => now()]);
    }

    /**
     * Marca todas las notificaciones del usuario como leídas.
     */
    public function marcarTodasLeidas(Request $request)
    {
        $user = $request->user();
        $count = NotificacionLog::where('user_id', $user->id)
            ->whereNull('leida_at')
            ->update(['leida_at' => now()]);

        return response()->json([
            'message' => "Se marcaron {$count} notificaciones como leídas.",
            'count' => $count,
        ]);
    }
}
