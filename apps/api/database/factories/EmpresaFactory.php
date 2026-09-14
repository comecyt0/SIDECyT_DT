<?php

namespace Database\Factories;

use App\Models\Empresa;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Institucion>
 */
class EmpresaFactory extends Factory
{
    protected $model = Empresa::class;

    public function definition(): array
    {
        return [
            'nombre' => fake()->company(),
            'acronimo' => fake()->lexify('????'),
            'tipo' => fake()->randomElement(['publica', 'privada', 'centro_investigacion']),
            'estado' => 'Estado de México',
            'municipio' => fake()->word(),
            'direccion' => fake()->streetAddress(),
            'telefono' => fake()->phoneNumber(),
            'correo' => fake()->companyEmail(),
            'representante_legal' => fake()->name(),
            'activo' => true,
            'en_lista_negra' => false,
            'created_at' => now(),
            'updated_at' => now(),
        ];
    }

    public function bloqueada(): static
    {
        return $this->state([
            'en_lista_negra' => true,
        ]);
    }

    public function inactiva(): static
    {
        return $this->state([
            'activo' => false,
        ]);
    }
}
