<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ProgramaEtapasSeeder extends Seeder
{
    public function run(): void
    {
        $programas = DB::table('tipo_programas')->get()->keyBy('clave');

        // Prototipos: 2 etapas
        if ($programas->has('PROT')) {
            DB::table('programa_etapas')->insertOrIgnore([
                [
                    'tipo_programa_id' => $programas['PROT']->id,
                    'numero_etapa' => 1,
                    'nombre' => 'Etapa 1: Desarrollo del Prototipo',
                    'descripcion' => 'Fase inicial de 3 meses de desarrollo técnico',
                    'duracion_meses' => 3,
                    'es_evaluacion_tecnica' => true,
                    'puntaje_minimo' => 80.00,
                    'activo' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ],
                [
                    'tipo_programa_id' => $programas['PROT']->id,
                    'numero_etapa' => 2,
                    'nombre' => 'Etapa 2: Seguimiento y Validación',
                    'descripcion' => 'Fase de 9 meses de validación y mejora del prototipo',
                    'duracion_meses' => 9,
                    'es_evaluacion_tecnica' => false,
                    'puntaje_minimo' => null,
                    'activo' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ],
            ]);
        }

        // IPFE: 2 etapas
        if ($programas->has('IPFE')) {
            DB::table('programa_etapas')->insertOrIgnore([
                [
                    'tipo_programa_id' => $programas['IPFE']->id,
                    'numero_etapa' => 1,
                    'nombre' => 'Etapa 1: Evaluación Curricular',
                    'descripcion' => 'Revisión de credenciales académicas y profesionales',
                    'duracion_meses' => null,
                    'es_evaluacion_tecnica' => true,
                    'puntaje_minimo' => 80.00,
                    'activo' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ],
                [
                    'tipo_programa_id' => $programas['IPFE']->id,
                    'numero_etapa' => 2,
                    'nombre' => 'Etapa 2: Seguimiento de Actividades',
                    'descripcion' => 'Monitoreo de cumplimiento de metas',
                    'duracion_meses' => null,
                    'es_evaluacion_tecnica' => false,
                    'puntaje_minimo' => null,
                    'activo' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ],
            ]);
        }

        // Vinculación: 2 etapas
        if ($programas->has('VINC')) {
            DB::table('programa_etapas')->insertOrIgnore([
                [
                    'tipo_programa_id' => $programas['VINC']->id,
                    'numero_etapa' => 1,
                    'nombre' => 'Etapa 1: Evaluación de Propuesta',
                    'descripcion' => 'Evaluación técnica con 11 criterios (de viabilidad, impacto, etc)',
                    'duracion_meses' => null,
                    'es_evaluacion_tecnica' => true,
                    'puntaje_minimo' => 80.00,
                    'activo' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ],
                [
                    'tipo_programa_id' => $programas['VINC']->id,
                    'numero_etapa' => 2,
                    'nombre' => 'Etapa 2: Evaluación de Resultados',
                    'descripcion' => 'Revisión de avances y resultados con 10 criterios',
                    'duracion_meses' => null,
                    'es_evaluacion_tecnica' => true,
                    'puntaje_minimo' => 80.00,
                    'activo' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ],
            ]);
        }

        // Emprendedores: 2 etapas
        if ($programas->has('EMP')) {
            DB::table('programa_etapas')->insertOrIgnore([
                [
                    'tipo_programa_id' => $programas['EMP']->id,
                    'numero_etapa' => 1,
                    'nombre' => 'Etapa 1: Validación del Modelo de Negocio',
                    'descripcion' => 'Fase inicial de 4 meses para validación del concepto',
                    'duracion_meses' => 4,
                    'es_evaluacion_tecnica' => true,
                    'puntaje_minimo' => 80.00,
                    'activo' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ],
                [
                    'tipo_programa_id' => $programas['EMP']->id,
                    'numero_etapa' => 2,
                    'nombre' => 'Etapa 2: Implementación y Crecimiento',
                    'descripcion' => 'Fase de 8 meses de implementación y escalamiento',
                    'duracion_meses' => 8,
                    'es_evaluacion_tecnica' => false,
                    'puntaje_minimo' => null,
                    'activo' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ],
            ]);
        }

        // PFPI: 1 sola etapa
        if ($programas->has('PFPI')) {
            DB::table('programa_etapas')->insertOrIgnore([
                [
                    'tipo_programa_id' => $programas['PFPI']->id,
                    'numero_etapa' => 1,
                    'nombre' => 'Trámite de Reembolso',
                    'descripcion' => 'Procesamiento documental y reembolso administrativo',
                    'duracion_meses' => null,
                    'es_evaluacion_tecnica' => false,
                    'puntaje_minimo' => null,
                    'activo' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ],
            ]);
        }
    }
}
