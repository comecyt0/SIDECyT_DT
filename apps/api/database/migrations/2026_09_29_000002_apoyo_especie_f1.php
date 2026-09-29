<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * E52 · Fase 1 — Apoyo en especie: catálogo de escuelas, configuración de la modalidad por convocatoria, clubes,
 * integrantes y documentos. Decisiones: docs/APOYO_EN_ESPECIE.md §6 y §11. `tipo_apoyo` ya es texto libre (sin enum):
 * el valor nuevo `especie` solo se agrega a las reglas de validación.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('escuelas', function (Blueprint $table) {
            $table->id();
            $table->string('cct', 10)->unique();                 // Clave de Centro de Trabajo (SEP)
            $table->string('nombre', 255);
            $table->string('municipio', 120);
            $table->string('nivel', 20);                          // primaria | secundaria | media_superior | superior
            $table->string('sistema', 10);                        // estatal | federal
            $table->boolean('activo')->default(true);
            $table->timestamps();
            $table->index(['activo', 'nombre']);
        });

        Schema::create('especie_config', function (Blueprint $table) {
            $table->id();
            $table->foreignId('convocatoria_id')->unique()->constrained('convocatorias')->cascadeOnDelete();
            $table->unsignedSmallInteger('min_integrantes')->default(1);   // incluye al líder
            $table->unsignedSmallInteger('max_integrantes')->default(10);
            $table->unsignedSmallInteger('clubes_por_escuela')->nullable(); // null = sin límite
            $table->boolean('participan_menores')->default(true);
            $table->string('kit_nombre', 255)->nullable();
            $table->text('kit_descripcion')->nullable();
            // Campos predefinidos: {clave: {pedir: bool, obligatorio: bool}}. Nombre del club, escuela y nombre del
            // integrante son fijos (siempre obligatorios) y no se guardan aquí.
            $table->json('campos_club')->nullable();
            $table->json('campos_integrante')->nullable();
            $table->timestamps();
        });

        Schema::create('especie_campos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('convocatoria_id')->constrained('convocatorias')->cascadeOnDelete();
            $table->string('ambito', 12);                         // club | integrante
            $table->string('nombre_campo', 60);
            $table->string('etiqueta', 255);
            $table->string('tipo_campo', 20);                     // text | number | textarea | date | select
            $table->json('opciones_json')->nullable();
            $table->boolean('requerido')->default(false);
            $table->unsignedSmallInteger('orden')->default(0);
            $table->timestamps();
            $table->unique(['convocatoria_id', 'ambito', 'nombre_campo']);
        });

        Schema::create('clubes', function (Blueprint $table) {
            $table->id();
            $table->string('folio', 30)->unique();
            $table->foreignId('convocatoria_id')->constrained('convocatorias')->cascadeOnDelete();
            $table->foreignId('escuela_id')->constrained('escuelas');
            $table->foreignId('lider_id')->constrained('users')->cascadeOnDelete();
            $table->string('nombre', 255);
            $table->string('logo_path', 60)->nullable();
            $table->json('datos')->nullable();                    // campos predefinidos y personalizados del club
            $table->string('estado', 30)->default('borrador');    // borrador | enviado | … (F2)
            $table->timestamp('enviado_at')->nullable();
            $table->timestamps();
            $table->unique(['convocatoria_id', 'lider_id']);      // un club por líder y convocatoria
            $table->index(['convocatoria_id', 'escuela_id']);
        });

        Schema::create('club_integrantes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('club_id')->constrained('clubes')->cascadeOnDelete();
            $table->boolean('es_lider')->default(false);
            $table->string('nombre', 255);
            $table->string('foto_path', 60)->nullable();
            $table->date('fecha_nacimiento')->nullable();
            $table->string('sexo', 1)->nullable();                // H | M | X
            $table->string('curp', 18)->nullable();
            $table->string('grado_grupo', 30)->nullable();
            $table->string('correo', 255)->nullable();
            $table->string('telefono', 20)->nullable();
            $table->json('datos')->nullable();                    // campos personalizados del integrante
            $table->unsignedSmallInteger('orden')->default(0);
            $table->timestamps();
        });

        Schema::create('club_documentos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('club_id')->constrained('clubes')->cascadeOnDelete();
            $table->string('clave', 100);                         // clave de programa_documentos o 'carta_escuela'
            $table->string('nombre_original', 255);
            $table->string('archivo', 60);                        // nombre interno en el disco privado
            $table->foreignId('subido_por')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->unique(['club_id', 'clave']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('club_documentos');
        Schema::dropIfExists('club_integrantes');
        Schema::dropIfExists('clubes');
        Schema::dropIfExists('especie_campos');
        Schema::dropIfExists('especie_config');
        Schema::dropIfExists('escuelas');
    }
};
