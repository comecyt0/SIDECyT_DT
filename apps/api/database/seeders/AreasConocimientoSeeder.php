<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class AreasConocimientoSeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * @return void
     */
    public function run()
    {
        $areas = [
            'Física, Matemáticas y Ciencias de la Tierra',
            'Biología y Química',
            'Medicina y Ciencias de la Salud',
            'Humanidades y Ciencias de la Conducta',
            'Ciencias Sociales',
            'Biotecnología y Ciencias Agropecuarias',
            'Ingenierías',
            'Investigación Multidisciplinaria',
        ];

        foreach ($areas as $area) {
            DB::table('areas_conocimiento')->updateOrInsert(
                ['nombre' => $area],
                [
                    'descripcion' => 'Área de '.$area,
                    'activo' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]
            );
        }
    }
}
