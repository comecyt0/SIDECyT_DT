<?php

namespace App\Http\Controllers;

use App\Models\AsignacionEvaluador;
use App\Models\Solicitud;
use App\Models\User;
use App\Support\Alcance;
use App\Support\Audit;
use App\Support\Enmascarar;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * E45 (punto 3) — Perfil con foto y portada para todos los roles, y ficha completa de un usuario según alcance.
 *
 * Fotos: JPG/PNG/WebP de hasta 5 MB (decisión del usuario), se RE-CODIFICAN a WebP en el servidor: ahorra espacio y
 * elimina metadatos (EXIF con GPS) y cualquier contenido extra que viniera pegado al archivo. Se guardan en el disco
 * privado con nombre aleatorio y se sirven solo con sesión (`GET /api/media/perfil/{archivo}`).
 */
class PerfilController extends Controller
{
    private const DIR = 'perfiles';

    private const MAX_MB = 5;

    /** Tope de píxeles ANTES de decodificar (bomba de descompresión: 5 MB pueden ser 20 000 × 20 000 px). */
    private const MAX_PIXELES = 40_000_000;

    private const MEDIDAS = [
        'avatar' => ['ancho' => 512, 'alto' => 512, 'min' => 100],
        'banner' => ['ancho' => 1600, 'alto' => 480, 'min' => 400],
    ];

    public function show(Request $request)
    {
        $u = $request->user()->load(['rol:id,nombre,slug', 'empresa:id,nombre,acronimo', 'convocatoriasAsignadas:id,nombre', 'periodos:id,nombre']);

        return response()->json(['user' => $u, 'resumen' => $this->resumen($u)]);
    }

