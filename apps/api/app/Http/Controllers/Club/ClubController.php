<?php

namespace App\Http\Controllers\Club;

use App\Http\Controllers\Admin\EspecieConfigController;
use App\Http\Controllers\Controller;
use App\Models\Club;
use App\Models\ClubDocumento;
use App\Models\ClubIntegrante;
use App\Models\Convocatoria;
use App\Models\Escuela;
use App\Models\EspecieCampo;
use App\Models\EspecieConfig;
use App\Models\ProgramaDocumento;
use App\Models\User;
use App\Support\Audit;
use App\Support\Especie;
use App\Support\ImagenSegura;
use App\Support\RevisionClub;
use App\Support\TiposArchivo;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * E52 · F1 — Panel del líder de club (rol lider_club). Registro del club en una convocatoria de Apoyo en especie,
 * integrantes (el líder es el primero y cuenta para el mínimo/máximo), fotos, documentos, carta de la escuela generada y
 * envío a revisión. El club solo se edita en `borrador` (decisión del usuario; la subsanación llega en F2).
 * Seguridad: cada acción comprueba que el club es del líder (404 si no: no confirma que exista), archivos por contenido,
 * disco privado, nombres aleatorios y bitácora.
 */
class ClubController extends Controller
{
    /** Convocatorias de Apoyo en especie abiertas + las del líder (con su club). */
    public function convocatorias(Request $request)
    {
        $user = $request->user();
        // E61: el acompañante ve solo las convocatorias de los clubes que le compartieron (no registra clubes).
        $acompanante = $user->tieneRol('acompanante_club');
        $mios = ($acompanante
            ? Club::whereHas('accesos', fn ($q) => $q->where('user_id', $user->id))->with('accesos')
            : Club::where('lider_id', $user->id))->get()->keyBy('convocatoria_id');
        $convs = Convocatoria::with('tipoPrograma:id,tipo_apoyo,nombre')
            ->whereNull('deleted_at')
            ->whereHas('tipoPrograma', fn ($q) => $q->where('tipo_apoyo', Especie::TIPO_APOYO))
            ->where(fn ($q) => $acompanante ? $q->whereIn('id', $mios->keys()->all()) : $q->aceptandoSolicitudes()->orWhereIn('id', $mios->keys()->all()))
            ->orderByDesc('fecha_apertura')->limit(50)->get();

        return response()->json($convs->map(function (Convocatoria $c) use ($mios, $user, $acompanante) {
            $club = $mios->get($c->id);

            return [
                'id' => $c->id,
                'nombre' => $c->nombre,
                'nombre_corto' => $c->nombre_corto,
                'descripcion' => $c->descripcion ? mb_substr(strip_tags($c->descripcion), 0, 400) : null,
                'estado_publico' => $c->estado_publico,
                'acepta' => ! $acompanante && $c->aceptaSolicitudes(),
                'fecha_limite' => $c->fecha_cierre_efectiva ? substr((string) $c->fecha_cierre_efectiva, 0, 10) : null,
                'kit' => $c->especieConfig?->kit_nombre,
                'club' => $club ? ['id' => $club->id, 'folio' => $club->folio, 'convocatoria_corto' => $c->nombre_corto, 'nombre' => $club->nombre, 'estado' => $club->estadoVisible(), 'vence_at' => $club->vence_at,
                    'acceso' => $club->accesoDe($user)] : null,
            ];
        })->values());
    }

    /** Búsqueda en el catálogo de escuelas activas (mínimo 3 caracteres, máximo 20 resultados). */
    public function escuelas(Request $request)
    {
        $request->validate(['q' => 'required|string|min:3|max:120']);
        $t = trim((string) $request->input('q'));

        return response()->json(Escuela::where('activo', true)
            ->where(fn ($w) => $w->where('nombre', 'ilike', "%{$t}%")->orWhere('cct', 'ilike', "%{$t}%")->orWhere('municipio', 'ilike', "%{$t}%"))
            ->orderBy('nombre')->limit(20)->get(['id', 'cct', 'nombre', 'municipio', 'nivel', 'sistema', 'participo_antes']));
    }

