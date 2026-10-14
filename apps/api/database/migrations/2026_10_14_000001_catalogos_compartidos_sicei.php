<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * 14/10/2026 (E72, paso 2) — Catálogos compartidos con SICEI (docs/SICEI_BD_COMPARTIDA.md).
 * Solo agrega: SIGAE no cambia nada existente.
 *  - municipios.cvegeo (clave INEGI 15XXX, única) + los 125 municipios del Estado de México
 *    (database/data/municipios_edomex.json, el mismo archivo que trae SICEI).
 *  - areas_conocimiento.clave (única): las 7 áreas que usa SICEI ya existen aquí con otro nombre; se les pone su clave
 *    y la 8.ª de SIGAE recibe MULTI. No se crean filas ni se renombra nada.
 */
return new class extends Migration
{
    private const AREAS = [
        'Física, Matemáticas y Ciencias de la Tierra' => 'FIS-MAT',
        'Biología y Química' => 'BIO-QUIM',
        'Medicina y Ciencias de la Salud' => 'MED-SALUD',
        'Humanidades y Ciencias de la Conducta' => 'HUM-COND',
        'Ciencias Sociales' => 'SOC',
        'Biotecnología y Ciencias Agropecuarias' => 'BIOTEC-AGRO',
        'Ingenierías' => 'ING',
        'Investigación Multidisciplinaria' => 'MULTI',
    ];

    public function up(): void
    {
        Schema::table('municipios', function (Blueprint $t) {
            $t->string('cvegeo', 5)->nullable()->unique();
        });
        Schema::table('areas_conocimiento', function (Blueprint $t) {
            $t->string('clave', 20)->nullable()->unique();
        });

        $ruta = database_path('data/municipios_edomex.json');
        $lista = json_decode((string) file_get_contents($ruta), true, 4, JSON_THROW_ON_ERROR);
        if (! is_array($lista) || count($lista) !== 125) {
            throw new RuntimeException('municipios_edomex.json debe traer 125 municipios.');
        }

        $ahora = now();
        $filas = [];
        foreach ($lista as $m) {
            $clave = (string) ($m['cvegeo'] ?? '');
            $nombre = trim((string) ($m['nombre'] ?? ''));
            if (! preg_match('/^15\d{3}$/', $clave) || $nombre === '' || mb_strlen($nombre) > 150) {
                throw new RuntimeException("Municipio inválido: {$clave}");
            }
            $filas[] = [
                'cvegeo' => $clave,
                'nombre' => $nombre,
                'estado' => 'Estado de México',
                'activo' => true,
                'created_at' => $ahora,
                'updated_at' => $ahora,
            ];
        }
        DB::table('municipios')->upsert($filas, ['cvegeo'], ['nombre', 'updated_at']);

        // Por nombre exacto (comparado en PHP: el LOWER() de esta base no baja acentos, E54).
        foreach (DB::table('areas_conocimiento')->get(['id', 'nombre']) as $area) {
            $clave = self::AREAS[$area->nombre] ?? null;
            if ($clave !== null) {
                DB::table('areas_conocimiento')->where('id', $area->id)->update(['clave' => $clave]);
            }
        }
    }

    public function down(): void
    {
        DB::table('municipios')->whereNotNull('cvegeo')->delete();
        Schema::table('areas_conocimiento', fn (Blueprint $t) => $t->dropColumn('clave'));
        Schema::table('municipios', fn (Blueprint $t) => $t->dropColumn('cvegeo'));
    }
};
