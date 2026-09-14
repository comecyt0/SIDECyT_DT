<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Rename solicitudes_acceso.institucion_nombre → empresa_nombre
 * para alinearse con el rename Institución → Empresa.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('solicitudes_acceso')
            && Schema::hasColumn('solicitudes_acceso', 'institucion_nombre')
            && ! Schema::hasColumn('solicitudes_acceso', 'empresa_nombre')) {
            Schema::table('solicitudes_acceso', function (Blueprint $table) {
                $table->renameColumn('institucion_nombre', 'empresa_nombre');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('solicitudes_acceso')
            && Schema::hasColumn('solicitudes_acceso', 'empresa_nombre')
            && ! Schema::hasColumn('solicitudes_acceso', 'institucion_nombre')) {
            Schema::table('solicitudes_acceso', function (Blueprint $table) {
                $table->renameColumn('empresa_nombre', 'institucion_nombre');
            });
        }
    }
};
