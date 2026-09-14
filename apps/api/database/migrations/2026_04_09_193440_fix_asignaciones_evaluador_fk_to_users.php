<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Fix evaluador_id FK: references evaluadores table → users table
     * The entire codebase uses user.id as evaluador_id, but the original
     * migration pointed to the evaluadores profile table (separate table).
     */
    public function up(): void
    {
        Schema::table('asignaciones_evaluador', function (Blueprint $table) {
            // Drop the unique constraint that includes evaluador_id
            $table->dropUnique(['solicitud_id', 'evaluador_id']);

            // Drop old FK referencing evaluadores table
            $table->dropForeign(['evaluador_id']);

            // Add new FK referencing users table directly
            $table->foreign('evaluador_id')->references('id')->on('users')->cascadeOnDelete();

            // Re-add the unique constraint
            $table->unique(['solicitud_id', 'evaluador_id']);
        });
    }

    public function down(): void
    {
        Schema::table('asignaciones_evaluador', function (Blueprint $table) {
            $table->dropUnique(['solicitud_id', 'evaluador_id']);
            $table->dropForeign(['evaluador_id']);
            $table->foreign('evaluador_id')->references('id')->on('evaluadores')->cascadeOnDelete();
            $table->unique(['solicitud_id', 'evaluador_id']);
        });
    }
};
