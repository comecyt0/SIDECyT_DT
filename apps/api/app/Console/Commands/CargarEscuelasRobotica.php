<?php

namespace App\Console\Commands;

use App\Models\Escuela;
use App\Support\Audit;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use PhpOffice\PhpSpreadsheet\IOFactory;

/**
 * E94 (23/10/2026) — Carga única del Excel «BASE DE DATOS ROBÓTICA 2026-2027» al catálogo de escuelas.
 *
 *   php artisan escuelas:cargar-robotica "ruta.xlsx"            → prueba: lee, valida y muestra el informe; NO guarda nada.
 *   php artisan escuelas:cargar-robotica "ruta.xlsx" --aplicar  → guarda todo en una sola transacción.
 *
 * Reglas (decididas con el usuario el 23/10/2026):
 *  - TEMPORADA: PRIMERA = 2022-2023 … QUINTA = 2026-2027. Una escuela participó en todas las temporadas desde la suya
 *    hasta la actual (nunca dejó de participar). PRIMERA a CUARTA → «Ya participó»; QUINTA → «Nueva escuela» (conserva su
 *    temporada 2026-2027 en el historial). Las temporadas se guardan de la más reciente a la más antigua.
 *  - SUBSISTEMA: ESTATAL / ESTATAL (SEB) → estatal; Federalizado / FEDERAL (SEIEM) → federal. El texto original queda en
 *    `subsistema_detalle`. Un valor sin regla («BASICO») se resuelve por la clave CCT (E = estatal, D = federal) y se deja
 *    una observación para que el admin la revise.
 *  - Nivel: primaria o secundaria; el tipo (general / técnica / telesecundaria) y la zona van en campos propios.
 *  - Ubicación: coordenadas (decimales o grados) y enlace de mapas https conocido; lo demás se descarta con observación.
 *  - Las filas con CCT inválida no se cargan (se listan). Nada se inventa: lo que falta queda vacío.
 */
class CargarEscuelasRobotica extends Command
{
    protected $signature = 'escuelas:cargar-robotica {archivo : Excel .xlsx} {--aplicar : Guardar (sin esto solo se muestra el informe)}';
    protected $description = 'Carga la base de escuelas de robótica (datos, equipo, temporadas y «Ya participó»)';

    /** Etiqueta del Excel → temporada en que la escuela entró. */
    private const TEMPORADA = ['PRIMERA' => 0, 'SEGUNDA' => 1, 'TERCERA' => 2, 'CUARTA' => 3, 'QUINTA' => 4];
    private const PERIODOS = ['2022-2023', '2023-2024', '2024-2025', '2025-2026', '2026-2027'];
    /** Municipios del Excel que no coinciden con el catálogo SEPOMEX (corrección evidente de nombre u ortografía). */
    private const MUNICIPIO_CORREGIDO = [
        'acambay' => 'Acambay de Ruíz Castañeda', 'tutltitlan' => 'Tultitlán',
        'santo tomas de los platanos' => 'Santo Tomás', 'santa maria rayon' => 'Rayón',
    ];

