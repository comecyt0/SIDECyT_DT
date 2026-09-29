<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * E52 — Carga el catálogo oficial de códigos postales del Estado de México (SEPOMEX / Correos de México).
 *
 * Uso: php artisan sidecyt:cargar-cp "F:\Desarrollo Tecnologico\backups\sepomex\Mexico.txt"
 *
 * El archivo se descarga de https://www.correosdemexico.gob.mx/SSLServicios/ConsultaCP/CodigoPostal_Exportar.aspx
 * (estado "México", formato TXT, separado por "|", codificación Windows-1252). NO se versiona: la licencia de Correos de
 * México permite el uso gratuito pero prohíbe distribuirlo, y el repositorio es público. Idempotente: reemplaza todo.
 */
class CargarCodigosPostales extends Command
{
    protected $signature = 'sidecyt:cargar-cp {archivo : Ruta del TXT de SEPOMEX del Estado de México}';

    protected $description = 'Carga el catálogo SEPOMEX del Estado de México en codigos_postales';

    public function handle(): int
    {
        $ruta = (string) $this->argument('archivo');
        if (! is_file($ruta)) {
            $this->error("No existe el archivo: {$ruta}");

            return self::FAILURE;
        }
        $texto = mb_convert_encoding((string) file_get_contents($ruta), 'UTF-8', 'Windows-1252');
        $lineas = preg_split('/\r?\n/', $texto);

        // Localizar el encabezado (la primera línea es el aviso de licencia).
        $idx = null;
        foreach ($lineas as $i => $l) {
            if (str_starts_with($l, 'd_codigo|')) { $idx = $i; break; }
        }
        if ($idx === null) {
            $this->error('El archivo no tiene el encabezado esperado (d_codigo|d_asenta|…).');

            return self::FAILURE;
        }
        $cols = explode('|', $lineas[$idx]);
        $pos = array_flip($cols);
        foreach (['d_codigo', 'd_asenta', 'd_tipo_asenta', 'D_mnpio', 'c_estado', 'c_mnpio', 'd_ciudad', 'd_zona'] as $req) {
            if (! isset($pos[$req])) {
                $this->error("Falta la columna {$req}.");

                return self::FAILURE;
            }
        }

        $filas = [];
        foreach (array_slice($lineas, $idx + 1) as $l) {
            if (trim($l) === '') continue;
            $c = explode('|', $l);
            if (($c[$pos['c_estado']] ?? '') !== '15') continue; // solo Estado de México
            $cp = trim($c[$pos['d_codigo']] ?? '');
            if (! preg_match('/^\d{5}$/', $cp)) continue;
            $filas[] = [
                'cp' => $cp,
                'asentamiento' => mb_substr(trim($c[$pos['d_asenta']]), 0, 150),
                'tipo_asentamiento' => mb_substr(trim($c[$pos['d_tipo_asenta']] ?? ''), 0, 60) ?: null,
                'municipio' => mb_substr(trim($c[$pos['D_mnpio']]), 0, 120),
                'clave_municipio' => str_pad(trim($c[$pos['c_mnpio']]), 3, '0', STR_PAD_LEFT),
                'ciudad' => mb_substr(trim($c[$pos['d_ciudad']] ?? ''), 0, 120) ?: null,
                'zona' => mb_substr(trim($c[$pos['d_zona']] ?? ''), 0, 20) ?: null,
            ];
        }
        if (count($filas) < 1000) {
            $this->error('El archivo trae muy pocos registros ('.count($filas).'); no se reemplaza el catálogo.');

            return self::FAILURE;
        }

        DB::transaction(function () use ($filas) {
            DB::table('codigos_postales')->delete();
            foreach (array_chunk($filas, 500) as $lote) {
                DB::table('codigos_postales')->insert($lote);
            }
        });
        $municipios = count(array_unique(array_column($filas, 'clave_municipio')));
        $cps = count(array_unique(array_column($filas, 'cp')));
        $this->info("Catálogo cargado: {$cps} códigos postales, ".count($filas)." asentamientos, {$municipios} municipios.");

        return self::SUCCESS;
    }
}
