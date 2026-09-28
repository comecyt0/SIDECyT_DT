<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * E50 (28/09/2026) — Encuadre de las imágenes del carrusel del login (pedido del usuario: "que se visualicen
 * completas"). Antes toda imagen se pintaba con object-cover al 55 % de opacidad: los banners anchos (4.5:1) quedaban
 * recortados en el panel vertical y los logos se agrandaban hasta verse borrosos.
 *
 * - ajuste: completa (se ve entera, sobre un fondo) | recorte (llena el panel, con punto de enfoque y zoom)
 * - foco_x / foco_y (0–100 %) y zoom (100–300 %): solo en "recorte"
 * - fondo: desenfoque (la misma imagen difuminada) | claro | vino — solo en "completa"
 * - margen (0–30 %): aire alrededor de la imagen en "completa" (logos)
 * - mostrar_textos: tarjeta con título/subtítulo/descripción encima (los flyers ya traen su propio texto)
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('carousel_slides', function (Blueprint $t) {
            $t->string('ajuste', 10)->default('completa');
            $t->unsignedTinyInteger('foco_x')->default(50);
            $t->unsignedTinyInteger('foco_y')->default(50);
            $t->unsignedSmallInteger('zoom')->default(100);
            $t->string('fondo', 12)->default('desenfoque');
            $t->unsignedTinyInteger('margen')->default(0);
            $t->boolean('mostrar_textos')->default(true);
        });

        // Los banners ya existentes son flyers anchos con su propio texto: completos y sin la tarjeta encima.
        DB::table('carousel_slides')->whereNotNull('imagen_url')->update(['ajuste' => 'completa', 'fondo' => 'desenfoque']);
    }

    public function down(): void
    {
        Schema::table('carousel_slides', function (Blueprint $t) {
            $t->dropColumn(['ajuste', 'foco_x', 'foco_y', 'zoom', 'fondo', 'margen', 'mostrar_textos']);
        });
    }
};
