<?php

namespace Database\Factories;

use App\Models\ProgramaDocumento;
use Illuminate\Database\Eloquent\Factories\Factory;

class ProgramaDocumentoFactory extends Factory
{
    protected $model = ProgramaDocumento::class;

    public function definition(): array
    {
        return [
            'nombre' => $this->faker->sentence(3),
            'descripcion' => $this->faker->paragraph(),
            'formato_permitido' => $this->faker->randomElement(['PDF', 'DOC', 'DOCX', 'XLSX', 'PDF,DOC']),
            'tamaño_maximo_mb' => $this->faker->randomElement([5, 10, 20]),
            'obligatorio' => $this->faker->boolean(80),
            'orden' => $this->faker->numberBetween(1, 20),
            'activo' => true,
        ];
    }

    public function required(): self
    {
        return $this->state(fn (array $attributes) => [
            'obligatorio' => true,
        ]);
    }

    public function optional(): self
    {
        return $this->state(fn (array $attributes) => [
            'obligatorio' => false,
        ]);
    }
}
