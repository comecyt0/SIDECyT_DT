<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ConvocatoriasRealesSeeder extends Seeder
{
    /**
     * Crear 5 convocatorias reales para 2026, una por programa
     */
    public function run(): void
    {
        $convocatorias = [
            [
                'nombre' => 'Convocatoria PFPI 2026 - Pago de Fórmulas de Paridad de Información',
                'ejercicio_fiscal' => '2026',
                'descripcion' => 'Apoyo para reembolso de pagos de Fórmulas de Paridad de Información en IMPI (100% reembolso)',
                'fecha_apertura' => '2026-04-01',
                'fecha_cierre' => '2026-10-01',
                'monto_maximo_apoyo' => 100000.00,
                'porcentaje_aportacion_minima' => 0,
                'estado' => 'activa',
                'tipo_programa_id' => 1, // PFPI
            ],
            [
                'nombre' => 'Convocatoria PROT 2026 - Desarrollo de Prototipos',
                'ejercicio_fiscal' => '2026',
                'descripcion' => 'Apoyo para desarrollo de prototipos innovadores con inversión concurrente',
                'fecha_apertura' => '2026-04-01',
                'fecha_cierre' => '2026-10-01',
                'monto_maximo_apoyo' => 350000.00,
                'porcentaje_aportacion_minima' => 30,
                'estado' => 'activa',
                'tipo_programa_id' => 2, // PROT
            ],
            [
                'nombre' => 'Convocatoria IPFE 2026 - Incorporación de Profesionistas Extranjeros',
                'ejercicio_fiscal' => '2026',
                'descripcion' => 'Apoyo de honorarios para incorporación de profesionistas extranjeros o atracción temporal',
                'fecha_apertura' => '2026-04-01',
                'fecha_cierre' => '2026-10-01',
                'monto_maximo_apoyo' => 500000.00,
                'porcentaje_aportacion_minima' => 10,
                'estado' => 'activa',
                'tipo_programa_id' => 3, // IPFE
            ],
            [
                'nombre' => 'Convocatoria VINC 2026 - Vinculación Empresas con IES/CI',
                'ejercicio_fiscal' => '2026',
                'descripcion' => 'Apoyo para proyectos de vinculación entre empresas e instituciones de educación superior',
                'fecha_apertura' => '2026-04-01',
                'fecha_cierre' => '2026-10-01',
                'monto_maximo_apoyo' => 1000000.00,
                'porcentaje_aportacion_minima' => 10,
                'estado' => 'activa',
                'tipo_programa_id' => 4, // VINC
            ],
            [
                'nombre' => 'Convocatoria EMP 2026 - Jóvenes Emprendedores e Innovadores',
                'ejercicio_fiscal' => '2026',
                'descripcion' => 'Apoyo a emprendedores jóvenes (18-29 años) con ideas innovadoras',
                'fecha_apertura' => '2026-04-01',
                'fecha_cierre' => '2026-10-01',
                'monto_maximo_apoyo' => 200000.00,
                'porcentaje_aportacion_minima' => 10,
                'estado' => 'activa',
                'tipo_programa_id' => 5, // EMP
            ],
        ];

        foreach ($convocatorias as $conv) {
            $conv['created_at'] = now();
            $conv['updated_at'] = now();
            DB::table('convocatorias')->insertOrIgnore($conv);
        }
    }
}
