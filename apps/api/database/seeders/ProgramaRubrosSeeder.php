<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ProgramaRubrosSeeder extends Seeder
{
    public function run(): void
    {
        $programas = DB::table('tipo_programas')->get()->keyBy('clave');

        // Vinculación: 8 rubros
        if ($programas->has('VINC')) {
            DB::table('programa_rubros')->insertOrIgnore([
                ['tipo_programa_id' => $programas['VINC']->id, 'clave' => 'VINC_CAP', 'nombre' => 'Capacitación y Entrenamiento', 'descripcion' => 'Cursos, talleres y certificaciones', 'porcentaje_maximo' => null, 'activo' => true, 'created_at' => now(), 'updated_at' => now()],
                ['tipo_programa_id' => $programas['VINC']->id, 'clave' => 'VINC_MAT', 'nombre' => 'Materiales y Reactivos', 'descripcion' => 'Insumos para laboratorio y producción', 'porcentaje_maximo' => null, 'activo' => true, 'created_at' => now(), 'updated_at' => now()],
                ['tipo_programa_id' => $programas['VINC']->id, 'clave' => 'VINC_EQUIP', 'nombre' => 'Equipo Científico y Tecnológico', 'descripcion' => 'Adquisición de equipo especializado', 'porcentaje_maximo' => null, 'activo' => true, 'created_at' => now(), 'updated_at' => now()],
                ['tipo_programa_id' => $programas['VINC']->id, 'clave' => 'VINC_CONS', 'nombre' => 'Consultoría Especializada', 'descripcion' => 'Servicios de asesoramiento técnico', 'porcentaje_maximo' => null, 'activo' => true, 'created_at' => now(), 'updated_at' => now()],
                ['tipo_programa_id' => $programas['VINC']->id, 'clave' => 'VINC_VIATICOS', 'nombre' => 'Viáticos y Transporte', 'descripcion' => 'Gastos de viaje para ejecución del proyecto', 'porcentaje_maximo' => null, 'activo' => true, 'created_at' => now(), 'updated_at' => now()],
                ['tipo_programa_id' => $programas['VINC']->id, 'clave' => 'VINC_LICENCIAS', 'nombre' => 'Licencias y Software', 'descripcion' => 'Software especializado y licencias comerciales', 'porcentaje_maximo' => null, 'activo' => true, 'created_at' => now(), 'updated_at' => now()],
                ['tipo_programa_id' => $programas['VINC']->id, 'clave' => 'VINC_SERVICIOS', 'nombre' => 'Servicios Técnicos', 'descripcion' => 'Servicios de análisis, pruebas y validación', 'porcentaje_maximo' => null, 'activo' => true, 'created_at' => now(), 'updated_at' => now()],
                ['tipo_programa_id' => $programas['VINC']->id, 'clave' => 'VINC_OTROS', 'nombre' => 'Otros Gastos Operativos', 'descripcion' => 'Gastos adicionales justificados para el proyecto', 'porcentaje_maximo' => null, 'activo' => true, 'created_at' => now(), 'updated_at' => now()],
            ]);
        }

        // Prototipos
        if ($programas->has('PROT')) {
            DB::table('programa_rubros')->insertOrIgnore([
                ['tipo_programa_id' => $programas['PROT']->id, 'clave' => 'PROT_MATERIALES', 'nombre' => 'Materiales y Componentes', 'descripcion' => 'Materiales para construcción del prototipo', 'porcentaje_maximo' => null, 'activo' => true, 'created_at' => now(), 'updated_at' => now()],
                ['tipo_programa_id' => $programas['PROT']->id, 'clave' => 'PROT_EQUIPO', 'nombre' => 'Equipo Especializado', 'descripcion' => 'Herramientas y máquinas para manufactura', 'porcentaje_maximo' => null, 'activo' => true, 'created_at' => now(), 'updated_at' => now()],
                ['tipo_programa_id' => $programas['PROT']->id, 'clave' => 'PROT_SERVICIOS', 'nombre' => 'Servicios de Manufactura', 'descripcion' => 'Subcontratación de procesos especializados', 'porcentaje_maximo' => null, 'activo' => true, 'created_at' => now(), 'updated_at' => now()],
                ['tipo_programa_id' => $programas['PROT']->id, 'clave' => 'PROT_DISEÑO', 'nombre' => 'Diseño Profesional', 'descripcion' => 'Honorarios para diseño del prototipo', 'porcentaje_maximo' => null, 'activo' => true, 'created_at' => now(), 'updated_at' => now()],
                ['tipo_programa_id' => $programas['PROT']->id, 'clave' => 'PROT_VALIDACION', 'nombre' => 'Validación y Pruebas', 'descripcion' => 'Pruebas de funcionalidad y seguridad', 'porcentaje_maximo' => null, 'activo' => true, 'created_at' => now(), 'updated_at' => now()],
            ]);
        }

        // IPFE
        if ($programas->has('IPFE')) {
            DB::table('programa_rubros')->insertOrIgnore([
                ['tipo_programa_id' => $programas['IPFE']->id, 'clave' => 'IPFE_HONORARIOS', 'nombre' => 'Honorarios Profesional', 'descripcion' => 'Pago de honorarios del profesionista', 'porcentaje_maximo' => null, 'activo' => true, 'created_at' => now(), 'updated_at' => now()],
                ['tipo_programa_id' => $programas['IPFE']->id, 'clave' => 'IPFE_PRESTACIONES', 'nombre' => 'Prestaciones y Seguro', 'descripcion' => 'Seguro de salud y prestaciones sociales', 'porcentaje_maximo' => null, 'activo' => true, 'created_at' => now(), 'updated_at' => now()],
                ['tipo_programa_id' => $programas['IPFE']->id, 'clave' => 'IPFE_VIVIENDA', 'nombre' => 'Apoyo de Vivienda', 'descripcion' => 'Apoyo para vivienda temporal en incorporación', 'porcentaje_maximo' => null, 'activo' => true, 'created_at' => now(), 'updated_at' => now()],
                ['tipo_programa_id' => $programas['IPFE']->id, 'clave' => 'IPFE_CAPACITACION', 'nombre' => 'Capacitación', 'descripcion' => 'Cursos y adiestramiento en el sector', 'porcentaje_maximo' => null, 'activo' => true, 'created_at' => now(), 'updated_at' => now()],
            ]);
        }

        // Emprendedores
        if ($programas->has('EMP')) {
            DB::table('programa_rubros')->insertOrIgnore([
                ['tipo_programa_id' => $programas['EMP']->id, 'clave' => 'EMP_CAPITAL', 'nombre' => 'Capital de Trabajo', 'descripcion' => 'Fondo para operación inicial del negocio', 'porcentaje_maximo' => null, 'activo' => true, 'created_at' => now(), 'updated_at' => now()],
                ['tipo_programa_id' => $programas['EMP']->id, 'clave' => 'EMP_EQUIPO', 'nombre' => 'Equipo Operativo', 'descripcion' => 'Máquinas y herramientas para operación', 'porcentaje_maximo' => null, 'activo' => true, 'created_at' => now(), 'updated_at' => now()],
                ['tipo_programa_id' => $programas['EMP']->id, 'clave' => 'EMP_CAPACITACION', 'nombre' => 'Capacitación Empresarial', 'descripcion' => 'Cursos de gestión y administración', 'porcentaje_maximo' => null, 'activo' => true, 'created_at' => now(), 'updated_at' => now()],
                ['tipo_programa_id' => $programas['EMP']->id, 'clave' => 'EMP_ASESORÍA', 'nombre' => 'Asesoría Empresarial', 'descripcion' => 'Consultoría especializada en negocios', 'porcentaje_maximo' => null, 'activo' => true, 'created_at' => now(), 'updated_at' => now()],
                ['tipo_programa_id' => $programas['EMP']->id, 'clave' => 'EMP_OTROS', 'nombre' => 'Otros Rubros Autorizados', 'descripcion' => 'Gastos operativos según normativa', 'porcentaje_maximo' => null, 'activo' => true, 'created_at' => now(), 'updated_at' => now()],
            ]);
        }
    }
}