    public function store(Request $request)
    {
        $user = $request->user();
        // E61: solo el líder registra clubes; el acompañante entra a los clubes que le compartieron.
        abort_unless($user->tieneRol('lider_club'), 403, 'Solo un líder de club puede registrar clubes.');
        $v = $request->validate([
            'convocatoria_id' => 'required|integer',
            // E55: escuela del catálogo, o la solicitud propia de una escuela que está en revisión.
            'escuela_id' => 'nullable|integer|required_without:escuela_solicitud_id',
            'escuela_solicitud_id' => 'nullable|integer',
            'nombre' => 'required|string|min:3|max:255',
        ], ['escuela_id.required_without' => 'Elige tu escuela del catálogo o solicita su registro.']);
        $conv = Convocatoria::with('tipoPrograma')->whereNull('deleted_at')->find($v['convocatoria_id']);
        if (! Especie::esEspecie($conv) || ! $conv->aceptaSolicitudes()) {
            return response()->json(['message' => 'Esa convocatoria no está recibiendo registros de clubes.'], 422);
        }
        if (Club::where('convocatoria_id', $conv->id)->where('lider_id', $user->id)->exists()) {
            return response()->json(['message' => 'Ya registraste un club en esta convocatoria (uno por líder).'], 422);
        }
        [$escuelaId, $solicitudId] = $this->escuelaElegida($v, $user->id, $conv->id);
        if ($escuelaId) $this->exigirCupoEscuela($conv, $escuelaId, null);

        $club = DB::transaction(function () use ($user, $conv, $escuelaId, $solicitudId, $v) {
            $club = new Club(['nombre' => trim(strip_tags($v['nombre'])), 'escuela_id' => $escuelaId, 'datos' => []]);
            for ($i = 0; $i < 5; $i++) {
                try {
                    $club->forceFill(['folio' => Especie::nuevoFolio($conv), 'estado' => 'borrador', 'lider_id' => $user->id, 'convocatoria_id' => $conv->id, 'escuela_solicitud_id' => $solicitudId])->save();
                    break;
                } catch (\Illuminate\Database\QueryException $e) {
                    if ($i === 4 || ! in_array($e->getCode(), ['23505', '23000'], true)) throw $e;
                }
            }
            if ($user->es_director) {
                // 08/10/2026: lo registra el director («Soy director»): no es integrante; da de alta al líder A y al B.
                $club->forceFill(['dueno_director' => true])->save();
            } else {
                // El líder es el primer integrante (cuenta para el mínimo y el máximo; decisión del usuario).
                $lider = new ClubIntegrante(['nombre' => $user->name, 'correo' => $user->email, 'telefono' => $user->telefono, 'curp' => $user->curp, 'orden' => 0]);
                $lider->forceFill(['club_id' => $club->id, 'es_lider' => true])->save();
            }

            return $club;
        });
        Audit::log('club.creado', $club, ['convocatoria_id' => $conv->id]);

        return response()->json($this->detalle($club->fresh()), 201);
    }

    public function show(Request $request, Club $club)
    {
        $this->propio($request, $club);

        return response()->json($this->detalle($club));
    }

