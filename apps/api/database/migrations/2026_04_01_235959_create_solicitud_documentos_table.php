<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('solicitud_documentos', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('solicitud_id');
            $table->string('tipo', 50); // identificacion_oficial, comprobante_domicilio, curp, rfc, otros
            $table->string('nombre_original', 255);
            $table->string('url', 500);
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('solicitud_id')->references('id')->on('solicitudes')->onDelete('cascade');
            $table->index('solicitud_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('solicitud_documentos');
    }
};
