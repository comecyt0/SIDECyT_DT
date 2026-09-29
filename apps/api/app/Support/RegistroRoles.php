<?php

namespace App\Support;

use App\Models\CodigoPostal;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * E52 · Registro general — reglas compartidas por el registro público (/auth/registro) y por "Mis roles" (pedir otro rol
 * con cuenta). Decisiones del usuario en docs/APOYO_EN_ESPECIE.md §10.
 */
class RegistroRoles
{
    /** CURP oficial (RENAPO): 4 letras, fecha AAMMDD, sexo H/M/X, entidad (2), 3 consonantes, homoclave, dígito. */
    public const PATRON_CURP = '/^[A-Z][AEIOUX][A-Z]{2}\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])[HMX](AS|B[CS]|C[CLMSH]|D[FG]|G[TR]|HG|JC|M[CNS]|N[ETL]|OC|PL|Q[TR]|S[PLR]|T[CSL]|VZ|YN|ZS|NE)[B-DF-HJ-NP-TV-Z]{3}[A-Z\d]\d$/';

    /** Directorio del disco privado para los CV de evaluadores. */
    public const DIR_CV = 'registro';

    public static function rolesAutoservicio(): array
    {
        return (array) config('comecyt.registro.roles_autoservicio', []);
    }

    /** Reglas de los datos personales del registro general. */
    public static function reglasPersona(): array
    {
        return [
            'nombre' => 'required|string|max:255',
            'telefono' => ['required', 'string', 'regex:/^\d{10}$/'],
            'curp' => ['required', 'string', 'size:18', 'regex:'.self::PATRON_CURP],
            'codigo_postal' => ['required', 'string', 'regex:/^\d{5}$/'],
            'colonia' => 'required|string|max:150',
            'cargo' => 'required|string|max:150',
        ];
    }

    /** Reglas de los datos según el rol pedido (la empresa solo para Participante; CV y grado para Evaluador). */
    public static function reglasRol(string $rol): array
    {
        return match ($rol) {
            'solicitante' => [
                'empresa_nombre' => 'required|string|max:255',
                'empresa_datos' => 'nullable|array',
                'empresa_datos.rfc' => ['nullable', 'string', 'regex:/^[A-ZÑ&]{3,4}\d{6}[A-Z\d]{3}$/i'],
                'empresa_datos.tipo_persona' => 'nullable|in:fisica,moral,asociacion_civil,otro',
                'empresa_datos.rol_supervision' => 'nullable|string|max:255',
                'contactos' => 'required|array',
                // Como el formulario anterior: el Responsable del Proyecto es obligatorio (ahora también en el servidor).
                'contactos.responsable.nombre' => 'required|string|max:255',
                'contactos.responsable.correo' => 'required|email|max:255',
                'contactos.*.nombre' => 'nullable|string|max:255',
                'contactos.*.telefono' => 'nullable|string|max:20',
                'contactos.*.correo' => 'nullable|email|max:255',
            ],
            'evaluador' => [
                'area_conocimiento_id' => 'required|integer|exists:areas_conocimiento,id',
                'institucion' => 'required|string|max:255',
                'grado_academico' => 'required|in:'.implode(',', (array) config('comecyt.registro.grados_academicos')),
                'cv' => 'required|file|max:'.((int) config('comecyt.registro.cv_max_mb', 5) * 1024),
            ],
            'lider_club' => [],
            default => [],
        };
    }

    public static function mensajes(): array
    {
        return [
            'curp.regex' => 'La CURP no tiene un formato válido.',
            'curp.size' => 'La CURP debe tener 18 caracteres.',
            'telefono.regex' => 'El teléfono debe tener 10 dígitos.',
            'codigo_postal.regex' => 'El código postal debe tener 5 dígitos.',
            'empresa_datos.rfc.regex' => 'El RFC no tiene un formato válido.',
            'contactos.required' => 'Registra al Responsable del Proyecto.',
            'contactos.responsable.nombre.required' => 'Escribe el nombre del Responsable del Proyecto.',
            'contactos.responsable.correo.required' => 'Escribe el correo del Responsable del Proyecto.',
            'cv.required' => 'Adjunta tu CV en PDF.',
            'cv.max' => 'El CV no puede pesar más de '.config('comecyt.registro.cv_max_mb', 5).' MB.',
        ];
    }

    /**
     * Resuelve el código postal contra el catálogo del Estado de México. El municipio lo decide el servidor (no se confía
     * en el cliente) y la colonia debe ser uno de los asentamientos de ese código. Lanza 422 si no cuadra.
     *
     * @return array{codigo_postal:string, municipio:string, colonia:string}
     */
    public static function resolverDomicilio(string $cp, string $colonia): array
    {
        $filas = CodigoPostal::where('cp', $cp)->get(['asentamiento', 'municipio']);
        if ($filas->isEmpty()) {
            throw ValidationException::withMessages(['codigo_postal' => 'Ese código postal no pertenece al Estado de México. El registro es solo para el Estado de México.']);
        }
        $col = $filas->first(fn ($f) => mb_strtolower($f->asentamiento) === mb_strtolower(trim($colonia)));
        if (! $col) {
            throw ValidationException::withMessages(['colonia' => 'Elige una colonia de la lista de ese código postal.']);
        }

        return ['codigo_postal' => $cp, 'municipio' => $col->municipio, 'colonia' => $col->asentamiento];
    }

    /** Guarda el CV (solo PDF real, verificado por contenido) en el disco privado y devuelve el nombre interno. */
    public static function guardarCv(UploadedFile $archivo): string
    {
        $ext = TiposArchivo::validar($archivo, ['pdf'], (int) config('comecyt.registro.cv_max_mb', 5), 'cv');
        $nombre = Str::random(40).'.'.$ext;
        Storage::disk('local')->put(self::DIR_CV.'/'.$nombre, file_get_contents($archivo->getPathname()));

        return $nombre;
    }

    /** Datos del rol que se guardan en JSON (sin archivos: el CV va por nombre interno). */
    public static function datosRol(Request $request, string $rol, ?string $cvNombre): ?array
    {
        return match ($rol) {
            'evaluador' => [
                'area_conocimiento_id' => (int) $request->input('area_conocimiento_id'),
                'institucion' => trim((string) $request->input('institucion')),
                'grado_academico' => (string) $request->input('grado_academico'),
                'cv' => $cvNombre,
            ],
            'solicitante' => [
                'empresa_nombre' => trim((string) $request->input('empresa_nombre')),
                'empresa_datos' => $request->input('empresa_datos'),
                'contactos' => $request->input('contactos'),
            ],
            default => null,
        };
    }

    /** Nombre interno de CV válido (40 alfanuméricos + .pdf). */
    public static function cvValido(?string $nombre): bool
    {
        return is_string($nombre) && preg_match('/^[A-Za-z0-9]{40}\.pdf$/', $nombre) === 1;
    }
}