    public function update(Request $request, Club $club)
    {
        $this->editable($request, $club);
        $v = $request->validate([
            'nombre' => 'sometimes|required|string|min:3|max:255',
            'escuela_id' => 'sometimes|nullable|integer',
            'escuela_solicitud_id' => 'sometimes|nullable|integer',
            'datos' => 'sometimes|nullable|array',
        ]);
        $cfg = $this->config($club);
        // E55: cambiar a otra escuela del catálogo o a una solicitud propia en revisión.
        if (! empty($v['escuela_solicitud_id']) || (! empty($v['escuela_id']) && (int) $v['escuela_id'] !== (int) $club->escuela_id)) {
            // E61: las solicitudes de escuela son del líder (también cuando edita el director como colíder).
            [$escuelaId, $solicitudId] = $this->escuelaElegida($v, (int) $club->lider_id, (int) $club->convocatoria_id);
            if ($escuelaId) $this->exigirCupoEscuela($club->convocatoria, $escuelaId, $club->id);
            $club->escuela_id = $escuelaId;
            $club->forceFill(['escuela_solicitud_id' => $solicitudId]);
        }
        if (isset($v['nombre'])) $club->nombre = trim(strip_tags($v['nombre']));
        if (array_key_exists('datos', $v)) {
            $datos = [];
            $pc = Especie::camposClub($cfg);
            if ($pc['descripcion']['pedir'] && isset($v['datos']['descripcion'])) {
                $datos['descripcion'] = mb_substr(strip_tags((string) $v['datos']['descripcion']), 0, 2000);
            }
            $datos += Especie::validarPersonalizados($this->campos($club, 'club'), $v['datos'] ?? [], false);
            $club->datos = $datos;
        }
        $club->save();

        return response()->json($this->detalle($club->fresh()));
    }

    public function subirLogo(Request $request, Club $club)
    {
        $this->editable($request, $club);
        $request->validate(['imagen' => 'required|file|max:'.(ImagenSegura::MAX_MB * 1024)]);
        $nombre = ImagenSegura::guardarCuadrada($request->file('imagen'), Especie::DIR_MEDIA, 512);
        $anterior = $club->logo_path;
        $club->forceFill(['logo_path' => $nombre])->save();
        ImagenSegura::borrar(Especie::DIR_MEDIA, $anterior);

        return response()->json(['logo_url' => $club->logo_url]);
    }

    public function quitarLogo(Request $request, Club $club)
    {
        $this->editable($request, $club);
        ImagenSegura::borrar(Especie::DIR_MEDIA, $club->logo_path);
        $club->forceFill(['logo_path' => null])->save();

        return response()->json(['logo_url' => null]);
    }

    // ─────────── Integrantes ───────────

    public function agregarIntegrante(Request $request, Club $club)
    {
        $this->editable($request, $club);
        $cfg = $this->config($club);
        if ($club->integrantes()->count() >= $cfg->max_integrantes) {
            return response()->json(['message' => "El club ya tiene el máximo de {$cfg->max_integrantes} integrantes (incluidos el líder y el líder B)."], 422);
        }
        $datos = $this->datosIntegrante($request, $club, $cfg);
        $i = new ClubIntegrante($datos + ['orden' => (int) $club->integrantes()->max('orden') + 1]);
        $i->forceFill(['club_id' => $club->id, 'es_lider' => false])->save();

        return response()->json($i->fresh(), 201);
    }

    public function actualizarIntegrante(Request $request, Club $club, ClubIntegrante $integrante)
    {
        $this->editable($request, $club);
        abort_unless((int) $integrante->club_id === (int) $club->id, 404);
        $integrante->fill($this->datosIntegrante($request, $club, $this->config($club)))->save();

        return response()->json($integrante->fresh());
    }

    public function quitarIntegrante(Request $request, Club $club, ClubIntegrante $integrante)
    {
        $this->editable($request, $club);
        abort_unless((int) $integrante->club_id === (int) $club->id, 404);
        if ($integrante->es_lider) {
            return response()->json(['message' => 'El líder del club no se puede quitar.'], 422);
        }
        if ($integrante->es_lider_b) {
            return response()->json(['message' => 'El líder B se quita desde «Acompañantes del club» (Quitar acceso).'], 422);
        }
        ImagenSegura::borrar(Especie::DIR_MEDIA, $integrante->foto_path);
        $integrante->delete();

        return response()->json(['message' => 'Integrante quitado.']);
    }

