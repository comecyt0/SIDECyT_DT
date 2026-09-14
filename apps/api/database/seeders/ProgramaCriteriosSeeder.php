<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ProgramaCriteriosSeeder extends Seeder
{
    public function run(): void
    {
        $programas = DB::table('tipo_programas')->get()->keyBy('clave');
        $etapas = DB::table('programa_etapas')->get()->groupBy('tipo_programa_id');

        // Vinculación Etapa 1: 11 criterios
        if ($programas->has('VINC') && isset($etapas[$programas['VINC']->id])) {
            $vincEtapa1 = $etapas[$programas['VINC']->id]->firstWhere('numero_etapa', 1);
            if ($vincEtapa1) {
                $criterios_vinc_etapa1 = [
                    ['nombre' => 'Viabilidad Técnica', 'ponderacion' => 9.09],
                    ['nombre' => 'Impacto Económico', 'ponderacion' => 9.09],
                    ['nombre' => 'Innovación', 'ponderacion' => 9.09],
                    ['nombre' => 'Alineación Estratégica', 'ponderacion' => 9.09],
                    ['nombre' => 'Fortaleza del Equipo', 'ponderacion' => 9.09],
                    ['nombre' => 'Cumplimiento de Requisitos', 'ponderacion' => 9.09],
                    ['nombre' => 'Sostenibilidad', 'ponderacion' => 9.09],
                    ['nombre' => 'Vinculación IES/CI', 'ponderacion' => 9.09],
                    ['nombre' => 'Retorno Social', 'ponderacion' => 9.09],
                    ['nombre' => 'Presupuesto Justificado', 'ponderacion' => 9.09],
                    ['nombre' => 'Transparencia Financiera', 'ponderacion' => 9.09],
                ];

                foreach ($criterios_vinc_etapa1 as $key => $criterio) {
                    DB::table('programa_criterios_evaluacion')->insertOrIgnore([
                        [
                            'tipo_programa_id' => $programas['VINC']->id,
                            'etapa_id' => $vincEtapa1->id,
                            'nombre' => $criterio['nombre'],
                            'descripcion' => 'Criterio de evaluación',
                            'ponderacion' => $criterio['ponderacion'],
                            'puntaje_maximo' => 100,
                            'orden' => $key + 1,
                            'activo' => true,
                            'created_at' => now(),
                            'updated_at' => now(),
                        ],
                    ]);
                }
            }
        }

        // Vinculación Etapa 2: 10 criterios
        if ($programas->has('VINC') && isset($etapas[$programas['VINC']->id])) {
            $vincEtapa2 = $etapas[$programas['VINC']->id]->firstWhere('numero_etapa', 2);
            if ($vincEtapa2) {
                $criterios_vinc_etapa2 = [
                    ['nombre' => 'Cumplimiento de Metas', 'ponderacion' => 10.00],
                    ['nombre' => 'Calidad de Resultados', 'ponderacion' => 10.00],
                    ['nombre' => 'Documentación Completa', 'ponderacion' => 10.00],
                    ['nombre' => 'Informes Técnicos', 'ponderacion' => 10.00],
                    ['nombre' => 'Transparencia de Recursos', 'ponderacion' => 10.00],
                    ['nombre' => 'Publicaciones/Patentes', 'ponderacion' => 10.00],
                    ['nombre' => 'Capacitación Proporcionada', 'ponderacion' => 10.00],
                    ['nombre' => 'Continuidad del Proyecto', 'ponderacion' => 10.00],
                    ['nombre' => 'Impacto Verificable', 'ponderacion' => 10.00],
                    ['nombre' => 'Reporte Final Satisfactorio', 'ponderacion' => 10.00],
                ];

                foreach ($criterios_vinc_etapa2 as $key => $criterio) {
                    DB::table('programa_criterios_evaluacion')->insertOrIgnore([
                        [
                            'tipo_programa_id' => $programas['VINC']->id,
                            'etapa_id' => $vincEtapa2->id,
                            'nombre' => $criterio['nombre'],
                            'descripcion' => 'Criterio de evaluación',
                            'ponderacion' => $criterio['ponderacion'],
                            'puntaje_maximo' => 100,
                            'orden' => $key + 1,
                            'activo' => true,
                            'created_at' => now(),
                            'updated_at' => now(),
                        ],
                    ]);
                }
            }
        }

        // Prototipos Etapa 1: 4 criterios
        if ($programas->has('PROT') && isset($etapas[$programas['PROT']->id])) {
            $protEtapa1 = $etapas[$programas['PROT']->id]->firstWhere('numero_etapa', 1);
            if ($protEtapa1) {
                $criterios_prot = [
                    ['nombre' => 'Viabilidad Técnica', 'ponderacion' => 25.00],
                    ['nombre' => 'Potencial de Impacto', 'ponderacion' => 25.00],
                    ['nombre' => 'Innovación', 'ponderacion' => 25.00],
                    ['nombre' => 'Factibilidad Financiera', 'ponderacion' => 25.00],
                ];

                foreach ($criterios_prot as $key => $criterio) {
                    DB::table('programa_criterios_evaluacion')->insertOrIgnore([
                        [
                            'tipo_programa_id' => $programas['PROT']->id,
                            'etapa_id' => $protEtapa1->id,
                            'nombre' => $criterio['nombre'],
                            'descripcion' => 'Criterio de evaluación para Etapa 1 de Prototipos',
                            'ponderacion' => $criterio['ponderacion'],
                            'puntaje_maximo' => 100,
                            'orden' => $key + 1,
                            'activo' => true,
                            'created_at' => now(),
                            'updated_at' => now(),
                        ],
                    ]);
                }
            }
        }
    }
}
