<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('audit_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();

            // Acción: ej 'solicitud.aprobada', 'convenio.creado', 'ministracion.pagada'
            $table->string('action', 80)->index();

            // Modelo afectado: ej 'App\Models\Solicitud', y su id
            $table->string('subject_type', 100)->nullable()->index();
            $table->unsignedBigInteger('subject_id')->nullable()->index();

            // Contexto adicional (request, diff, etc.)
            $table->json('metadata')->nullable();

            $table->string('ip', 45)->nullable();
            $table->string('user_agent', 255)->nullable();

            $table->timestamp('created_at')->useCurrent();

            // Composite index para queries comunes
            $table->index(['subject_type', 'subject_id', 'created_at'], 'audit_subject_time_idx');
            $table->index(['user_id', 'created_at'], 'audit_user_time_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
    }
};
