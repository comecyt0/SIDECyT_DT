<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * E90 (20/10/2026, reporte del usuario: «al editar datos, los formatos se quedan con una versión») — Cuándo cambiaron por
 * última vez los datos que llenan los formatos (club, escuela elegida, integrantes, salida del transporte, perfil de
 * kit). Un documento firmado subido antes de ese momento se marca «Desactualizado» para volver a descargarlo y subirlo.
 * No se usa `updated_at` porque cambia también al enviar, revisar o habilitar el QR.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('clubes', function (Blueprint $t) {
            $t->timestamp('datos_cambiados_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('clubes', fn (Blueprint $t) => $t->dropColumn('datos_cambiados_at'));
    }
};
