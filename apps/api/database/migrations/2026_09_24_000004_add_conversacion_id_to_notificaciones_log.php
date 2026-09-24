<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * E45 (24/09/2026): la campana avisaba "Nuevo mensaje en el buzón" sin saber de qué hilo. Al pulsarla no llevaba al
 * hilo, y si el hilo se borraba la notificación quedaba huérfana ("tengo mensajes nuevos pero el buzón está vacío").
 * Con la FK: la notificación abre su hilo y se borra junto con él.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('notificaciones_log', function (Blueprint $t) {
            $t->foreignId('conversacion_id')->nullable()->after('solicitud_id')
                ->constrained('conversaciones')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('notificaciones_log', function (Blueprint $t) {
            $t->dropConstrainedForeignId('conversacion_id');
        });
    }
};
