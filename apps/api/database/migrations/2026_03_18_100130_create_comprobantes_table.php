<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('comprobantes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ministracion_id')->constrained('ministraciones')->cascadeOnDelete();
            $table->string('tipo', 50); // transporte, hospedaje, comida
            $table->decimal('monto', 10, 2);
            $table->string('archivo_pdf_url')->nullable();
            $table->string('archivo_xml_url')->nullable();
            $table->boolean('validado')->default(false);
            $table->text('notas')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('comprobantes');
    }
};
