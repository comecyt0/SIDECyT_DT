<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('carousel_slides', function (Blueprint $table) {
            $table->id();
            $table->string('titulo', 150);
            $table->string('subtitulo', 200)->nullable();
            $table->text('descripcion')->nullable();
            $table->string('imagen_url')->nullable();
            $table->string('badge_texto', 100)->nullable();
            $table->integer('orden')->default(0);
            $table->boolean('activo')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('carousel_slides');
    }
};