    public function handle(): int
    {
        $ruta = (string) $this->argument('archivo');
        if (! is_file($ruta) || strtolower(pathinfo($ruta, PATHINFO_EXTENSION)) !== 'xlsx') {
            $this->error('Indica un archivo .xlsx existente.');

            return self::FAILURE;
        }
        $lector = IOFactory::createReader('Xlsx');
        $lector->setReadDataOnly(true);
        $hoja = $lector->load($ruta)->getActiveSheet();
        $filas = $hoja->rangeToArray('A3:N'.$hoja->getHighestRow(), null, true, false);

        $listas = ['saltadas' => [], 'municipio' => [], 'obs' => [], 'sistema_vs_cct' => []];
        $cuenta = ['filas' => 0, 'nuevas' => 0, 'actualizadas' => 0, 'ya_participo' => 0, 'nueva' => 0, 'zona' => 0, 'tipo_sec' => 0,
            'con_equipo' => 0, 'con_url' => 0, 'con_coord' => 0, 'sin_equipo' => 0];
        $vistos = [];

        DB::beginTransaction();
        try {
            foreach ($filas as $i => $f) {
                $fila = $i + 3;
                if (! is_numeric($f[0] ?? null)) continue; // vacías y filas sueltas (solo números de matrícula)
                $np = (int) $f[0];
                $f = array_map(fn ($v) => is_string($v) ? trim(preg_replace('/\s+/u', ' ', $v)) : $v, $f);
                $cuenta['filas']++;

                // Desde la escuela 151 hay una columna extra (zona) entre SUBSISTEMA y NOMBRE: se detecta por la CCT.
                $zona = null;
                if (! $this->esCct($f[7] ?? '') && $this->esCct($f[8] ?? '')) {
                    $zona = trim((string) $f[6]) ?: null;
                    array_splice($f, 6, 1);
                }
                $cct = mb_strtoupper(trim((string) ($f[7] ?? '')));
                if (! $this->esCct($cct)) {
                    $listas['saltadas'][] = "NP {$np} (fila {$fila}): CCT «{$cct}» no es válida; no se cargó";
                    continue;
                }
                if (isset($vistos[$cct])) {
                    $listas['saltadas'][] = "NP {$np} (fila {$fila}): CCT {$cct} repetida con NP {$vistos[$cct]}; no se cargó";
                    continue;
                }
                $vistos[$cct] = $np;
                $obs = [];

                $munTexto = (string) ($f[1] ?? '');
                $mun = Escuela::municipioCanonico($munTexto);
                if (! $mun) {
                    $mun = ($c = self::MUNICIPIO_CORREGIDO[Escuela::clave($munTexto)] ?? null) ? Escuela::municipioCanonico($c) : null;
                    if ($mun) $listas['municipio'][] = "NP {$np}: «{$munTexto}» → {$mun}";
                }
                if (! $mun) {
                    $listas['saltadas'][] = "NP {$np} (fila {$fila}): municipio «{$munTexto}» no existe en el catálogo; no se cargó";
                    continue;
                }

                [$nivel, $tipo] = $this->nivel((string) ($f[4] ?? ''));
                if (! $nivel) {
                    $listas['saltadas'][] = "NP {$np} (fila {$fila}): nivel «{$f[4]}» no reconocido; no se cargó";
                    continue;
                }

                $subsistema = mb_strtoupper(trim((string) ($f[5] ?? '')));
                $porClave = $cct[2] === 'E' ? 'estatal' : ($cct[2] === 'D' ? 'federal' : null);
                if (str_starts_with($subsistema, 'ESTATAL')) $sistema = 'estatal';
                elseif (str_contains($subsistema, 'SEIEM') || str_contains($subsistema, 'FEDERAL')) $sistema = 'federal';
                else {
                    if (! $porClave) {
                        $listas['saltadas'][] = "NP {$np} (fila {$fila}): subsistema «{$subsistema}» sin regla y la CCT no lo aclara; no se cargó";
                        continue;
                    }
                    $sistema = $porClave;
                    $obs[] = "Subsistema «{$subsistema}» en el Excel; se asignó {$sistema} por la clave CCT. Revisar.";
                }
                if ($porClave && $porClave !== $sistema) $listas['sistema_vs_cct'][] = "NP {$np} {$cct}: Excel dice «{$subsistema}» ({$sistema}) pero la clave indica {$porClave}";

                $etiqueta = mb_strtoupper(trim((string) ($f[2] ?? '')));
                if (! isset(self::TEMPORADA[$etiqueta])) {
                    $listas['saltadas'][] = "NP {$np} (fila {$fila}): temporada «{$etiqueta}» no reconocida; no se cargó";
                    continue;
                }
                $desde = self::TEMPORADA[$etiqueta];
                $temporadas = array_reverse(array_slice(self::PERIODOS, $desde));
                $participo = $desde < 4;

                $equipo = $this->texto($f[3] ?? null, 255);
                $domicilio = $this->texto($f[8] ?? null, 400);
                [$lat, $lng, $url, $notaUbic] = $this->ubicacion((string) ($f[9] ?? ''));
                if ($notaUbic) $obs[] = $notaUbic;
                $total = $this->entero($f[10] ?? null); $h = $this->entero($f[11] ?? null); $m = $this->entero($f[12] ?? null);
                if ($total === null) $obs[] = 'Sin matrícula en el Excel.';
                if ($total !== null && $h !== null && $m !== null && $h + $m !== $total) $obs[] = "Matrícula: hombres ({$h}) + mujeres ({$m}) no suma la general ({$total}). Revisar.";
                if ($equipo === null) $obs[] = 'Sin nombre de equipo en el Excel.';
                if ($nivel === 'secundaria' && ! $tipo) $obs[] = 'Secundaria sin tipo (general, técnica o telesecundaria) en el Excel.';

                $e = Escuela::firstOrNew(['cct' => $cct]);
                $nueva = ! $e->exists;
                $e->fill([
                    'nombre' => Escuela::textoSeguro((string) $f[6]) ?: $cct, 'municipio' => $mun, 'nivel' => $nivel, 'sistema' => $sistema,
                    'activo' => true, 'participo_antes' => $participo, 'temporadas' => $temporadas,
                    'equipo_nombre' => $equipo, 'domicilio' => $domicilio, 'ubicacion_url' => $url, 'latitud' => $lat, 'longitud' => $lng,
                    'matricula_total' => $total, 'matricula_hombres' => $h, 'matricula_mujeres' => $m,
                    'tipo_secundaria' => $nivel === 'secundaria' ? $tipo : null, 'zona' => $zona ? mb_substr(Escuela::textoSeguro($zona), 0, 60) : null,
                    'subsistema_detalle' => $subsistema !== '' ? mb_substr($subsistema, 0, 60) : null,
                    'observaciones' => $obs ? mb_substr(implode(' ', $obs), 0, 500) : null,
                ])->save();

                $nueva ? $cuenta['nuevas']++ : $cuenta['actualizadas']++;
                $participo ? $cuenta['ya_participo']++ : $cuenta['nueva']++;
                if ($zona) $cuenta['zona']++;
                if ($tipo) $cuenta['tipo_sec']++;
                $equipo ? $cuenta['con_equipo']++ : $cuenta['sin_equipo']++;
                if ($url) $cuenta['con_url']++;
                if ($lat !== null) $cuenta['con_coord']++;
                if ($obs) $listas['obs'][] = "NP {$np} {$cct}: ".implode(' ', $obs);
            }
            $this->informe($cuenta, $listas);
            if ($this->option('aplicar')) {
                DB::commit();
                try {
                    Audit::log('escuela.carga_robotica', null, ['nuevas' => $cuenta['nuevas'], 'actualizadas' => $cuenta['actualizadas'], 'saltadas' => count($listas['saltadas'])]);
                } catch (\Throwable) {
                    // La bitácora no debe deshacer la carga.
                }
                $this->info('GUARDADO.');
            } else {
                DB::rollBack();
                $this->warn('PRUEBA: no se guardó nada. Repite con --aplicar para cargar.');
            }
        } catch (\Throwable $ex) {
            DB::rollBack();
            $this->error('Se canceló todo (nada quedó guardado): '.$ex->getMessage());

            return self::FAILURE;
        }

        return self::SUCCESS;
    }

