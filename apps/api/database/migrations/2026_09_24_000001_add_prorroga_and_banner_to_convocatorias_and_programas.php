<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * 24/09/2026 — Prórroga de convocatorias y banner (imagen representativa) para convocatorias y programas.
 * Ver CLAUDE.md E40.
 *
 * - `fecha_prorroga`: nueva fecha límite. La fecha de cierre efectiva es COALESCE(fecha_prorroga, fecha_cierre);
 *   `fecha_cierre` conserva la original para mostrar "con prórroga" y para la auditoría.
 * - `banner_url`: ruta relativa `/storage/banners/...` (subida desde el panel) o URL https de un dominio
 *   institucional autorizado (config comecyt.banner_hosts, alineado con la CSP img-src).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('convocatorias', function (Blueprint $table) {
            $table->date('fecha_prorroga')->nullable()->after('fecha_cierre');
            $table->string('motivo_prorroga', 500)->nullable()->after('fecha_prorroga');
            $table->timestamp('prorroga_at')->nullable()->after('motivo_prorroga');
            $table->foreignId('prorroga_por')->nullable()->after('prorroga_at')->constrained('users')->nullOnDelete();
            $table->string('banner_url', 500)->nullable()->after('descripcion');
        });

        Schema::table('tipo_programas', function (Blueprint $table) {
            $table->string('banner_url', 500)->nullable()->after('descripcion');
        });
    }

    public function down(): void
    {
        Schema::table('convocatorias', function (Blueprint $table) {
            $table->dropConstrainedForeignId('prorroga_por');
            $table->dropColumn(['fecha_prorroga', 'motivo_prorroga', 'prorroga_at', 'banner_url']);
        });

        Schema::table('tipo_programas', function (Blueprint $table) {
            $table->dropColumn('banner_url');
        });
    }
};
