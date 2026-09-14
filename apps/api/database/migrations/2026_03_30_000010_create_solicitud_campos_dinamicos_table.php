<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('solicitud_campos_dinamicos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('solicitud_id')->constrained('solicitudes')->cascadeOnDelete();
            $table->foreignId('programa_campo_id')->constrained('programa_campos')->cascadeOnDelete();

            $table->text('valor_texto')->nullable();
            $table->decimal('valor_numero', 12, 2)->nullable();
            $table->date('valor_fecha')->nullable();
            $table->json('valor_json')->nullable();
            $table->timestamps();

            $table->unique(['solicitud_id', 'programa_campo_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('solicitud_campos_dinamicos');
    }
};
