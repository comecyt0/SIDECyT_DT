<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithCustomStartCell;
use Maatwebsite\Excel\Concerns\WithDrawings;
use Maatwebsite\Excel\Concerns\WithEvents;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithTitle;
use Maatwebsite\Excel\Events\AfterSheet;
use PhpOffice\PhpSpreadsheet\Worksheet\Drawing;

/**
 * E81 (20/10/2026, pedido del usuario: «respetando la estructura de los formatos y logos») — Hoja de Excel institucional:
 * franja de convivencia arriba, título, filtros y fecha, y encabezados en vino. Las filas llegan ya saneadas contra
 * inyección de fórmulas (SolicitudesExport::celda). La usan Folios y el Historial de acciones.
 */
class ReporteInstitucional implements FromArray, WithHeadings, WithTitle, WithCustomStartCell, WithDrawings, WithEvents
{
    private const FILA_ENCABEZADOS = 6;

    public function __construct(
        private string $hoja, private string $titulo, private string $filtros, private \Carbon\CarbonInterface $fecha,
        private array $encabezados, private array $filas,
    ) {}

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
        return mb_substr(preg_replace('/[\\\\\/\?\*\[\]:]/', ' ', $this->hoja), 0, 31);
    }

    public function startCell(): string
    {
        return 'A'.self::FILA_ENCABEZADOS;
    }

    public function drawings()
    {
        $ruta = base_path('../web/public/identidad/convivencia-color.png');
        if (! is_file($ruta)) {
            return [];
        }
        $d = new Drawing();
        $d->setName('Franja institucional');
        $d->setDescription('Gobierno del Estado de México · Educación · COMECYT');
        $d->setPath($ruta);
        $d->setHeight(38);
        $d->setCoordinates('A1');

        return [$d];
    }

    public function registerEvents(): array
    {
        return [
            AfterSheet::class => function (AfterSheet $e) {
                $s = $e->sheet->getDelegate();
                $ultima = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex(max(1, count($this->encabezados)));
                $s->getRowDimension(1)->setRowHeight(32);
                $s->setCellValue('A3', SolicitudesExport::celda($this->titulo));
                $s->setCellValue('A4', SolicitudesExport::celda(trim(($this->filtros !== '' ? $this->filtros.' · ' : '').'Generado por SIDECyT el '.$this->fecha->format('d/m/Y H:i'))));
                $s->getStyle('A3')->getFont()->setBold(true)->setSize(14)->getColor()->setRGB('56212F');
                $s->getStyle('A4')->getFont()->setItalic(true)->setSize(9)->getColor()->setRGB('6B7280');
                $s->getStyle('A2:'.$ultima.'2')->getBorders()->getBottom()->setBorderStyle(\PhpOffice\PhpSpreadsheet\Style\Border::BORDER_MEDIUM)->getColor()->setRGB('BC955B');
                $fila = self::FILA_ENCABEZADOS;
                $enc = $s->getStyle("A{$fila}:{$ultima}{$fila}");
                $enc->getFont()->setBold(true)->getColor()->setRGB('FFFFFF');
                $enc->getFill()->setFillType(\PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID)->getStartColor()->setRGB('56212F');
                $fin = $fila + max(1, count($this->filas));
                $s->getStyle("A{$fila}:{$ultima}{$fin}")->getBorders()->getAllBorders()->setBorderStyle(\PhpOffice\PhpSpreadsheet\Style\Border::BORDER_THIN)->getColor()->setRGB('D6D1CA');
                $s->getStyle("A{$fila}:{$ultima}{$fin}")->getAlignment()->setVertical(\PhpOffice\PhpSpreadsheet\Style\Alignment::VERTICAL_TOP)->setWrapText(true);
                foreach (range(1, count($this->encabezados)) as $i) {
                    $s->getColumnDimensionByColumn($i)->setWidth(22);
                }
                $s->freezePane('A'.($fila + 1));
                $s->setAutoFilter("A{$fila}:{$ultima}{$fin}");
            },
        ];
    }
}
