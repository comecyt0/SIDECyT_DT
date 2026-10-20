<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\WithMultipleSheets;

/**
 * E81 — Excel de un folio (exportación individual): una hoja con todos sus datos (sección · dato · valor), una por cada
 * tabla (integrantes, documentos) y el historial. Todas con el encabezado institucional.
 */
class FichaFolioExport implements WithMultipleSheets
{
    public function __construct(private array $ficha, private \Carbon\CarbonInterface $fecha) {}

    public function sheets(): array
    {
        $s = fn ($v) => SolicitudesExport::celda($v === null ? '' : (string) $v);
        $f = $this->ficha;
        $titulo = 'Folio '.$f['folio'].' · '.$f['titulo'];
        $etiquetas = collect($f['etiquetas'])->pluck('texto')->implode(' · ');
        $datos = [];
        foreach ($f['secciones'] as $sec) {
            foreach ($sec['campos'] as $c) {
                $datos[] = [$s($sec['titulo']), $s($c['etiqueta']), $s($c['valor'] ?? '—')];
            }
        }
        $hojas = [new ReporteInstitucional('Datos', $titulo, $etiquetas, $this->fecha, ['Sección', 'Dato', 'Valor'], $datos)];
        foreach ($f['tablas'] as $t) {
            $hojas[] = new ReporteInstitucional($t['titulo'], $titulo.' · '.$t['titulo'], '', $this->fecha, $t['columnas'],
                array_map(fn ($fila) => array_map($s, $fila), $t['filas']));
        }
        $hojas[] = new ReporteInstitucional('Historial', $titulo.' · Historial', '', $this->fecha, ['Fecha', 'Acción', 'Detalle', 'Quién'],
            array_map(fn ($h) => [$s($h['fecha']), $s($h['texto']), $s($h['detalle']), $s($h['quien'])], $f['historial']));

        return $hojas;
    }
}