    private function esCct(mixed $v): bool
    {
        return (bool) preg_match(Escuela::PATRON_CCT, mb_strtoupper(trim((string) $v)));
    }

    /** @return array{0:?string,1:?string} [nivel, tipo de secundaria] */
    private function nivel(string $t): array
    {
        $c = Escuela::clave($t);
        if (str_starts_with($c, 'primaria')) return ['primaria', null];
        if (str_starts_with($c, 'telesecundaria')) return ['secundaria', 'telesecundaria'];
        if (str_starts_with($c, 'secundaria')) {
            return ['secundaria', str_contains($c, 'tecnica') ? 'tecnica' : (str_contains($c, 'general') ? 'general' : null)];
        }

        return [null, null];
    }

    private function texto(mixed $v, int $max): ?string
    {
        $t = preg_replace('/\s+/u', ' ', Escuela::textoSeguro((string) $v));

        return $t === '' ? null : mb_substr($t, 0, $max);
    }

    private function entero(mixed $v): ?int
    {
        return is_numeric($v) && (float) $v >= 0 && (float) $v <= 100000 && (float) $v == (int) $v ? (int) $v : null;
    }

    /** @return array{0:?float,1:?float,2:?string,3:?string} [lat, lng, url segura, nota] */
    private function ubicacion(string $t): array
    {
        $lat = $lng = $url = null; $notas = [];
        if (preg_match('#https?://[^\s]+#i', $t, $m)) {
            $url = Escuela::urlMapaSegura(rtrim($m[0], '.,;)'));
            if (! $url) $notas[] = 'Enlace de ubicación descartado (no es de Google Maps ni Apple Maps).';
        }
        if (preg_match('/(-?\d{1,2}\.\d{3,})\D+?(-?\d{2,3}\.\d{3,})/', $t, $m)) {
            [$lat, $lng] = [(float) $m[1], (float) $m[2]];
        } elseif (preg_match('/(\d{1,2})°\s*(\d{1,2})\'\s*(\d{1,2}(?:\.\d+)?)"?\s*N\D+(\d{1,3})°\s*(\d{1,2})\'\s*(\d{1,2}(?:\.\d+)?)"?\s*W/u', $t, $m)) {
            $lat = round($m[1] + $m[2] / 60 + $m[3] / 3600, 7);
            $lng = -round($m[4] + $m[5] / 60 + $m[6] / 3600, 7);
        }
        if ($lat !== null && ($lat < 18.3 || $lat > 20.4 || $lng < -100.7 || $lng > -98.5)) {
            $notas[] = 'Coordenadas fuera del Estado de México; descartadas.';
            $lat = $lng = null;
        }

        return [$lat, $lng, $url, $notas ? implode(' ', $notas) : null];
    }

