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
        return Solicitud::with(['user', 'empresa', 'convocatoria'])->get();
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
            $solicitud->folio,
            $solicitud->titulo_proyecto,
            $solicitud->user->name,
            $solicitud->empresa->nombre ?? 'N/A',
            $solicitud->convocatoria->nombre ?? 'N/A',
            '$'.number_format($solicitud->monto_solicitado, 2),
            strtoupper($solicitud->estado),
            $solicitud->created_at->format('d/m/Y'),
        ];
    }
}
