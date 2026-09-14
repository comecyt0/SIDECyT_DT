<?php

namespace Database\Factories;

use App\Models\TipoPrograma;
use Illuminate\Database\Eloquent\Factories\Factory;

class TipoProgramaFactory extends Factory
{
    protected $model = TipoPrograma::class;

    public function definition(): array
    {
        return [
            'clave' => $this->faker->unique()->bothify('???'),
            'nombre' => $this->faker->sentence(4),
            'descripcion' => $this->faker->paragraph(),
            'tipo_apoyo' => $this->faker->randomElement(['reembolso', 'concurrente', 'honorarios']),
            'tiene_etapas' => $this->faker->boolean(50),
            'num_etapas' => $this->faker->numberBetween(1, 3),
            'requiere_evaluacion_tecnica' => $this->faker->boolean(80),
            'requiere_fianza' => $this->faker->boolean(30),
            'porcentaje_fianza' => $this->faker->optional()->numberBetween(5, 20),
            'tiene_equipo' => $this->faker->boolean(50),
            'min_miembros_equipo' => $this->faker->optional()->numberBetween(1, 5),
            'max_miembros_equipo' => $this->faker->optional()->numberBetween(5, 20),
            'rango_edad_min' => $this->faker->optional()->numberBetween(18, 30),
            'rango_edad_max' => $this->faker->optional()->numberBetween(30, 65),
            'monto_maximo' => $this->faker->numberBetween(50000, 500000),
            'porcentaje_aportacion_solicitante' => $this->faker->numberBetween(10, 50),
            'puntaje_minimo_aprobatorio' => $this->faker->numberBetween(70, 90),
            'activo' => true,
        ];
    }
}
