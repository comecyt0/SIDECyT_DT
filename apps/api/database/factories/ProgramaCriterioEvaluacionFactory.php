<?php

namespace Database\Factories;

use App\Models\ProgramaCriterioEvaluacion;
use Illuminate\Database\Eloquent\Factories\Factory;

class ProgramaCriterioEvaluacionFactory extends Factory
{
    protected $model = ProgramaCriterioEvaluacion::class;

    public function definition(): array
    {
        return [
            'nombre' => $this->faker->sentence(3),
            'descripcion' => $this->faker->paragraph(),
            'ponderacion' => $this->faker->numberBetween(5, 25),
            'puntaje_maximo' => 100,
            'orden' => $this->faker->numberBetween(1, 10),
            'activo' => true,
        ];
    }

    public function withPonderacion($ponderacion): self
    {
        return $this->state(fn (array $attributes) => [
            'ponderacion' => $ponderacion,
        ]);
    }
}
