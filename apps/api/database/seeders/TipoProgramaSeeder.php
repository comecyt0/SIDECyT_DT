<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class TipoProgramaSeeder extends Seeder
{
    public function run(): void
    {
        $tipos = [
            [
                'clave' => 'PFPI',
                'nombre' => 'Pago de Fórmulas de Paridad de Información',
                'descripcion' => 'Reembolso de pagos de IMPI (100% del monto)',
                'tipo_apoyo' => 'reembolso',
                'tiene_etapas' => false,
                'num_etapas' => 1,
                'requiere_evaluacion_tecnica' => false,
                'requiere_fianza' => false,
                'tiene_equipo' => false,
                'monto_maximo' => null,
                'porcentaje_aportacion_solicitante' => 0,
                'puntaje_minimo_aprobatorio' => 0,
            ],
            [
                'clave' => 'PROT',
                'nombre' => 'Programa de Prototipos',
                'descripcion' => 'Apoyo concurrente para desarrollo de prototipos (máx $350,000, 70/30)',
                'tipo_apoyo' => 'concurrente',
                'tiene_etapas' => true,
                'num_etapas' => 2,
                'requiere_evaluacion_tecnica' => true,
                'requiere_fianza' => false,
                'tiene_equipo' => false,
                'monto_maximo' => 350000.00,
                'porcentaje_aportacion_solicitante' => 30,
                'puntaje_minimo_aprobatorio' => 80.00,
            ],
            [
                'clave' => 'IPFE',
                'nombre' => 'Incorporación y Profesionistas Extranjeros',
                'descripcion' => 'Honorarios de profesionistas para incorporación o atracción temporal (máx $500,000)',
                'tipo_apoyo' => 'honorarios',
                'tiene_etapas' => true,
                'num_etapas' => 2,
                'requiere_evaluacion_tecnica' => true,
                'requiere_fianza' => false,
                'tiene_equipo' => false,
                'monto_maximo' => 500000.00,
                'porcentaje_aportacion_solicitante' => 10,
                'puntaje_minimo_aprobatorio' => 80.00,
            ],
            [
                'clave' => 'VINC',
                'nombre' => 'Vinculación de Empresas con IES/CI',
                'descripcion' => 'Apoyo concurrente máx $1,000,000 con vinculación obligatoria IES/CI (requiere fianza 10%)',
                'tipo_apoyo' => 'concurrente',
                'tiene_etapas' => true,
                'num_etapas' => 2,
                'requiere_evaluacion_tecnica' => true,
                'requiere_fianza' => true,
                'porcentaje_fianza' => 10.00,
                'tiene_equipo' => false,
                'monto_maximo' => 1000000.00,
                'porcentaje_aportacion_solicitante' => 10,
                'puntaje_minimo_aprobatorio' => 80.00,
            ],
            [
                'clave' => 'EMP',
                'nombre' => 'Jóvenes Emprendedores e Innovadores',
                'descripcion' => 'Apoyo a emprendedores jóvenes (18-29) en equipos (máx $200,000)',
                'tipo_apoyo' => 'concurrente',
                'tiene_etapas' => true,
                'num_etapas' => 2,
                'requiere_evaluacion_tecnica' => true,
                'requiere_fianza' => false,
                'tiene_equipo' => true,
                'min_miembros_equipo' => 1,
                'max_miembros_equipo' => 5,
                'rango_edad_min' => 18,
                'rango_edad_max' => 29,
                'monto_maximo' => 200000.00,
                'porcentaje_aportacion_solicitante' => 10,
                'puntaje_minimo_aprobatorio' => 80.00,
            ],
        ];

        foreach ($tipos as $tipo) {
            $tipo['activo'] = true;
            $tipo['created_at'] = now();
            $tipo['updated_at'] = now();
            DB::table('tipo_programas')->insertOrIgnore($tipo);
        }
    }
}
