<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('solicitudes', function (Blueprint $table) {
            $table->string('informe_final_url')->nullable()->after('estado');
            $table->timestamp('fecha_entrega_informe')->nullable()->after('informe_final_url');
            $table->string('estado_informe', 50)->default('pendiente')->after('fecha_entrega_informe'); // pendiente, entregado, observado, aprobado
            $table->text('observaciones_informe')->nullable()->after('estado_informe');
            $table->timestamp('fecha_limite_informe')->nullable()->after('observaciones_informe');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('solicitudes', function (Blueprint $table) {
            $table->dropColumn([
                'informe_final_url',
                'fecha_entrega_informe',
                'estado_informe',
                'observaciones_informe',
                'fecha_limite_informe',
            ]);
        });
    }
};
