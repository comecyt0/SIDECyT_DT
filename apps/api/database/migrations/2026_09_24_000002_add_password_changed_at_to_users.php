<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * SEGURIDAD (24/09/2026): momento del último cambio de contraseña. ApiAuthenticate rechaza cualquier JWT emitido
 * ANTES de ese momento: cambiar o restablecer la contraseña cierra las sesiones abiertas en otros equipos (antes un
 * token robado seguía valiendo hasta vencer, y con refresh hasta 14 días).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->timestamp('password_changed_at')->nullable()->after('password');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('password_changed_at');
        });
    }
};