    public function subirFoto(Request $request, Club $club, ClubIntegrante $integrante)
    {
        $this->editable($request, $club);
        abort_unless((int) $integrante->club_id === (int) $club->id, 404);
        $request->validate(['imagen' => 'required|file|max:'.(ImagenSegura::MAX_MB * 1024)]);
        $nombre = ImagenSegura::guardarCuadrada($request->file('imagen'), Especie::DIR_MEDIA, 400);
        $anterior = $integrante->foto_path;
        $integrante->forceFill(['foto_path' => $nombre])->save();
        ImagenSegura::borrar(Especie::DIR_MEDIA, $anterior);

        return response()->json(['foto_url' => $integrante->foto_url]);
    }

    public function quitarFoto(Request $request, Club $club, ClubIntegrante $integrante)
    {
        $this->editable($request, $club);
        abort_unless((int) $integrante->club_id === (int) $club->id, 404);
        ImagenSegura::borrar(Especie::DIR_MEDIA, $integrante->foto_path);
        $integrante->forceFill(['foto_path' => null])->save();

        return response()->json(['foto_url' => null]);
    }

    private function datosIntegrante(Request $request, Club $club, EspecieConfig $cfg): array
    {
        if ($request->filled('curp')) $request->merge(['curp' => mb_strtoupper(trim((string) $request->input('curp')))]);
        $v = $request->validate(Especie::reglasIntegrante($cfg), \App\Support\RegistroRoles::mensajes());
        $pc = Especie::camposIntegrante($cfg);
        $out = ['nombre' => trim(strip_tags($v['nombre']))];
        foreach (['fecha_nacimiento', 'sexo', 'curp', 'grado_grupo', 'correo', 'telefono'] as $k) {
            $out[$k] = $pc[$k]['pedir'] ? ($v[$k] ?? null) : null;
        }
        if ($out['grado_grupo']) $out['grado_grupo'] = trim(strip_tags($out['grado_grupo']));
        if (! $cfg->participan_menores && $out['fecha_nacimiento'] && \Carbon\Carbon::parse($out['fecha_nacimiento'])->age < 18) {
            throw ValidationException::withMessages(['fecha_nacimiento' => 'En esta convocatoria no participan menores de edad.']);
        }
        $out['datos'] = Especie::validarPersonalizados($this->campos($club, 'integrante'), $v['datos'] ?? [], false);

        return $out;
    }

    // ─────────── Documentos ───────────

    public function subirDocumento(Request $request, Club $club)
    {
        $this->editable($request, $club);
        $request->validate(['clave' => ['required', 'string', 'max:100', 'regex:/^[a-z0-9_]+$/'], 'archivo' => 'required|file|max:'.(TiposArchivo::TAMANO_MAX_MB * 1024)]);
        $clave = (string) $request->input('clave');
        [$formatos, $maxMb, $nombreDoc] = $this->limitesDocumento($club, $clave);
        $ext = TiposArchivo::validar($request->file('archivo'), $formatos, $maxMb, 'archivo');
        // E74: imágenes → WebP sin metadatos; el resto tal cual.
        [$ext, $contenido] = TiposArchivo::contenidoSeguro($request->file('archivo'), $ext, 'archivo');
        $interno = Str::random(40).'.'.$ext;
        Storage::disk('local')->put(Especie::DIR_DOCS.'/'.$club->id.'/'.$interno, $contenido);

        $previo = ClubDocumento::where('club_id', $club->id)->where('clave', $clave)->first();
        $doc = $previo ?? new ClubDocumento();
        $anterior = $previo?->archivo;
        $doc->forceFill([
            'club_id' => $club->id, 'clave' => $clave,
            'nombre_original' => mb_substr(preg_replace('/[^\pL\pN ._\-()]/u', '_', (string) $request->file('archivo')->getClientOriginalName()), 0, 200),
            'archivo' => $interno, 'subido_por' => $request->user()->id,
        ])->save();
        if ($anterior) Storage::disk('local')->delete(Especie::DIR_DOCS.'/'.$club->id.'/'.$anterior);
        Audit::log('club.documento_subido', $club, ['clave' => $clave]);

        return response()->json(['clave' => $clave, 'nombre' => $nombreDoc, 'nombre_original' => $doc->nombre_original, 'subido_at' => $doc->updated_at], 201);
    }

