<?php

namespace App\Exports;

use App\Models\Solicitud;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;

class SolicitudesExport implements FromCollection, WithHeadings, WithMapping
{
    /**
     * @return Collection
     */
    public function collection()
    {
        return Solicitud::with(['user:id,name', 'empresa:id,nombre', 'convocatoria:id,nombre'])->get();
    }

    public function headings(): array
    {
        return [
            'Folio',
            'Proyecto',
            'Solicitante',
            'Institución',
            'Convocatoria',
            'Monto Solicitado',
            'Estado',
            'Fecha Registro',
        ];
    }

    public function map($solicitud): array
    {
        return [
            self::celda($solicitud->folio),
            self::celda($solicitud->titulo_proyecto),
            self::celda($solicitud->user?->name),
            self::celda($solicitud->empresa?->nombre ?? 'N/A'),
            self::celda($solicitud->convocatoria?->nombre ?? 'N/A'),
            '$'.number_format((float) $solicitud->monto_solicitado, 2),
            strtoupper((string) $solicitud->estado),
            $solicitud->created_at?->format('d/m/Y'),
        ];
    }

    /**
     * SEGURIDAD (24/09/2026): inyección de fórmulas (CSV/Excel injection). Un solicitante que titula su proyecto
     * `=HYPERLINK("https://sitio-malo", "Ver")` hacía que la fórmula se ejecutara en el Excel del admin. Todo texto
     * que empiece con = + - @ tabulador o retorno se antepone con un apóstrofo: Excel lo muestra como texto.
     */
    public static function celda(?string $valor): string
    {
        $valor = (string) $valor;

        return preg_match('/^[=+\-@\t\r]/', $valor) ? "'".$valor : $valor;
    }
}