    private function informe(array $c, array $l): void
    {
        $this->info("Filas con escuela: {$c['filas']} · nuevas: {$c['nuevas']} · actualizadas: {$c['actualizadas']} · no cargadas: ".count($l['saltadas']));
        $this->line("«Ya participó»: {$c['ya_participo']} · «Nueva escuela» (Quinta): {$c['nueva']}");
        $this->line("Con equipo: {$c['con_equipo']} · sin equipo: {$c['sin_equipo']} · con zona: {$c['zona']} · tipo de secundaria: {$c['tipo_sec']} · con enlace de mapa: {$c['con_url']} · con coordenadas: {$c['con_coord']}");
        foreach (['saltadas' => 'NO CARGADAS', 'municipio' => 'MUNICIPIOS CORREGIDOS', 'sistema_vs_cct' => 'SUBSISTEMA vs CLAVE CCT', 'obs' => 'CON OBSERVACIÓN (quedan visibles al admin)'] as $k => $titulo) {
            if (! $l[$k]) continue;
            $this->newLine();
            $this->warn("{$titulo} (".count($l[$k]).')');
            foreach (array_slice($l[$k], 0, $k === 'obs' ? 60 : 40) as $x) $this->line('  '.$x);
            if (count($l[$k]) > ($k === 'obs' ? 60 : 40)) $this->line('  …');
        }
    }
}
