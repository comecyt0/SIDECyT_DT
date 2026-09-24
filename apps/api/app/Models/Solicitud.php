<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Solicitud extends Model
{
    use SoftDeletes;

    protected $table = 'solicitudes';

    // SEV-1 — Denylist robusta a migraciones futuras. Bloquea explícitamente los
    // campos que jamás deben modificarse vía mass-assignment desde un DTO de cliente:
    //   - 'id'           : PK
    //   - 'folio'        : asignado por el sistema (unique constraint, no editable)
    //   - 'estado'       : sólo se modifica vía métodos de servicio con transiciones validadas
    //   - 'notas_internas' : sólo admins/revisores via endpoints autorizados
    //   - 'etapa_estado' : ciclo controlado por el flujo de evaluación
    //   - 'estado_informe' : ciclo controlado por revisor
    //   - timestamps y deleted_at
    // Cualquier columna no listada aquí es asignable; los controllers ya validan
    // con $request->validate() (defensa en 2 capas — Gold Rule).
    protected $guarded = [
        'id',
        'folio',
        'estado',
        'notas_internas',
        'etapa_estado',
        'estado_informe',
        'created_at',
        'updated_at',
        'deleted_at',
    ];

    protected $casts = [
        'fecha_inicio_evento' => 'date',
        'fecha_fin_evento' => 'date',
        'monto_solicitado' => 'decimal:2',
        'aportacion_concurrente' => 'decimal:2',
        'fecha_entrega_informe' => 'datetime',
        'fecha_limite_informe' => 'datetime',
    ];

    protected $appends = ['resumen'];

    /** Estados que cuentan como folio aprobado / no aprobado (E45, decisión del usuario: "por dictamen"). */
    public const ESTADOS_APROBADOS = ['aprobada', 'convenio', 'ministracion', 'seguimiento', 'cerrada'];

    public const ESTADOS_NO_APROBADOS = ['rechazada', 'cancelada'];

    /**
     * E45 — Seguimiento: cada creación o cambio de `estado` queda en solicitud_historial, venga de donde venga
     * (todas las transiciones usan forceFill()->save(), así que pasan por aquí). El motivo se toma de la petición
     * si trae `motivo` u `observaciones` (rechazar, cancelar, observar).
     */
    protected static function booted(): void
    {
        static::saved(function (Solicitud $s) {
            if (! $s->wasRecentlyCreated && ! $s->wasChanged('estado')) {
                return;
            }
            $req = request();
            $motivo = $req ? ($req->input('motivo') ?? $req->input('observaciones')) : null;
            SolicitudHistorial::create([
                'solicitud_id' => $s->id,
                'estado_anterior' => $s->wasRecentlyCreated ? null : $s->getOriginal('estado'),
                'estado_nuevo' => (string) $s->estado,
                'user_id' => auth('api')->id(),
                'motivo' => is_string($motivo) ? mb_substr($motivo, 0, 1000) : null,
                'created_at' => now(),
            ]);
        });
    }

    /**
     * 24/09/2026 (E45): adminShowFull cargaba `informe`, que no existía → 500 con la primera solicitud real
     * (RelationNotFoundException). Informe ya tenía su belongsTo(Solicitud); faltaba el lado inverso.
     */
    public function informes()
    {
        return $this->hasMany(Informe::class);
    }

    public function informe()
    {
        return $this->hasOne(Informe::class)->latestOfMany();
    }

    public function historial()
    {
        return $this->hasMany(SolicitudHistorial::class)->orderBy('created_at')->orderBy('id');
    }

    /**
     * Virtual attribute alias for descripcion_proyecto for frontend compatibility.
     */
    public function getResumenAttribute()
    {
        return $this->descripcion_proyecto;
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Alias histórico de empresa(): el FK de esta tabla se llama `empresa_id` desde la
     * migración 2026_06_02_120000 (instituciones → empresas). Sin el FK explícito,
     * Eloquent infiere `institucion_id`, que ya no existe — ver E25 en CLAUDE.md.
     */
    public function institucion()
    {
        return $this->belongsTo(Empresa::class, 'empresa_id');
    }

    /**
     * 24/09/2026: el comentario de arriba la llama "alias de empresa()", pero empresa() NO existía. La cargan
     * SolicitudesExport (Excel), DocumentoController (PDF de convenio y dictamen) y el front (`sol.empresa`):
     * con la primera solicitud real, todas esas rutas habrían dado 500 (RelationNotFoundException). Con 0 filas
     * Laravel no intenta la carga ansiosa, por eso no se había visto.
     */
    public function empresa()
    {
        return $this->belongsTo(Empresa::class, 'empresa_id');
    }

    public function areaConocimiento()
    {
        return $this->belongsTo(AreaConocimiento::class, 'area_conocimiento_id');
    }

    public function convocatoria()
    {
        return $this->belongsTo(Convocatoria::class);
    }

    public function observaciones()
    {
        return $this->hasMany(Observacion::class);
    }

    public function asignaciones()
    {
        return $this->hasMany(AsignacionEvaluador::class);
    }

    public function ministracion()
    {
        return $this->hasOne(Ministracion::class);
    }

    public function convenio()
    {
        return $this->hasOne(Convenio::class);
    }

    public function documentos()
    {
        return $this->hasMany(SolicitudDocumento::class);
    }

    public function modalidad()
    {
        return $this->belongsTo(ProgramaModalidad::class);
    }

    public function etapaActual()
    {
        return $this->belongsTo(ProgramaEtapa::class, 'etapa_actual_id');
    }

    public function camposDinamicos()
    {
        return $this->hasMany(SolicitudCampoDinamico::class);
    }

    public function rubrosPrepuesto()
    {
        return $this->hasMany(SolicitudRubroPresupuesto::class);
    }

    public function miembrosEquipo()
    {
        return $this->hasMany(SolicitudMiembroEquipo::class);
    }
}
