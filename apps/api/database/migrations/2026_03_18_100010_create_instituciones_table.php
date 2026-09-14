<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('instituciones', function (Blueprint $table) {
            $table->id();
            $table->string('nombre', 255);
            $table->string('acronimo', 50)->nullable();
            $table->string('tipo', 100)->nullable();           // publica, privada, centro_investigacion
            $table->string('estado', 100)->default('Estado de México');
            $table->string('municipio', 100)->nullable();
            $table->string('direccion')->nullable();
            $table->string('telefono', 20)->nullable();
            $table->string('correo', 255)->nullable();
            $table->string('representante_legal', 255)->nullable();
            $table->boolean('activo')->default(true);
            $table->boolean('en_lista_negra')->default(false);
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('instituciones');
    }
};
