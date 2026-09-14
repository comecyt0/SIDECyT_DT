<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('modalidades', function (Blueprint $table) {
            $table->id();
            $table->string('nombre', 150)->unique();
            $table->text('descripcion')->nullable();
            $table->boolean('activo')->default(true);
            $table->timestamps();
        });

        // Populate with current static values
        DB::table('modalidades')->insert([
            ['nombre' => 'Organización Evento', 'descripcion' => 'Organización de Evento Científico', 'created_at' => now(), 'updated_at' => now()],
            ['nombre' => 'Asistencia Evento', 'descripcion' => 'Asistencia a Evento', 'created_at' => now(), 'updated_at' => now()],
            ['nombre' => 'Publicación', 'descripcion' => 'Publicación Especializada', 'created_at' => now(), 'updated_at' => now()],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('modalidades');
    }
};
