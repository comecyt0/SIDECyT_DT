<?php

namespace Database\Factories;

use App\Models\ProgramaCampo;
use Illuminate\Database\Eloquent\Factories\Factory;

class ProgramaCampoFactory extends Factory
{
    protected $model = ProgramaCampo::class;

    public function definition(): array
    {
        return [
            'nombre_campo' => $this->faker->unique()->slug(),
            'etiqueta' => $this->faker->sentence(3),
            'tipo_campo' => $this->faker->randomElement(['text', 'number', 'select', 'date', 'textarea', 'file']),
            'opciones_json' => null,
            'reglas_validacion_json' => null,
            'orden' => $this->faker->numberBetween(1, 20),
            'requerido' => $this->faker->boolean(80),
            'activo' => true,
        ];
    }

    public function withOptions(array $options): self
    {
        return $this->state(fn (array $attributes) => [
            'opciones_json' => $options,
        ]);
    }

    public function withRules(array $rules): self
    {
        return $this->state(fn (array $attributes) => [
            'reglas_validacion_json' => $rules,
        ]);
    }

    public function optional(): self
    {
        return $this->state(fn (array $attributes) => [
            'requerido' => false,
        ]);
    }
}
