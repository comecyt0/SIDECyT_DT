<?php

namespace Database\Factories;

use App\Models\ProgramaEtapa;
use Illuminate\Database\Eloquent\Factories\Factory;

class ProgramaEtapaFactory extends Factory
{
    protected $model = ProgramaEtapa::class;

    private static $etapaCounter = 1;

    public function definition(): array
    {
        return [
            'numero_etapa' => self::$etapaCounter++,
            'nombre' => $this->faker->sentence(3),
            'descripcion' => $this->faker->paragraph(),
            'duracion_meses' => $this->faker->numberBetween(1, 12),
            'es_evaluacion_tecnica' => $this->faker->boolean(30),
            'puntaje_minimo' => $this->faker->optional()->numberBetween(60, 80),
            'activo' => true,
        ];
    }

    public function configure(): self
    {
        return $this->afterMaking(function ($model) {
            //
        });
    }
}
