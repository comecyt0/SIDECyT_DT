<?php

namespace Database\Factories;

use App\Models\ProgramaModalidad;
use Illuminate\Database\Eloquent\Factories\Factory;

class ProgramaModalidadFactory extends Factory
{
    protected $model = ProgramaModalidad::class;

    public function definition(): array
    {
        return [
            'clave' => $this->faker->unique()->bothify('????'),
            'nombre' => $this->faker->sentence(2),
            'descripcion' => $this->faker->paragraph(),
            'monto_maximo_especifico' => $this->faker->optional()->numberBetween(20000, 100000),
            'activo' => true,
        ];
    }
}
