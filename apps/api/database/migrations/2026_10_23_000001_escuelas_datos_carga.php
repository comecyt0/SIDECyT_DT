<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * E94 (23/10/2026) — Base de escuelas de robótica (Excel «BASE DE DATOS ROBÓTICA 2026-2027»): datos de la escuela y de su
 * equipo para identificarla en el catálogo y sugerir el nombre del club al registrarlo. Solo agrega columnas opcionales:
 * el catálogo y los clubes existentes no cambian.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('escuelas', function (Blueprint $t) {
            $t->string('equipo_nombre', 255)->nullable()->after('temporadas');      // equipo con el que participa (se sugiere al líder)
            $t->string('domicilio', 400)->nullable()->after('equipo_nombre');
            $t->string('ubicacion_url', 1000)->nullable()->after('domicilio');       // solo enlaces de mapas https (se valida al guardar y al mostrar)
            $t->decimal('latitud', 10, 7)->nullable()->after('ubicacion_url');
            $t->decimal('longitud', 10, 7)->nullable()->after('latitud');
            $t->unsignedInteger('matricula_total')->nullable()->after('longitud');
            $t->unsignedInteger('matricula_hombres')->nullable()->after('matricula_total');
            $t->unsignedInteger('matricula_mujeres')->nullable()->after('matricula_hombres');
            $t->string('tipo_secundaria', 20)->nullable()->after('matricula_mujeres'); // general | tecnica | telesecundaria
            $t->string('zona', 60)->nullable()->after('tipo_secundaria');            // Indígena, Toluca, Ecatepec, Atlacomulco…
            $t->string('subsistema_detalle', 60)->nullable()->after('zona');         // texto original: ESTATAL (SEB), FEDERAL (SEIEM)…
            $t->string('observaciones', 500)->nullable()->after('subsistema_detalle'); // avisos de la carga para que el admin los revise
        });
    }

    public function down(): void
    {
        Schema::table('escuelas', fn (Blueprint $t) => $t->dropColumn([
            'equipo_nombre', 'domicilio', 'ubicacion_url', 'latitud', 'longitud', 'matricula_total', 'matricula_hombres',
            'matricula_mujeres', 'tipo_secundaria', 'zona', 'subsistema_detalle', 'observaciones',
        ]));
    }
};
