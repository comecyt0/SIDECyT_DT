<?php

namespace Database\Seeders;

use App\Models\ProgramaDocumento;
use Illuminate\Database\Seeder;

class ProgramaDocumentosSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        /**
         * PFPI (ID 1) — Pago de Fórmulas de Paridad
         */
        ProgramaDocumento::create([
            'tipo_programa_id' => 1,
            'nombre' => 'Carta de Intención',
            'clave' => 'carta_intencion',
            'descripcion' => 'Carta de intención del proyecto o evento',
            'formato_permitido' => 'PDF',
            'tamaño_maximo_mb' => 5,
            'obligatorio' => true,
            'orden' => 1,
            'activo' => true,
        ]);

        ProgramaDocumento::create([
            'tipo_programa_id' => 1,
            'nombre' => 'Formato de Solicitud PFPI',
            'clave' => 'formato_solicitud_pfpi',
            'descripcion' => 'Formato oficial de solicitud para PFPI',
            'formato_permitido' => 'PDF',
            'tamaño_maximo_mb' => 5,
            'obligatorio' => true,
            'orden' => 2,
            'activo' => true,
        ]);

        /**
         * PROT (ID 2) — Programa de Prototipos
         */
        ProgramaDocumento::create([
            'tipo_programa_id' => 2,
            'nombre' => 'Carta de Intención',
            'clave' => 'carta_intencion',
            'descripcion' => 'Carta de intención del prototipo',
            'formato_permitido' => 'PDF',
            'tamaño_maximo_mb' => 5,
            'obligatorio' => true,
            'orden' => 1,
            'activo' => true,
        ]);

        ProgramaDocumento::create([
            'tipo_programa_id' => 2,
            'nombre' => 'Formato de Solicitud PROT',
            'clave' => 'formato_solicitud_prot',
            'descripcion' => 'Formato oficial de solicitud para Prototipos',
            'formato_permitido' => 'PDF',
            'tamaño_maximo_mb' => 5,
            'obligatorio' => true,
            'orden' => 2,
            'activo' => true,
        ]);

        /**
         * IPFE (ID 3) — Incorporación y Profesionistas Extranjeros
         */
        ProgramaDocumento::create([
            'tipo_programa_id' => 3,
            'nombre' => 'Ficha Técnica',
            'clave' => 'ficha_tecnica',
            'descripcion' => 'Ficha técnica del profesionista o proyecto',
            'formato_permitido' => 'PDF',
            'tamaño_maximo_mb' => 5,
            'obligatorio' => true,
            'orden' => 1,
            'activo' => true,
        ]);

        ProgramaDocumento::create([
            'tipo_programa_id' => 3,
            'nombre' => 'Plan de Trabajo',
            'clave' => 'plan_trabajo',
            'descripcion' => 'Plan detallado de trabajo a realizar',
            'formato_permitido' => 'PDF',
            'tamaño_maximo_mb' => 5,
            'obligatorio' => true,
            'orden' => 2,
            'activo' => true,
        ]);

        ProgramaDocumento::create([
            'tipo_programa_id' => 3,
            'nombre' => 'Presupuesto Detallado',
            'clave' => 'presupuesto_detallado',
            'descripcion' => 'Presupuesto detallado del proyecto',
            'formato_permitido' => 'PDF',
            'tamaño_maximo_mb' => 5,
            'obligatorio' => true,
            'orden' => 3,
            'activo' => true,
        ]);

        ProgramaDocumento::create([
            'tipo_programa_id' => 3,
            'nombre' => 'Carta de Intención',
            'clave' => 'carta_intencion',
            'descripcion' => 'Carta de intención del solicitante',
            'formato_permitido' => 'PDF',
            'tamaño_maximo_mb' => 5,
            'obligatorio' => true,
            'orden' => 4,
            'activo' => true,
        ]);

        ProgramaDocumento::create([
            'tipo_programa_id' => 3,
            'nombre' => 'Escrito Bajo Protesta',
            'clave' => 'escrito_protesta',
            'descripcion' => 'Escrito bajo protesta de decir verdad',
            'formato_permitido' => 'PDF',
            'tamaño_maximo_mb' => 5,
            'obligatorio' => true,
            'orden' => 5,
            'activo' => true,
        ]);

        /**
         * VINC (ID 4) — Vinculación Empresas-IES/CI
         */
        ProgramaDocumento::create([
            'tipo_programa_id' => 4,
            'nombre' => 'Anexo 1 - Convenio Marco',
            'clave' => 'anexo_1',
            'descripcion' => 'Anexo 1 del convenio marco de vinculación',
            'formato_permitido' => 'PDF',
            'tamaño_maximo_mb' => 5,
            'obligatorio' => true,
            'orden' => 1,
            'activo' => true,
        ]);

        ProgramaDocumento::create([
            'tipo_programa_id' => 4,
            'nombre' => 'Anexo 2 - Especificaciones Técnicas',
            'clave' => 'anexo_2',
            'descripcion' => 'Anexo 2 con especificaciones técnicas del proyecto',
            'formato_permitido' => 'PDF',
            'tamaño_maximo_mb' => 5,
            'obligatorio' => true,
            'orden' => 2,
            'activo' => true,
        ]);

        ProgramaDocumento::create([
            'tipo_programa_id' => 4,
            'nombre' => 'Carta de Intención',
            'clave' => 'carta_intencion',
            'descripcion' => 'Carta de intención de la vinculación',
            'formato_permitido' => 'PDF',
            'tamaño_maximo_mb' => 5,
            'obligatorio' => true,
            'orden' => 3,
            'activo' => true,
        ]);

        ProgramaDocumento::create([
            'tipo_programa_id' => 4,
            'nombre' => 'Escrito Bajo Protesta',
            'clave' => 'escrito_protesta',
            'descripcion' => 'Escrito bajo protesta de decir verdad',
            'formato_permitido' => 'PDF',
            'tamaño_maximo_mb' => 5,
            'obligatorio' => true,
            'orden' => 4,
            'activo' => true,
        ]);

        /**
         * EMP (ID 5) — Jóvenes Emprendedores
         */
        ProgramaDocumento::create([
            'tipo_programa_id' => 5,
            'nombre' => 'Diagrama de Actividades',
            'clave' => 'diagrama_actividades',
            'descripcion' => 'Diagrama de actividades del emprendimiento',
            'formato_permitido' => 'PDF',
            'tamaño_maximo_mb' => 5,
            'obligatorio' => true,
            'orden' => 1,
            'activo' => true,
        ]);

        ProgramaDocumento::create([
            'tipo_programa_id' => 5,
            'nombre' => 'Formato de Recepción',
            'clave' => 'formato_recepcion',
            'descripcion' => 'Formato oficial de recepción de solicitud',
            'formato_permitido' => 'PDF',
            'tamaño_maximo_mb' => 5,
            'obligatorio' => true,
            'orden' => 2,
            'activo' => true,
        ]);
    }
}