    public function quitarDocumento(Request $request, Club $club, string $clave)
    {
        $this->editable($request, $club);
        $doc = ClubDocumento::where('club_id', $club->id)->where('clave', $clave)->firstOrFail();
        Storage::disk('local')->delete(Especie::DIR_DOCS.'/'.$club->id.'/'.$doc->archivo);
        $doc->delete();

        return response()->json(['message' => 'Documento quitado.']);
    }

    /** Límites del documento: la carta de la escuela (PDF o imagen, 10 MB) o uno de los documentos del programa. */
    private function limitesDocumento(Club $club, string $clave): array
    {
        if ($clave === Especie::CARTA_ESCUELA) {
            // Pedido del usuario (02/10/2026): carta firmada y sellada, escaneada, solo en PDF.
            return [['pdf'], 10, 'Carta de consentimiento de la escuela'];
        }
        $d = ProgramaDocumento::where('tipo_programa_id', $club->convocatoria->tipo_programa_id)->where('activo', true)->where('clave', $clave)->first();
        if (! $d) {
            throw ValidationException::withMessages(['clave' => 'Ese documento no se pide en esta convocatoria.']);
        }

        return [TiposArchivo::normalizar($d->formato_permitido), TiposArchivo::limiteMb((int) $d->{'tamaño_maximo_mb'}), $d->nombre];
    }

    /** Carta de consentimiento de la escuela generada (PDF): datos del club, escuela e integrantes, para firma y sello. */
    public function cartaEscuela(Request $request, Club $club)
    {
        $this->propio($request, $club);
        if (! $club->escuela_id) {
            return response()->json(['message' => 'Tu escuela está en revisión: la carta se genera cuando el COMECYT la dé de alta.'], 422);
        }
        $club->loadMissing(['escuela', 'lider:id,name', 'integrantes', 'convocatoria:id,nombre']);
        $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('pdfs.carta_escuela_club', ['club' => $club, 'fecha' => now('America/Mexico_City')]);

        return $pdf->download('carta-escuela-'.$club->folio.'.pdf');
    }

    // ─────────── Enviar a revisión ───────────

    /**
     * Enviar a revisión (primer envío, con aviso de privacidad aceptado) o enviar las correcciones de una observación
     * (dentro del plazo). Las correcciones no dependen de que la convocatoria siga abierta: el plazo lo da la etapa.
     */
    public function enviar(Request $request, Club $club)
    {
        $this->editable($request, $club);
        $club->loadMissing(['convocatoria.tipoPrograma', 'integrantes', 'documentos']);
        $primerEnvio = $club->estado === 'borrador';
        if ($primerEnvio) {
            // E52 · F2 (decisión del usuario): aviso de privacidad aceptado al enviar; queda la fecha en el club.
            $request->validate(['acepto_privacidad' => 'accepted'], ['acepto_privacidad.accepted' => 'Confirma que leíste el aviso de privacidad y tienes el consentimiento para los datos y fotos de los integrantes.']);
            if (! $club->convocatoria->aceptaSolicitudes()) {
                return response()->json(['message' => 'La convocatoria ya no recibe registros.'], 422);
            }
        }
        $faltantes = $this->faltantes($club);
        if ($faltantes) {
            return response()->json(['message' => 'Tu club aún no está completo.', 'faltantes' => $faltantes], 422);
        }
        $this->exigirCupoEscuela($club->convocatoria, $club->escuela_id, $club->id);
        if ($primerEnvio) {
            RevisionClub::enviar($club, $request->user());
            Audit::log('club.enviado', $club, ['folio' => $club->folio]);
        } else {
            RevisionClub::subsanar($club, $request->user());
            Audit::log('club.subsanado', $club, ['folio' => $club->folio]);
        }

        return response()->json($this->detalle($club->fresh()));
    }

