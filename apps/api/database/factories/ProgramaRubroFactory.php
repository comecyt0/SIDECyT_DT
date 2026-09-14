<?php

namespace Database\Factories;

use App\Models\ProgramaRubro;
use Illuminate\Database\Eloquent\Factories\Factory;

class ProgramaRubroFactory extends Factory
{
    protected $model = ProgramaRubro::class;

    public function definition(): array
    {
        return [
            'clave' => $this->faker->unique()->bothify('???-##'),
            'nombre' => $this->faker->sentence(3),
            'descripcion' => $this->faker->paragraph(),
            'porcentaje_maximo' => $this->faker->numberBetween(10, 50),
            'activo' => true,
        ];
    }
}
