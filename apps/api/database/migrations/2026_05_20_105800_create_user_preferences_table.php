<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_preferences', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            // Identificador del filtro (ej. 'admin.solicitudes', 'revisor.bandeja')
            $table->string('scope', 80);
            $table->string('nombre', 120);
            // JSON con los criterios: {estado, fechaInicio, search, etc.}
            $table->json('filtros');
            $table->boolean('predeterminado')->default(false);
            $table->timestamps();

            $table->unique(['user_id', 'scope', 'nombre'], 'user_pref_unique');
            $table->index(['user_id', 'scope']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_preferences');
    }
};
