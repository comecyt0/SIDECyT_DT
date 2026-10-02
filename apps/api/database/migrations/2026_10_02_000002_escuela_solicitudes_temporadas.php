<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * E55 (02/10/2026) — Escuelas:
 *  1) Solicitud de registro de escuela: si el líder no encuentra su escuela en el catálogo, la solicita con sus datos y
 *     los de contacto; admin o admin de convocatoria la acepta (puede corregirla) o la rechaza con motivo. Mientras está
 *     pendiente, el líder trabaja su club con la escuela «en revisión» (clubes.escuela_id nulo + escuela_solicitud_id) y
 *     no puede enviarlo; al aceptarla, la escuela se asigna sola a los clubes que la esperaban.
 *  2) Participación previa: marca «ya ha participado» y las temporadas (texto que escribe el admin) como identificador.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('escuela_solicitudes', function (Blueprint $t) {
            $t->id();
            $t->foreignId('user_id')->constrained('users')->cascadeOnDelete();            // líder que la pide
            $t->foreignId('convocatoria_id')->constrained('convocatorias')->cascadeOnDelete(); // alcance del admin de convocatoria
            $t->string('cct', 10);
            $t->string('nombre', 255);
            $t->string('municipio', 120);
            $t->string('nivel', 20);
            $t->string('sistema', 10);
            $t->string('direccion', 300);
            $t->string('telefono', 20);
            $t->string('director', 150);
            $t->string('estado', 12)->default('pendiente');                             // pendiente | aceptada | rechazada
            $t->text('motivo')->nullable();
            $t->foreignId('escuela_id')->nullable()->constrained('escuelas')->nullOnDelete(); // la que se dio de alta
            $t->foreignId('revisado_por')->nullable()->constrained('users')->nullOnDelete();
            $t->timestamp('revisado_at')->nullable();
            $t->timestamps();
            $t->index(['estado', 'created_at']);
            $t->index('cct');
        });
        // Una sola solicitud PENDIENTE por CCT (dos líderes no pueden pedir la misma escuela a la vez).
        DB::statement("CREATE UNIQUE INDEX escuela_solicitudes_cct_pendiente ON escuela_solicitudes (cct) WHERE estado = 'pendiente'");

        Schema::table('clubes', function (Blueprint $t) {
            $t->foreignId('escuela_id')->nullable()->change();
            $t->foreignId('escuela_solicitud_id')->nullable()->after('escuela_id')->constrained('escuela_solicitudes')->nullOnDelete();
        });

        Schema::table('escuelas', function (Blueprint $t) {
            $t->boolean('participo_antes')->default(false)->after('sistema');
            $t->json('temporadas')->nullable()->after('participo_antes');                 // ["2024", "Temporada 2025-2026"]
        });
    }

    public function down(): void
    {
        Schema::table('escuelas', fn (Blueprint $t) => $t->dropColumn(['participo_antes', 'temporadas']));
        Schema::table('clubes', function (Blueprint $t) {
            $t->dropConstrainedForeignId('escuela_solicitud_id');
        });
        Schema::dropIfExists('escuela_solicitudes');
    }
};
