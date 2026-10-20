<?php

namespace App\Support;

use App\Http\Controllers\Club\ClubController;
use App\Models\Club;
use App\Models\ClubCambioIntegrante;
use App\Models\ClubDocumento;
use App\Models\ClubIntegrante;
use App\Models\Convocatoria;
use App\Models\EspecieConfig;
use App\Models\User;
use App\Notifications\ClubAviso;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * E92 (20/10/2026, decisiones del usuario) — Solicitud de cambio de integrante de un club ya enviado.
 *  - Ventana: desde el envío y hasta `fecha_limite_cambios` de la convocatoria (hora del centro). Sin fecha, no hay
 *    cambios. Mientras el club se puede editar (captura u observaciones en plazo) se cambia directo, no por solicitud.
 *  - El líder (o quien opera el club) elige a quién sale, escribe la justificación y captura al nuevo integrante con los
 *    mismos datos que pide la convocatoria (obligatorios incluidos), su foto si se pide y su permiso de uso de imagen
 *    firmado si la convocatoria lo pide. Los líderes A y B no se cambian aquí (se cambian en «Acompañantes del club»).
 *  - Una solicitud pendiente por club. La resuelven el admin o el admin de convocatoria (con alcance); rechazar exige
 *    motivo. Al aprobar, quien sale queda de BAJA con historial y el nuevo entra en su lugar; los formatos del club que
 *    listan integrantes (carta, A, B, C) quedan desactualizados solos (E90) para volver a firmarlos.
 */
class CambioIntegrante
{
    public const DIR = 'clubes_cambios';

    /** ¿Puede el club pedir cambios hoy? */
    public static function ventana(Club $club, EspecieConfig $cfg): array
    {
        $hasta = $cfg->fecha_limite_cambios?->format('Y-m-d');
        $motivo = match (true) {
            $club->estado === 'borrador' || $club->editable() => 'Mientras puedas editar tu club, cambia a los integrantes directamente.',
            $club->estado === 'rechazado' => 'El club no fue aceptado: ya no se pueden pedir cambios.',
            ! $hasta => 'Esta convocatoria no tiene fecha para pedir cambios de integrante.',
            Convocatoria::hoy() > $hasta => 'El plazo para pedir cambios de integrante terminó el '.self::fecha($hasta).'.',
            default => null,
        };

        return ['abierta' => $motivo === null, 'hasta' => $hasta, 'motivo' => $motivo];
    }

