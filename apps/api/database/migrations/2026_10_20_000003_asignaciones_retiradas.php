<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * E85 (20/10/2026, regla del usuario: «solo el administrador elimina; el resto solo desactiva») — El admin de
 * convocatoria ya no borra una asignación de evaluador: la retira. La fila se conserva con quién y cuándo; el modelo la
 * oculta en todas las consultas (scope global) y, si se vuelve a asignar a la misma persona, se reactiva.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('asignaciones_evaluador', function (Blueprint $t) {
            $t->timestamp('retirada_at')->nullable();
            $t->unsignedBigInteger('retirada_por')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('asignaciones_evaluador', fn (Blueprint $t) => $t->dropColumn(['retirada_at', 'retirada_por']));
    }
};
