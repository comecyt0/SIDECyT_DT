<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * E47 (24/09/2026): borradores del asistente "Nueva convocatoria". Guardan lo capturado (JSON del asistente) para no
 * perderlo si falla el guardado, se cierra la pestaña o se cambia de equipo. Son de quien los crea; no se publican.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('convocatoria_borradores', function (Blueprint $t) {
            $t->id();
            $t->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $t->string('nombre', 255)->nullable();
            $t->unsignedSmallInteger('paso')->default(1);
            $t->jsonb('datos');
            $t->timestamps();
            $t->index(['user_id', 'updated_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('convocatoria_borradores');
    }
};