    /** Valida y crea la solicitud (el nuevo integrante se valida igual que al enviar el club). */
    public static function solicitar(Request $request, Club $club, User $u): ClubCambioIntegrante
    {
        $cfg = FormatosClub::config($club);
        $ventana = self::ventana($club, $cfg);
        if (! $ventana['abierta']) self::falla($ventana['motivo'], 'club');
        $request->validate([
            'integrante_sale_id' => 'required|integer',
            'justificacion' => 'required|string|min:20|max:2000',
            'foto' => 'nullable|file|max:'.(ImagenSegura::MAX_MB * 1024),
            'permiso' => 'nullable|file|max:'.(FormatosClub::MAX_MB * 1024),
        ], [
            'justificacion.min' => 'Explica el motivo del cambio con al menos 20 caracteres.',
        ], ['justificacion' => 'justificación', 'integrante_sale_id' => 'integrante que sale']);
        $sale = $club->integrantes()->whereKey((int) $request->input('integrante_sale_id'))->first();
        if (! $sale) self::falla('Elige a un integrante del club.', 'integrante_sale_id');
        if ($sale->es_lider || $sale->es_lider_b) self::falla('Los líderes A y B se cambian en «Acompañantes del club», no con esta solicitud.', 'integrante_sale_id');
        if ($club->cambiosIntegrante()->where('estado', 'pendiente')->exists()) self::falla('Ya hay una solicitud de cambio pendiente; espera su respuesta o cancélala.', 'club');

        $nuevo = ClubController::datosIntegrante($request, $club, $cfg, true);
        $persona = self::persona($nuevo);
        $pc = Especie::camposIntegrante($cfg);
        if ($pc['tutor_nombre']['pedir'] && FormatosClub::esMenor($persona) && ! $nuevo['tutor_nombre']) {
            self::falla('Falta el nombre de la madre, padre o tutor (el nuevo integrante es menor de edad).', 'tutor_nombre');
        }
        if (! empty($nuevo['curp']) && $club->integrantes()->where('curp', $nuevo['curp'])->exists()) {
            self::falla('Esa CURP ya es de un integrante del club.', 'curp');
        }
        if ($pc['foto']['obligatorio'] && ! $request->hasFile('foto')) self::falla('Sube la foto del nuevo integrante.', 'foto');
        $f = Especie::formatos($cfg);
        if ($f['uso_imagen']['pedir'] && $f['uso_imagen']['obligatorio'] && ! $request->hasFile('permiso')) {
            self::falla('Sube el permiso de uso de imagen del nuevo integrante, firmado y escaneado en PDF.', 'permiso');
        }

        // Archivos: foto → WebP sin metadatos (E74); permiso → solo PDF por contenido real. Disco privado.
        $foto = $pc['foto']['pedir'] && $request->hasFile('foto') ? ImagenSegura::guardarCuadrada($request->file('foto'), self::DIR, 400, 'foto') : null;
        [$permiso, $permisoNombre] = [null, null];
        if ($f['uso_imagen']['pedir'] && $request->hasFile('permiso')) {
            $ext = TiposArchivo::validar($request->file('permiso'), ['pdf'], FormatosClub::MAX_MB, 'permiso');
            $permiso = Str::random(40).'.'.$ext;
            Storage::disk('local')->put(self::DIR.'/'.$permiso, file_get_contents($request->file('permiso')->getPathname()));
            $permisoNombre = mb_substr(preg_replace('/[^\pL\pN ._\-()]/u', '_', (string) $request->file('permiso')->getClientOriginalName()), 0, 200);
        }

        try {
            $c = new ClubCambioIntegrante();
            $c->forceFill([
                'club_id' => $club->id, 'integrante_sale_id' => $sale->id, 'sale_nombre' => $sale->nombre,
                'justificacion' => trim(strip_tags((string) $request->input('justificacion'))), 'estado' => 'pendiente',
                'nuevo' => self::serializable($nuevo), 'foto_path' => $foto, 'permiso_archivo' => $permiso, 'permiso_nombre' => $permisoNombre,
                'solicitado_por' => $u->id,
            ])->save();
        } catch (\Illuminate\Database\QueryException $e) {
            ImagenSegura::borrar(self::DIR, $foto);
            if ($permiso) Storage::disk('local')->delete(self::DIR.'/'.$permiso);
            if (in_array($e->getCode(), ['23505', '23000'], true)) self::falla('Ya hay una solicitud de cambio pendiente; espera su respuesta o cancélala.', 'club');
            throw $e;
        }
        Audit::log('club.cambio_integrante_solicitado', $club, ['cambio_id' => $c->id, 'sale_id' => $sale->id]);
        foreach (RevisionClub::adminsDe($club) as $admin) {
            $admin->notify(new ClubAviso($club, 'cambio_solicitado', ['sale' => $sale->nombre, 'entra' => $nuevo['nombre']]));
        }

        return $c;
    }

    public static function cancelar(ClubCambioIntegrante $c, User $u): void
    {
        DB::transaction(function () use ($c) {
            $x = ClubCambioIntegrante::whereKey($c->id)->lockForUpdate()->first();
            if ($x->estado !== 'pendiente') self::falla('Esta solicitud ya no está pendiente.', 'cambio');
            $x->forceFill(['estado' => 'cancelada', 'resuelto_at' => now()])->save();
        });
        self::borrarArchivos($c->fresh());
        Audit::log('club.cambio_integrante_cancelado', $c->club, ['cambio_id' => $c->id]);
    }