    /** Lista legible de lo que falta para poder enviar (se muestra tal cual al líder). */
    public function faltantes(Club $club): array
    {
        $cfg = $this->config($club);
        $f = [];
        // E55: sin escuela del catálogo no se envía.
        if (! $club->escuela_id) {
            $s = $club->escuelaSolicitud;
            $f[] = $s?->estado === 'rechazada'
                ? 'La solicitud de tu escuela no fue aceptada. Corrígela y envíala de nuevo, o elige una escuela del catálogo.'
                : 'Tu escuela está en revisión: podrás enviar tu club cuando el COMECYT la dé de alta.';
        }
        $pc = Especie::camposClub($cfg);
        if ($pc['logo']['obligatorio'] && ! $club->logo_path) $f[] = 'Sube el logo o foto del club.';
        if ($pc['descripcion']['obligatorio'] && empty($club->datos['descripcion'])) $f[] = 'Escribe la descripción del proyecto del club.';
        try {
            Especie::validarPersonalizados($this->campos($club, 'club'), $club->datos ?? [], true);
        } catch (ValidationException $e) {
            foreach ($e->errors() as $m) $f[] = 'Club: '.$m[0];
        }
        $n = $club->integrantes->count();
        if ($n < $cfg->min_integrantes) $f[] = "El club necesita al menos {$cfg->min_integrantes} integrantes (tiene {$n}, incluido el líder).";
        if ($n > $cfg->max_integrantes) $f[] = "El club tiene más de {$cfg->max_integrantes} integrantes.";
        $pi = Especie::camposIntegrante($cfg);
        $camposInt = $this->campos($club, 'integrante');
        foreach ($club->integrantes as $i) {
            $falta = [];
            foreach (['fecha_nacimiento', 'sexo', 'curp', 'grado_grupo', 'correo', 'telefono'] as $k) {
                if ($pi[$k]['obligatorio'] && empty($i->{$k})) $falta[] = mb_strtolower(Especie::CAMPOS_INTEGRANTE[$k]);
            }
            if ($pi['foto']['obligatorio'] && ! $i->foto_path) $falta[] = 'foto';
            try {
                Especie::validarPersonalizados($camposInt, $i->datos ?? [], true);
            } catch (ValidationException $e) {
                $falta[] = 'datos adicionales';
            }
            if (! $cfg->participan_menores && $i->menor_de_edad) $falta[] = 'no participan menores de edad';
            if ($falta) $f[] = "{$i->nombre}: falta ".implode(', ', $falta).'.';
        }
        $subidos = $club->documentos->pluck('clave')->all();
        if (! in_array(Especie::CARTA_ESCUELA, $subidos, true)) $f[] = 'Sube la carta de consentimiento de la escuela (firmada y sellada).';
        foreach (ProgramaDocumento::where('tipo_programa_id', $club->convocatoria->tipo_programa_id)->where('activo', true)->where('obligatorio', true)->get() as $d) {
            if (! in_array($d->clave, $subidos, true)) $f[] = "Sube el documento «{$d->nombre}».";
        }

        return $f;
    }

    // ─────────── Apoyos ───────────

    /** E61: ver el club = líder o acompañante (líder B / director); fuera de eso, 404 (no se revela que existe). */
    private function propio(Request $request, Club $club): void
    {
        abort_unless($club->puedeVer($request->user()), 404);
    }

    private function editable(Request $request, Club $club): void
    {
        $this->propio($request, $club);
        // E61: el líder B y el director (sin compartir el rol de líder) solo ven.
        if (! $club->puedeOperar($request->user())) {
            abort(response()->json(['message' => 'Solo el líder del club puede hacer cambios.'], 403));
        }
        if (! $club->editable()) {
            abort(response()->json(['message' => $club->vencido()
                ? 'El plazo para corregir venció. El COMECYT decidirá si te da una prórroga.'
                : 'Tu club está en revisión y no se puede editar en este momento.'], 422));
        }
    }

    private function config(Club $club): EspecieConfig
    {
        return $club->convocatoria->especieConfig ?? new EspecieConfig(['min_integrantes' => 1, 'max_integrantes' => 10, 'participan_menores' => true]);
    }

