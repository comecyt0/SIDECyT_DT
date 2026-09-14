<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ProgramaModalidadesSeeder extends Seeder
{
    public function run(): void
    {
        $programas = DB::table('tipo_programas')->get()->keyBy('clave');

        // IPFE: 2 modalidades
        if ($programas->has('IPFE')) {
            DB::table('programa_modalidades')->insertOrIgnore([
                [
                    'tipo_programa_id' => $programas['IPFE']->id,
                    'clave' => 'IPFE_A',
                    'nombre' => 'Modalidad A: Incorporación',
                    'descripcion' => 'Incorporación de profesionistas extranjeros a instituciones mexicanas',
                    'monto_maximo_especifico' => null,
                    'activo' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ],
                [
                    'tipo_programa_id' => $programas['IPFE']->id,
                    'clave' => 'IPFE_B',
                    'nombre' => 'Modalidad B: Atracción Temporal',
                    'descripcion' => 'Contratación temporal de profesionistas extranjeros (máx $500,000)',
                    'monto_maximo_especifico' => 500000.00,
                    'activo' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ],
            ]);
        }

        // Vinculación: 2 modalidades
        if ($programas->has('VINC')) {
            DB::table('programa_modalidades')->insertOrIgnore([
                [
                    'tipo_programa_id' => $programas['VINC']->id,
                    'clave' => 'VINC_ART25_I',
                    'nombre' => 'Artículo 25 Fracción I',
                    'descripcion' => 'Vinculación de empresas con instituciones de educación superior',
                    'monto_maximo_especifico' => null,
                    'activo' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ],
                [
                    'tipo_programa_id' => $programas['VINC']->id,
                    'clave' => 'VINC_ART25_II',
                    'nombre' => 'Artículo 25 Fracción II',
                    'descripcion' => 'Vinculación de empresas con centros de investigación',
                    'monto_maximo_especifico' => null,
                    'activo' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ],
            ]);
        }
    }
}