    /** Aprobar (baja con historial + alta del nuevo) o rechazar con motivo. */
    public static function resolver(ClubCambioIntegrante $c, User $u, string $decision, ?string $motivo): void
    {
        $motivo = $motivo !== null ? trim(strip_tags($motivo)) : null;
        if ($decision === 'rechazar' && ! $motivo) self::falla('Escribe el motivo del rechazo (el líder lo verá).', 'motivo');
        $club = $c->club;
        DB::transaction(function () use ($c, $u, $decision, $motivo, $club) {
            $x = ClubCambioIntegrante::whereKey($c->id)->lockForUpdate()->first();
            if ($x->estado !== 'pendiente') self::falla('Esta solicitud ya no está pendiente.', 'cambio');
            if ($decision === 'rechazar') {
                $x->forceFill(['estado' => 'rechazada', 'motivo' => $motivo, 'resuelto_por' => $u->id, 'resuelto_at' => now()])->save();

                return;
            }
            $sale = ClubIntegrante::whereKey($x->integrante_sale_id)->where('club_id', $club->id)->whereNull('baja_at')->lockForUpdate()->first();
            if (! $sale) self::falla('El integrante que salía ya no está en el club; rechaza esta solicitud.', 'cambio');
            $datos = $x->nuevo;
            if (! empty($datos['curp']) && $club->integrantes()->where('curp', $datos['curp'])->whereKeyNot($sale->id)->exists()) {
                self::falla('Esa CURP ya es de otro integrante del club.', 'cambio');
            }
            $sale->forceFill(['baja_at' => now(), 'baja_motivo' => $x->justificacion])->save();
            $nuevo = new ClubIntegrante(collect($datos)->except(['curp_verificacion', 'curp_problemas', 'entidad_nacimiento', 'sexo'])->all() + ['orden' => $sale->orden]);
            $nuevo->forceFill([
                'club_id' => $club->id, 'es_lider' => false,
                'sexo' => $datos['sexo'] ?? null, 'entidad_nacimiento' => $datos['entidad_nacimiento'] ?? null,
                'curp_verificacion' => $datos['curp_verificacion'] ?? null, 'curp_problemas' => $datos['curp_problemas'] ?? null,
            ])->save();
            if ($x->foto_path && Storage::disk('local')->exists(self::DIR.'/'.$x->foto_path)) {
                Storage::disk('local')->move(self::DIR.'/'.$x->foto_path, Especie::DIR_MEDIA.'/'.$x->foto_path);
                $nuevo->forceFill(['foto_path' => $x->foto_path])->save();
            }
            if ($x->permiso_archivo && Storage::disk('local')->exists(self::DIR.'/'.$x->permiso_archivo)) {
                // Lo revisó quien aprueba el cambio: entra aprobado.
                Storage::disk('local')->move(self::DIR.'/'.$x->permiso_archivo, Especie::DIR_DOCS.'/'.$club->id.'/'.$x->permiso_archivo);
                $d = new ClubDocumento();
                $d->forceFill([
                    'club_id' => $club->id, 'clave' => FormatosClub::claveImagen($nuevo), 'integrante_id' => $nuevo->id,
                    'nombre_original' => $x->permiso_nombre ?: 'permiso.pdf', 'archivo' => $x->permiso_archivo, 'subido_por' => $x->solicitado_por,
                    'estado' => 'aprobado', 'motivo' => null, 'revisado_por' => $u->id, 'revisado_at' => now(),
                ])->save();
            }
            $x->forceFill(['estado' => 'aprobada', 'integrante_nuevo_id' => $nuevo->id, 'resuelto_por' => $u->id, 'resuelto_at' => now(), 'foto_path' => null, 'permiso_archivo' => null])->save();
        });
        if ($decision === 'rechazar') self::borrarArchivos($c->fresh());
        Audit::log('club.cambio_integrante_'.($decision === 'aprobar' ? 'aprobado' : 'rechazado'), $club, ['cambio_id' => $c->id]);
        RevisionClub::avisarLider($club, $decision === 'aprobar' ? 'cambio_aprobado' : 'cambio_rechazado',
            ['sale' => $c->sale_nombre, 'entra' => $c->nuevo['nombre'] ?? '', 'motivo' => $motivo]);
    }

