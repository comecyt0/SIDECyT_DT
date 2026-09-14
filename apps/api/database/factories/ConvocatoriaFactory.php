<?php

namespace Database\Factories;

use App\Models\Convocatoria;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Convocatoria>
 */
class ConvocatoriaFactory extends Factory
{
    protected $model = Convocatoria::class;

    public function definition(): array
    {
        $apertura = fake()->dateTimeBetween('-30 days', '-5 days');
        $cierre = fake()->dateTimeBetween('+1 month', '+2 months');

        return [
            'nombre' => fake()->sentence(4),
            'ejercicio_fiscal' => (string) fake()->year(),
            'descripcion' => fake()->paragraph(),
            'fecha_apertura' => $apertura->format('Y-m-d'),
            'fecha_cierre' => $cierre->format('Y-m-d'),
            'monto_maximo_apoyo' => 60000.00,
            'porcentaje_aportacion_minima' => 10.00,
            'estado' => 'borrador',
            'tipo_programa_id' => null,
            'numero_convocatoria' => fake()->numberBetween(1, 100),
            'fecha_limite_informe' => null,
            'created_at' => now(),
            'updated_at' => now(),
        ];
    }

    public function activa(): static
    {
        return $this->state([
            'estado' => 'activa',
        ]);
    }

    public function cerrada(): static
    {
        return $this->state([
            'estado' => 'cerrada',
        ]);
    }

    public function conTipoPrograma($tipoProgramaId): static
    {
        return $this->state([
            'tipo_programa_id' => $tipoProgramaId,
        ]);
    }
}
