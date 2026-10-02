<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// 02/10/2026 — A dónde lleva cada aviso (ruta interna del panel de quien lo recibe; ver App\Support\EnlaceAviso).
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('notificaciones_log', function (Blueprint $table) {
            $table->string('enlace', 255)->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('notificaciones_log', function (Blueprint $table) {
            $table->dropColumn('enlace');
        });
    }
};
