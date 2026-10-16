<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\Alcance;
use App\Support\Audit;
use App\Support\IdentidadCurp;
use App\Support\NombrePropio;
use App\Support\ValidadorCurp;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

/**
 * Usuarios (solo admin general). E45: asignación de alcance —
 *   - `convocatoria_ids`: convocatorias que opera un admin de convocatoria;
 *   - `periodo_ids`: periodos visibles para admin de convocatoria, revisor, evaluador y consulta.
 * Cambios de rol y de alcance quedan en la bitácora.
 */
class UserController extends Controller
{
    private const ROLES_CON_PERIODO = ['admin_convocatoria', 'revisor', 'evaluador', 'consulta'];

    public function index(Request $request)
    {
        $query = User::with(['rol', 'empresa', 'convocatoriasAsignadas:id,nombre', 'periodos:id,nombre'])->orderBy('id', 'desc');

        if ($request->filled('search')) {
            $search = '%'.addcslashes((string) $request->search, '%_\\').'%';
            $query->where(function ($q) use ($search) {
                $q->where('name', 'ilike', $search)
                    ->orWhere('email', 'ilike', $search);
            });
        }
        if ($request->filled('rol_id')) {
            $query->where('rol_id', (int) $request->rol_id);
        }

        $perPage = min(100, (int) $request->get('per_page', 0));
        if ($perPage > 0) {
            return response()->json($query->paginate($perPage));
        }

        return response()->json($query->limit(1000)->get());
    }

    public function store(Request $request)
    {
        // E76: nombre por partes con mayúscula inicial; CURP opcional (personal), verificada si se escribe.
        $request->merge(IdentidadCurp::normalizar($request->only(['nombres', 'primer_apellido', 'segundo_apellido', 'curp'])));
        $validated = $request->validate($this->reglas() + $this->reglasIdentidad(true, null) + [
            'email' => 'required|string|email|max:255|unique:users',
            'password' => ['required', 'confirmed', Password::defaults()], // 15/10/2026: con confirmación
            'rol_id' => 'required|exists:roles,id',
        ], IdentidadCurp::mensajes() + self::MENSAJES);

        $identidad = $this->identidad($validated, null);
        $user = DB::transaction(function () use ($validated, $identidad) {
            $datos = collect($validated)->except(['convocatoria_ids', 'periodo_ids', ...self::CAMPOS_IDENTIDAD])->all();
            $datos['password'] = Hash::make($datos['password']);
            $user = User::create($datos + ['name' => $identidad['name']]);
            $user->forceFill($identidad)->save();
            $this->sincronizarAlcance($user, $validated);
            $this->sincronizarRoles($user, (int) $user->rol_id);

            return $user;
        });
        Audit::log('user.creado', $user, ['rol_id' => $user->rol_id, 'curp_verificacion' => $user->curp_verificacion] + $this->resumenAlcance($user));

        return response()->json([
            'message' => 'Usuario creado con éxito',
            'user' => $user->load(['rol', 'empresa', 'convocatoriasAsignadas:id,nombre', 'periodos:id,nombre']),
        ], 201);
    }

    public function show(User $user)
    {
        return response()->json($user->load(['rol', 'empresa', 'convocatoriasAsignadas:id,nombre', 'periodos:id,nombre']));
    }

    public function update(Request $request, User $user)
    {
        $request->merge(IdentidadCurp::normalizar($request->only(['nombres', 'primer_apellido', 'segundo_apellido', 'curp'])));
        $validated = $request->validate($this->reglas() + $this->reglasIdentidad(false, $user) + [
            'email' => 'string|email|max:255|unique:users,email,'.$user->id,
            'password' => ['nullable', 'confirmed', Password::defaults()],
            'rol_id' => 'exists:roles,id',
        ], IdentidadCurp::mensajes() + self::MENSAJES);

        // Nadie se quita a sí mismo el rol de admin ni se desactiva (evita quedarse fuera por error).
        $yo = $request->user();
        if ((int) $yo->id === (int) $user->id) {
            if (isset($validated['rol_id']) && (int) $validated['rol_id'] !== (int) $user->rol_id) {
                return response()->json(['message' => 'No puedes cambiar tu propio rol.'], 422);
            }
            if (array_key_exists('activo', $validated) && ! $validated['activo']) {
                return response()->json(['message' => 'No puedes desactivar tu propia cuenta.'], 422);
            }
        }
        // Nunca dejar el sistema sin un admin activo.
        $dejaDeSerAdminActivo = $user->tieneRol('admin') && (
            (isset($validated['rol_id']) && (int) $validated['rol_id'] !== (int) config('comecyt.roles.admin'))
            || (array_key_exists('activo', $validated) && ! $validated['activo'])
        );
        if ($dejaDeSerAdminActivo && User::where('rol_id', config('comecyt.roles.admin'))->where('activo', true)->count() <= 1) {
            return response()->json(['message' => 'Debe quedar al menos un administrador activo.'], 422);
        }

        $antes = ['rol_id' => $user->rol_id, 'activo' => $user->activo] + $this->resumenAlcance($user);

        $identidad = $this->identidad($validated, $user);
        DB::transaction(function () use ($validated, $user, $identidad) {
            $datos = collect($validated)->except(['convocatoria_ids', 'periodo_ids', ...self::CAMPOS_IDENTIDAD])->all();
            if ($identidad !== []) {
                $user->forceFill($identidad);
            }
            if (! empty($datos['password'])) {
                $datos['password'] = Hash::make($datos['password']);
            } else {
                unset($datos['password']);
            }
            $user->update($datos);
            $this->sincronizarAlcance($user->fresh(), $validated);
            if (isset($validated['rol_id'])) {
                $this->sincronizarRoles($user, (int) $validated['rol_id']);
            }
        });
        Alcance::olvidar($user->id);

        $despues = ['rol_id' => $user->fresh()->rol_id, 'activo' => $user->fresh()->activo] + $this->resumenAlcance($user);
        if ($antes !== $despues) {
            Audit::log('user.rol_o_alcance_cambiado', $user, ['antes' => $antes, 'despues' => $despues]);
        }

        return response()->json([
            'message' => 'Usuario actualizado con éxito',
            'user' => $user->fresh()->load(['rol', 'empresa', 'convocatoriasAsignadas:id,nombre', 'periodos:id,nombre']),
        ]);
    }

