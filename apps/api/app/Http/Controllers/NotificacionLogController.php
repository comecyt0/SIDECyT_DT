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
        // Solo lo necesario de las relaciones (antes el usuario completo de cada notificación).
        $query = NotificacionLog::with(['user:id,name,email', 'solicitud:id,folio,titulo_proyecto,estado'])
            ->orderBy('id', 'desc');

        // SEGURIDAD (24/09/2026): el historial completo solo por la ruta del admin (/admin/notificaciones, que ya
        // exige el middleware `admin`). En /mis-notificaciones cada quien ve SOLO las suyas. Antes el filtro se
        // aplicaba únicamente al solicitante: revisores y evaluadores recibían las de todos (incluidas las del admin).
        $user = Auth::user();
        $vistaAdmin = $request->is('api/admin/*') && $user && (int) $user->rol_id === (int) config('comecyt.roles.admin');
        if (! $vistaAdmin) {
            $query->where('user_id', $user?->id ?? 0);
        }

        // Filtrar no leídas (si la columna existe)
        if ($request->get('no_leidas') === 'true') {
            $query->whereNull('leida_at');
        }

        // Para dropdown del bell: devolver todo sin paginar
        if ($request->get('all') === 'true') {
            return response()->json($query->limit(50)->get());
        }

        // Límite de página: antes `per_page=100000` devolvía la tabla entera de una vez.
        $perPage = max(1, min(100, (int) $request->get('per_page', 20)));

        return response()->json($query->paginate($perPage));
    }

    /**
     * Detalle de una notificación — el dueño, o el admin desde su historial.
     */
    public function show(Request $request, NotificacionLog $notificacion)
    {
        $esAdmin = $request->is('api/admin/*') && (int) $request->user()->rol_id === (int) config('comecyt.roles.admin');
        if (! $esAdmin && $notificacion->user_id !== $request->user()->id) {
            return response()->json(['error' => 'No autorizado'], 403);
        }

        return response()->json($notificacion->load(['user:id,name,email', 'solicitud:id,folio,titulo_proyecto,estado']));
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