    private function campos(Club $club, string $ambito)
    {
        return EspecieCampo::where('convocatoria_id', $club->convocatoria_id)->where('ambito', $ambito)->orderBy('orden')->get();
    }

    /**
     * E55: [escuela_id, escuela_solicitud_id] elegidos. Una escuela del catálogo (activa) o una solicitud PROPIA de esta
     * convocatoria que siga pendiente (si ya se aceptó, se usa la escuela que se creó). Cualquier otra cosa → 422.
     */
    private function escuelaElegida(array $v, int $userId, int $convId): array
    {
        if (! empty($v['escuela_solicitud_id'])) {
            $s = \App\Models\EscuelaSolicitud::where('id', $v['escuela_solicitud_id'])->where('user_id', $userId)->where('convocatoria_id', $convId)->first();
            if (! $s || $s->estado === 'rechazada') {
                throw ValidationException::withMessages(['escuela_solicitud_id' => 'Esa solicitud de escuela no es válida para este club.']);
            }

            return $s->estado === 'aceptada' && $s->escuela_id ? [(int) $s->escuela_id, $s->id] : [null, $s->id];
        }
        $escuela = Escuela::where('activo', true)->find($v['escuela_id'] ?? 0);
        if (! $escuela) throw ValidationException::withMessages(['escuela_id' => 'Elige una escuela del catálogo.']);

        return [$escuela->id, null];
    }

    private function exigirCupoEscuela(Convocatoria $conv, int $escuelaId, ?int $excepto): void
    {
        $limite = $conv->especieConfig?->clubes_por_escuela;
        if (! $limite) return;
        $n = Club::where('convocatoria_id', $conv->id)->where('escuela_id', $escuelaId)->when($excepto, fn ($q) => $q->where('id', '!=', $excepto))->count();
        if ($n >= $limite) {
            throw ValidationException::withMessages(['escuela_id' => "Esa escuela ya alcanzó el límite de {$limite} club(es) en esta convocatoria."]);
        }
    }