    public function destroy(Request $request, User $user)
    {
        if ($user->id === $request->user()->id) {
            return response()->json(['message' => 'No puedes eliminar tu propia cuenta.'], 422);
        }

        if ((int) $user->rol_id === (int) config('comecyt.roles.admin')) {
            $adminCount = User::where('rol_id', config('comecyt.roles.admin'))->count();
            if ($adminCount <= 1) {
                return response()->json(['message' => 'No puedes eliminar el último administrador del sistema.'], 422);
            }
        }

        Audit::log('user.eliminado', $user, ['email' => $user->email, 'rol_id' => $user->rol_id]);
        $user->delete();

        return response()->json([
            'message' => 'Usuario eliminado con éxito',
        ]);
    }

    private const MENSAJES = [
        'curp.unique' => 'Esa CURP ya tiene una cuenta.',
        'fecha_nacimiento.required_with' => 'Escribe la fecha de nacimiento: la CURP se compara con ella.',
        'name.prohibited' => 'El nombre se escribe por partes (nombre y apellidos).',
        'primer_apellido.required_with' => 'Escribe el primer apellido.',
    ];

    private const CAMPOS_IDENTIDAD = ['name', 'nombres', 'primer_apellido', 'segundo_apellido', 'curp', 'fecha_nacimiento', 'curp_revision'];

    /**
     * E76 — Reglas del nombre y la CURP. Alta: nombre por partes obligatorio; CURP y fecha opcionales (el personal no
     * siempre la registra). Edición: una cuenta con nombre por partes se edita por partes; una anterior, en un campo.
     */
    private function reglasIdentidad(bool $alta, ?User $user): array
    {
        $nombre = ['string', 'max:'.NombrePropio::MAX, 'regex:'.NombrePropio::REGEX];
        $porPartes = $alta || $user?->nombres !== null;

        return [
            'name' => $porPartes ? ['prohibited'] : ['sometimes', 'string', 'min:3', 'max:255', 'regex:'.NombrePropio::REGEX],
            'nombres' => $porPartes ? [$alta ? 'required' : 'sometimes', ...$nombre] : ['sometimes', 'required', ...$nombre],
            'primer_apellido' => [$alta ? 'required' : 'required_with:nombres', ...$nombre],
            'segundo_apellido' => ['nullable', ...$nombre],
            'curp' => ['nullable', 'string', 'size:18', 'regex:'.ValidadorCurp::REGEX, Rule::unique('users', 'curp')->ignore($user?->id)],
            'fecha_nacimiento' => ['nullable', 'required_with:curp', 'date_format:Y-m-d', 'before:today', 'after:1900-01-01'],
            'curp_revision' => ['sometimes', 'boolean'],
        ];
    }

