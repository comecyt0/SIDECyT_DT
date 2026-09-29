<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithTitle;

/** Una hoja del reporte: título, encabezados y filas ya saneadas. */
class HojaReporte implements FromArray, WithHeadings, WithTitle, ShouldAutoSize
{
    public function __construct(private string $titulo, private array $encabezados, private array $filas) {}

    public function array(): array
    {
        return $this->filas;
    }

    public function headings(): array
    {
        return $this->encabezados;
    }

    public function title(): string
    {
        return $this->titulo;
    }
}