    /** Lista blanca para el panel: solicitudes y bajas (historial). El personal ve quién resolvió. */
    public static function payload(Club $club, EspecieConfig $cfg, bool $personal): array
    {
        $cambios = $club->cambiosIntegrante()->with('resolvio:id,name')->limit(50)->get();

        return [
            'ventana' => self::ventana($club, $cfg),
            'solicitudes' => $cambios->map(fn (ClubCambioIntegrante $c) => [
                'id' => $c->id, 'estado' => $c->estado, 'sale' => $c->sale_nombre, 'integrante_sale_id' => $c->integrante_sale_id,
                'entra' => self::vistaNuevo($c->nuevo ?? []), 'justificacion' => $c->justificacion, 'motivo' => $c->motivo,
                'tiene_foto' => (bool) $c->foto_path, 'tiene_permiso' => (bool) $c->permiso_archivo,
                'fecha' => $c->created_at, 'resuelto_at' => $c->resuelto_at,
            ] + ($personal ? ['resolvio' => $c->resolvio?->name] : []))->values(),
            'bajas' => $club->integrantesBaja()->get()->map(fn (ClubIntegrante $i) => [
                'id' => $i->id, 'nombre' => $i->nombre, 'baja_at' => $i->baja_at, 'motivo' => $i->baja_motivo,
            ])->values(),
        ];
    }

    /** Integrante en memoria con los datos capturados (para el permiso prellenado y para saber si es menor). */
    public static function persona(array $datos): ClubIntegrante
    {
        $p = new ClubIntegrante(collect($datos)->only(array_merge(['nombre', 'nombres', 'primer_apellido', 'segundo_apellido'], Especie::COLUMNAS_INTEGRANTE))->all());
        $p->forceFill(['es_lider' => false, 'es_lider_b' => false]);

        return $p;
    }

    public static function borrarArchivos(ClubCambioIntegrante $c): void
    {
        ImagenSegura::borrar(self::DIR, $c->foto_path);
        if ($c->permiso_archivo && preg_match('/^[A-Za-z0-9]{40}\.pdf$/', $c->permiso_archivo)) Storage::disk('local')->delete(self::DIR.'/'.$c->permiso_archivo);
        $c->forceFill(['foto_path' => null, 'permiso_archivo' => null])->save();
    }

    /** Datos del nuevo integrante para mostrar (sin la CURP completa: solo sus 4 primeras letras). */
    private static function vistaNuevo(array $n): array
    {
        return collect($n)->only(['nombre', 'fecha_nacimiento', 'grado', 'grupo', 'grado_grupo', 'tutor_nombre', 'domicilio', 'correo', 'telefono', 'curp_verificacion'])
            ->filter(fn ($v) => $v !== null && $v !== '')->all() + (! empty($n['curp']) ? ['curp' => substr($n['curp'], 0, 4).'…'] : []);
    }

    private static function serializable(array $datos): array
    {
        return collect($datos)->map(fn ($v) => $v instanceof \DateTimeInterface ? $v->format('Y-m-d') : $v)->all();
    }

    private static function fecha(string $ymd): string
    {
        return \Carbon\Carbon::parse($ymd)->format('d/m/Y');
    }

    private static function falla(string $mensaje, string $campo): never
    {
        throw ValidationException::withMessages([$campo => $mensaje]);
    }
}
