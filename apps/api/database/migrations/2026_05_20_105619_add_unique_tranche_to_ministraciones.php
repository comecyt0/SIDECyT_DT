<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Refuerza el lockForUpdate sobre Solicitud durante saveDictamen:
     * agrega numero_tranche + monto + unique(solicitud_id, numero_tranche)
     * para que el DB rechace cualquier ministración duplicada incluso si
     * el lock fallara o se removiera en el futuro.
     */
    public function up(): void
    {
        Schema::table('ministraciones', function (Blueprint $table) {
            if (! Schema::hasColumn('ministraciones', 'numero_tranche')) {
                $table->unsignedSmallInteger('numero_tranche')->default(1)->after('estado');
            }
            if (! Schema::hasColumn('ministraciones', 'monto')) {
                $table->decimal('monto', 14, 2)->nullable()->after('numero_tranche');
            }
        });

        // Asegurar que registros existentes tengan numero_tranche=1 (idempotente)
        DB::table('ministraciones')->whereNull('numero_tranche')->update(['numero_tranche' => 1]);

        Schema::table('ministraciones', function (Blueprint $table) {
            $table->unique(['solicitud_id', 'numero_tranche'], 'min_solicitud_tranche_unique');
        });
    }

    public function down(): void
    {
        Schema::table('ministraciones', function (Blueprint $table) {
            $table->dropUnique('min_solicitud_tranche_unique');
            $table->dropColumn(['numero_tranche', 'monto']);
        });
    }
};
