<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * 20/10/2026 (E80, reporte del usuario: «en Folios ya tengo registros y aparece en 0») — los clubes de Apoyo en especie
 * también son folios. Pueden publicarse en la página pública igual que las solicitudes (decisión del usuario): la
 * instantánea guarda el club en vez de la solicitud.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('folios_publicados', function (Blueprint $t) {
            $t->foreignId('club_id')->nullable()->after('solicitud_id')->constrained('clubes')->cascadeOnDelete();
            $t->unique(['convocatoria_id', 'club_id']);
        });
        DB::statement('ALTER TABLE folios_publicados ALTER COLUMN solicitud_id DROP NOT NULL');
        DB::statement('ALTER TABLE folios_publicados ADD CONSTRAINT folios_publicados_origen_chk CHECK ((solicitud_id IS NULL) <> (club_id IS NULL))');
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE folios_publicados DROP CONSTRAINT IF EXISTS folios_publicados_origen_chk');
        DB::table('folios_publicados')->whereNull('solicitud_id')->delete();
        DB::statement('ALTER TABLE folios_publicados ALTER COLUMN solicitud_id SET NOT NULL');
        Schema::table('folios_publicados', function (Blueprint $t) {
            $t->dropUnique(['convocatoria_id', 'club_id']);
            $t->dropConstrainedForeignId('club_id');
        });
    }
};
