<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('solicitudes', function (Blueprint $table) {
            if (! Schema::hasColumn('solicitudes', 'modalidad_id')) {
                $table->foreignId('modalidad_id')->nullable()->constrained('programa_modalidades')->nullOnDelete();
            }
            if (! Schema::hasColumn('solicitudes', 'etapa_actual_id')) {
                $table->foreignId('etapa_actual_id')->nullable()->constrained('programa_etapas')->nullOnDelete();
            }
            if (! Schema::hasColumn('solicitudes', 'etapa_estado')) {
                $table->string('etapa_estado', 50)->default('en_proceso');
            }
        });
    }

    public function down(): void
    {
        Schema::table('solicitudes', function (Blueprint $table) {
            $table->dropColumn(['modalidad_id', 'etapa_actual_id', 'etapa_estado']);
        });
    }
};