    public function update(Request $request)
    {
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'min:3', 'max:255'],
            'telefono' => ['sometimes', 'nullable', 'string', 'max:20', 'regex:/^[0-9+()\s-]*$/'],
            'cargo' => ['sometimes', 'nullable', 'string', 'max:255'],
        ]);
        foreach (['name', 'cargo'] as $k) {
            if (isset($data[$k])) {
                $data[$k] = trim(strip_tags($data[$k]));
            }
        }
        $user = $request->user();
        $user->update($data);
        Audit::log('user.perfil_actualizado', $user, ['campos' => array_keys($data)]);

        return $this->show($request);
    }

    public function subirAvatar(Request $request)
    {
        return $this->subir($request, 'avatar');
    }

    public function subirBanner(Request $request)
    {
        return $this->subir($request, 'banner');
    }

    public function quitarAvatar(Request $request)
    {
        return $this->quitar($request, 'avatar');
    }

    public function quitarBanner(Request $request)
    {
        return $this->quitar($request, 'banner');
    }

    private function subir(Request $request, string $tipo)
    {
        $request->validate(['imagen' => ['required', 'file', 'max:'.(self::MAX_MB * 1024)]]);
        $file = $request->file('imagen');
        $ruta = $file->getPathname(); // no getRealPath(): falla en este IIS (E28)
        $falla = fn (string $m) => throw ValidationException::withMessages(['imagen' => $m]);

        $mime = (string) (new \finfo(FILEINFO_MIME_TYPE))->file($ruta);
        if (! in_array($mime, ['image/jpeg', 'image/png', 'image/webp'], true)) {
            $falla('La imagen debe ser JPG, PNG o WebP.');
        }
        $info = @getimagesize($ruta);
        if (! $info) {
            $falla('No se pudo leer la imagen.');
        }
        [$w, $h] = $info;
        $m = self::MEDIDAS[$tipo];
        if ($w * $h > self::MAX_PIXELES) {
            $falla('La imagen es demasiado grande en píxeles.');
        }
        if ($w < $m['min'] || $h < ($tipo === 'banner' ? 120 : $m['min'])) {
            $falla($tipo === 'avatar' ? 'La foto debe medir al menos 100 × 100 px.' : 'La portada debe medir al menos 400 × 120 px.');
        }

        $origen = @imagecreatefromstring((string) file_get_contents($ruta));
        if (! $origen) {
            $falla('No se pudo procesar la imagen.');
        }
        // Recorte centrado a la proporción destino ("cover") y re-codificación a WebP.
        $destinoW = $m['ancho'];
        $destinoH = $m['alto'];
        $escala = max($destinoW / $w, $destinoH / $h);
        $cropW = (int) round($destinoW / $escala);
        $cropH = (int) round($destinoH / $escala);
        $x = (int) max(0, ($w - $cropW) / 2);
        $y = (int) max(0, ($h - $cropH) / 2);
        $lienzo = imagecreatetruecolor($destinoW, $destinoH);
        imagealphablending($lienzo, false);
        imagesavealpha($lienzo, true);
        imagecopyresampled($lienzo, $origen, 0, 0, $x, $y, $destinoW, $destinoH, $cropW, $cropH);
        ob_start();
        imagewebp($lienzo, null, 82);
        $webp = (string) ob_get_clean();
        imagedestroy($origen);
        imagedestroy($lienzo);
        if ($webp === '') {
            $falla('No se pudo convertir la imagen.');
        }

        $nombre = Str::random(40).'.webp';
        Storage::disk('local')->put(self::DIR.'/'.$nombre, $webp);

        $user = $request->user();
        $campo = $tipo.'_path';
        $anterior = $user->{$campo};
        $user->forceFill([$campo => $nombre])->save();
        if ($anterior && preg_match('/^[A-Za-z0-9]{40}\.webp$/', $anterior)) {
            Storage::disk('local')->delete(self::DIR.'/'.$anterior);
        }
        Audit::log("user.{$tipo}_actualizado", $user, ['kb' => (int) round(strlen($webp) / 1024)]);

        return response()->json([
            'message' => $tipo === 'avatar' ? 'Foto de perfil actualizada.' : 'Portada actualizada.',
            'avatar_url' => $user->avatar_url,
            'banner_url' => $user->banner_url,
        ]);
    }

    private function quitar(Request $request, string $tipo)
    {
        $user = $request->user();
        $campo = $tipo.'_path';
        if ($user->{$campo} && preg_match('/^[A-Za-z0-9]{40}\.webp$/', $user->{$campo})) {
            Storage::disk('local')->delete(self::DIR.'/'.$user->{$campo});
        }
        $user->forceFill([$campo => null])->save();

        return response()->json(['message' => 'Imagen quitada.', 'avatar_url' => $user->avatar_url, 'banner_url' => $user->banner_url]);
    }

    /**
     * GET /api/media/perfil/{archivo} — con sesión. El nombre es aleatorio (40 caracteres) y la ruta solo acepta ese
     * formato. Las fotos son identificadores dentro del sistema: cualquier usuario con sesión puede verlas (lista,
     * chat, seguimiento); los DATOS completos del usuario van aparte, en `ficha`, con alcance.
     */
    public function media(string $archivo)
    {
        $ruta = self::DIR.'/'.$archivo;
        if (! preg_match('/^[A-Za-z0-9]{40}\.webp$/', $archivo) || ! Storage::disk('local')->exists($ruta)) {
            return response()->json(['error' => 'No encontrado'], 404);
        }

        return response()->file(Storage::disk('local')->path($ruta), [
            'Content-Type' => 'image/webp',
            // El nombre cambia en cada subida: se puede cachear en el navegador del usuario (privado).
            'Cache-Control' => 'private, max-age=86400, immutable',
        ]);
    }

    /**
     * GET /api/perfiles/{user} — ficha completa (foto, portada, datos, solicitudes, seguimiento) según alcance:
     *  - admin: cualquiera. Uno mismo: siempre.
     *  - admin de convocatoria, revisor y consulta: solicitantes con alguna solicitud dentro de su alcance.
     *  - evaluador: solicitantes de solicitudes que tiene ASIGNADAS (más estricto que el periodo).
     *  - solicitante: solo la suya.
     * Fuera de alcance → 404. Datos bancarios completos solo admin y admin de convocatoria.
     */
    public function ficha(Request $request, User $user)
    {
        $yo = $request->user();
        $solicitudes = Solicitud::where('user_id', $user->id)->with(['convocatoria:id,nombre,periodo_id', 'convocatoria.periodo:id,nombre', 'ministracion', 'historial.user:id,name,avatar_path'])
            ->orderByDesc('created_at');

        if (! $yo->tieneRol('admin') && (int) $yo->id !== (int) $user->id) {
            if ($yo->tieneRol('solicitante') || ! $user->tieneRol('solicitante')) {
                abort(404, 'Registro no encontrado');
            }
            if ($yo->tieneRol('evaluador')) {
                $asignadas = AsignacionEvaluador::where('evaluador_id', $yo->id)->pluck('solicitud_id');
                $solicitudes->whereIn('id', $asignadas);
            }
            Alcance::aplicar($solicitudes, $yo);
        }

        $lista = $solicitudes->get();
        if (! $yo->tieneRol('admin') && (int) $yo->id !== (int) $user->id && $lista->isEmpty()) {
            abort(404, 'Registro no encontrado');
        }

        $veBanco = Enmascarar::veBancarios($yo) || (int) $yo->id === (int) $user->id;
        $user->load(['rol:id,nombre,slug', 'empresa']);

        return response()->json([
            'user' => $user->only(['id', 'name', 'email', 'telefono', 'cargo', 'activo', 'created_at', 'ultimo_acceso', 'avatar_url', 'banner_url'])
                + ['rol' => $user->rol, 'empresa' => $user->empresa],
            'solicitudes' => $lista->map(function ($s) use ($veBanco) {
                $a = $s->toArray();
                if (! $veBanco) {
                    $a['ministracion'] = Enmascarar::ministracion($a['ministracion'] ?? null);
                }

                return $a;
            })->values(),
            'resumen' => $this->resumen($user),
        ]);
    }

    /** Indicadores para la cabecera del perfil (como en la referencia: cifras grandes bajo el nombre). */
    private function resumen(User $u): array
    {
        if ($u->tieneRol('solicitante')) {
            $s = Solicitud::where('user_id', $u->id);

            return [
                ['label' => 'Solicitudes', 'value' => (clone $s)->count()],
                ['label' => 'Aprobadas', 'value' => (clone $s)->whereIn('estado', Solicitud::ESTADOS_APROBADOS)->count()],
                ['label' => 'En proceso', 'value' => (clone $s)->whereNotIn('estado', array_merge(Solicitud::ESTADOS_APROBADOS, Solicitud::ESTADOS_NO_APROBADOS, ['borrador']))->count()],
            ];
        }
        if ($u->tieneRol('evaluador')) {
            return [
                ['label' => 'Asignadas', 'value' => AsignacionEvaluador::where('evaluador_id', $u->id)->count()],
                ['label' => 'Concluidas', 'value' => AsignacionEvaluador::where('evaluador_id', $u->id)->where('estado', 'concluido')->count()],
            ];
        }
        $ids = Alcance::convocatoriaIds($u);

        return [
            ['label' => 'Convocatorias', 'value' => $ids === null ? \App\Models\Convocatoria::whereNull('deleted_at')->count() : count($ids)],
            ['label' => 'Solicitudes', 'value' => Alcance::aplicar(Solicitud::query(), $u)->where('estado', '!=', 'borrador')->count()],
        ];
    }
}