    /**
     * Columnas de identidad a guardar ([] si no cambió nada). Si la cuenta tiene (o recibe) CURP y fecha, el nombre debe
     * corresponderle; el admin puede confirmar una CURP que no coincide (curp_revision) y queda como aprobada por él.
     */
    private function identidad(array $v, ?User $user): array
    {
        if (isset($v['name'])) {
            return ['name' => NombrePropio::formatear(strip_tags($v['name']), true)];
        }
        $toca = array_intersect_key($v, array_flip(['nombres', 'primer_apellido', 'segundo_apellido', 'curp', 'fecha_nacimiento']));
        if ($toca === []) {
            return [];
        }
        $final = [
            'nombres' => $v['nombres'] ?? $user?->nombres,
            'primer_apellido' => $v['primer_apellido'] ?? $user?->primer_apellido,
            'segundo_apellido' => array_key_exists('nombres', $v) ? ($v['segundo_apellido'] ?? null) : $user?->segundo_apellido,
            'curp' => $v['curp'] ?? $user?->curp,
            'fecha_nacimiento' => $v['fecha_nacimiento'] ?? $user?->fecha_nacimiento?->format('Y-m-d'),
            'curp_revision' => (bool) ($v['curp_revision'] ?? false),
        ];
        // Al editar, el formulario manda todo: si nada cambió no se vuelve a verificar (una CURP aprobada en revisión no
        // debe impedir cambiar el rol o el teléfono).
        if ($user && $final['nombres'] === $user->nombres && $final['primer_apellido'] === $user->primer_apellido
            && $final['segundo_apellido'] === $user->segundo_apellido && $final['curp'] === $user->curp
            && $final['fecha_nacimiento'] === $user->fecha_nacimiento?->format('Y-m-d')) {
            return [];
        }
        $name = NombrePropio::completo((string) $final['nombres'], (string) $final['primer_apellido'], $final['segundo_apellido']);
        if (! $final['curp'] || ! $final['fecha_nacimiento']) {
            return ['nombres' => $final['nombres'], 'primer_apellido' => $final['primer_apellido'], 'segundo_apellido' => $final['segundo_apellido'], 'name' => $name];
        }
        [$estado, $problemas] = IdentidadCurp::verificar($final);
        // Quien confirma aquí es el propio admin (el revisor): no queda pendiente, queda aprobada.
        $estado = $estado === IdentidadCurp::REVISION ? IdentidadCurp::APROBADA : $estado;

        return IdentidadCurp::columnas($final, $estado, $problemas);
    }

    private function reglas(): array
    {
        return [
            'empresa_id' => 'nullable|exists:empresas,id',
            'telefono' => 'nullable|string|max:20',
            'cargo' => 'nullable|string|max:255',
            'activo' => 'boolean',
            'convocatoria_ids' => 'sometimes|array|max:200',
            'convocatoria_ids.*' => 'integer|distinct|exists:convocatorias,id',
            'periodo_ids' => 'sometimes|array|max:100',
            'periodo_ids.*' => 'integer|distinct|exists:periodos,id',
        ];
    }

    /** Aplica el alcance según el rol; lo que no corresponde al rol se limpia (un revisor no conserva convocatorias). */
    /**
     * E52 — Roles otorgados cuando el admin fija el rol de una cuenta: el nuevo rol queda otorgado y se RETIRAN los roles
     * de personal (admin, revisor, admin de convocatoria, consulta) que no sean el nuevo. Sin esto, alguien degradado de
     * admin a solicitante podría volver a "cambiar de rol" a admin desde Mis roles (escalada de privilegios).
     * Los roles de autoservicio (participante, líder de club, evaluador) se conservan: los aprobó un admin.
     */
    private function sincronizarRoles(User $user, int $rolId): void
    {
        $autoservicio = array_map(fn ($s) => (int) config("comecyt.roles.{$s}"), \App\Support\RegistroRoles::rolesAutoservicio());
        \App\Models\UsuarioRol::where('user_id', $user->id)
            ->where('rol_id', '!=', $rolId)
            ->whereNotIn('rol_id', $autoservicio)
            ->delete();
        \App\Models\UsuarioRol::otorgar($user->id, $rolId, auth()->id());
    }

    private function sincronizarAlcance(User $user, array $validated): void
    {
        // Convocatorias asignadas: admin de convocatoria (E45) y operador de evento (E52 · F4).
        $esDelegado = $user->tieneRol('admin_convocatoria', 'operador_evento');
        $conPeriodo = $user->tieneRol(...self::ROLES_CON_PERIODO);

        if (! $esDelegado) {
            $user->convocatoriasAsignadas()->detach();
        } elseif (array_key_exists('convocatoria_ids', $validated)) {
            $user->convocatoriasAsignadas()->sync($validated['convocatoria_ids']);
        }

        if (! $conPeriodo) {
            $user->periodos()->detach();
        } elseif (array_key_exists('periodo_ids', $validated)) {
            $user->periodos()->sync($validated['periodo_ids']);
        }
    }

    private function resumenAlcance(User $user): array
    {
        return [
            'convocatorias' => DB::table('convocatoria_user')->where('user_id', $user->id)->orderBy('convocatoria_id')->pluck('convocatoria_id')->all(),
            'periodos' => DB::table('periodo_user')->where('user_id', $user->id)->orderBy('periodo_id')->pluck('periodo_id')->all(),
        ];
    }
}