    private function detalle(Club $club): array
    {
        $club->loadMissing(['escuela:id,cct,nombre,municipio,nivel,sistema,participo_antes', 'integrantes', 'documentos', 'convocatoria.tipoPrograma']);
        $cfg = $this->config($club);
        $docs = $club->documentos->keyBy('clave');
        $requeridos = collect([['clave' => Especie::CARTA_ESCUELA, 'nombre' => 'Carta de consentimiento de la escuela', 'descripcion' => 'Descárgala, que la firme y selle la escuela, y súbela escaneada en PDF.', 'obligatorio' => true, 'formatos' => ['pdf'], 'max_mb' => 10]])
            ->merge(ProgramaDocumento::where('tipo_programa_id', $club->convocatoria->tipo_programa_id)->where('activo', true)->orderBy('orden')->get()
                ->map(fn ($d) => ['clave' => $d->clave, 'nombre' => $d->nombre, 'descripcion' => $d->descripcion, 'obligatorio' => (bool) $d->obligatorio,
                    'formatos' => TiposArchivo::normalizar($d->formato_permitido), 'max_mb' => TiposArchivo::limiteMb((int) $d->{'tamaño_maximo_mb'})]))
            ->map(fn ($d) => $d + ['subido' => isset($docs[$d['clave']]) ? ['nombre_original' => $docs[$d['clave']]->nombre_original, 'subido_at' => $docs[$d['clave']]->updated_at] : null]);

        return [
            'club' => [
                'id' => $club->id, 'folio' => $club->folio, 'nombre' => $club->nombre, 'estado' => $club->estadoVisible(),
                'logo_url' => $club->logo_url, 'datos' => $club->datos ?? [], 'enviado_at' => $club->enviado_at,
                // E61: editable solo para quien puede operar (líder o director colíder); el líder B y el director ven.
                'escuela' => $club->escuela, 'editable' => $club->editable() && $club->puedeOperar(request()->user()), 'convocatoria_corto' => $club->convocatoria->nombre_corto,
                // E55: escuela solicitada (en revisión o rechazada) mientras el club no tiene una del catálogo.
                'escuela_solicitud' => ! $club->escuela_id && $club->escuelaSolicitud
                    ? $club->escuelaSolicitud->only(['id', 'cct', 'nombre', 'municipio', 'nivel', 'sistema', 'estado', 'motivo'])
                    : null,
            ] + self::avance($club),
            'integrantes' => $club->integrantes->values(),
            'documentos' => $requeridos->values(),
            'config' => EspecieConfigController::payload($club->convocatoria, $cfg),
            'convocatoria' => [
                'id' => $club->convocatoria->id, 'nombre' => $club->convocatoria->nombre, 'nombre_corto' => $club->convocatoria->nombre_corto, 'acepta' => $club->convocatoria->aceptaSolicitudes(),
                'fecha_limite' => $club->convocatoria->fecha_cierre_efectiva ? substr((string) $club->convocatoria->fecha_cierre_efectiva, 0, 10) : null,
            ],
            'faltantes' => $club->editable() ? $this->faltantes($club) : [],
            // E61: qué es quien mira (lider | lider_b | director | director_colider) y, solo para el líder, sus acompañantes.
            'acceso' => $club->accesoDe(request()->user()),
            // 08/10/2026: la ven el dueño y el líder A de un club del director (puede ceder o compartir con el líder B).
            'accesos' => ($p = ClubAccesoController::puede($club, request()->user()))['gestionar'] || $p['ceder'] !== [] ? ClubAccesoController::listado($club, request()->user()) : null,
            'dueno_director' => (bool) $club->dueno_director,
            // E52 · F3: logística (solo clubes aceptados; se manda siempre para que el panel sepa si aplica).
            'logistica' => \App\Support\LogisticaClub::aplica($club) ? \App\Support\LogisticaClub::estado($club) : null,
            // Historial para el líder: qué pasó y el comentario general; sin datos de quién revisó (lista blanca).
            'historial' => $club->revisiones()->with('etapa:id,nombre')->get()
                ->filter(fn ($r) => in_array($r->resultado, ['enviado', 'aprobado', 'observado', 'rechazado', 'prorroga', 'subsanado', 'comite_aceptado', 'comite_no_aceptado'], true))
                ->map(fn ($r) => ['resultado' => $r->resultado, 'etapa' => $r->etapa?->nombre, 'comentario' => $r->comentario,
                    'vence_at' => $r->vence_at, 'horas' => $r->horas, 'fecha' => $r->created_at])->values(),
        ];
    }

    /** Avance del club en la revisión (común al líder y al personal). */
    public static function avance(Club $club): array
    {
        $club->loadMissing('etapaActual');
        $etapas = RevisionClub::etapas($club->convocatoria_id);
        $observacion = in_array($club->estado, ['observado'], true)
            ? $club->revisiones()->where('resultado', 'observado')->latest('id')->value('comentario') : null;

        return [
            'vence_at' => $club->vence_at,
            'ronda' => $club->ronda,
            'etapa_actual' => $club->etapaActual ? ['id' => $club->etapaActual->id, 'orden' => $club->etapaActual->orden, 'nombre' => $club->etapaActual->nombre,
                'max_subsanaciones' => $club->etapaActual->max_subsanaciones, 'plazo_horas' => $club->etapaActual->plazo_horas, 'revisa' => $club->etapaActual->revisa] : null,
            'etapas' => $etapas->map(fn ($e) => ['orden' => $e->orden, 'nombre' => $e->nombre])->values(),
            'observacion' => $observacion,
            'visto_bueno_at' => $club->visto_bueno_at,
            'comite_resultado' => $club->comite_resultado,
            'aceptado_at' => $club->aceptado_at,
            'rechazo_origen' => $club->rechazo_origen,
            'rechazo_motivo' => $club->rechazo_motivo,
            'aviso_privacidad_at' => $club->aviso_privacidad_at,
        ];
    }
}
