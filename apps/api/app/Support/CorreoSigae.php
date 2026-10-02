<?php

namespace App\Support;

use Illuminate\Notifications\Messages\MailMessage;

/**
 * 02/10/2026 — Correos de SIGAE con un solo diseño (resources/views/emails/sigae.blade.php). Uso:
 *   CorreoSigae::nuevo('Asunto')->titulo('…')->saludo($user->name)->linea('…')->detalle(['Folio' => …])
 *       ->pasos(['…'])->boton('Ver mi solicitud', '/solicitante/solicitudes/5')->mail();
 * Las rutas del botón son internas (se les antepone FRONTEND_URL); una URL externa se ignora. Todo se escapa al pintar.
 */
class CorreoSigae
{
    private array $d = ['lineas' => [], 'detalle' => [], 'pasos' => [], 'tono' => 'vino'];

    private function __construct(private string $asunto) {}

    public static function nuevo(string $asunto): self
    {
        return new self($asunto);
    }

    public static function base(): string
    {
        return rtrim((string) config('app.frontend_url'), '/');
    }

    /** Ruta interna → URL absoluta del sitio; cualquier otra cosa → URL del panel por defecto. */
    public static function url(?string $ruta): string
    {
        $b = self::base();
        if (is_string($ruta) && str_starts_with($ruta, $b.'/')) return $ruta;

        return is_string($ruta) && preg_match('#^/[A-Za-z0-9/_\-?=&.]*$#', $ruta) && ! str_contains($ruta, '..') && ! str_starts_with($ruta, '//') ? $b.$ruta : $b.'/login';
    }

    public function titulo(string $t, ?string $subtitulo = null): self { $this->d['titulo'] = $t; $this->d['subtitulo'] = $subtitulo; return $this; }
    public function etiqueta(string $e): self { $this->d['etiqueta'] = $e; return $this; }
    public function preencabezado(string $p): self { $this->d['preencabezado'] = $p; return $this; }
    public function saludo(?string $nombre): self { $this->d['saludo'] = 'Hola, '.trim((string) $nombre).':'; return $this; }
    public function linea(?string $l): self { if ($l !== null && trim($l) !== '') $this->d['lineas'][] = mb_substr(trim($l), 0, 2000); return $this; }
    /** Chip de estado arriba del texto. tono: vino | verde | oro | rojo | azul (también colorea el correo). */
    public function estado(string $texto, string $tono = 'vino'): self { $this->d['destacado'] = ['texto' => $texto]; $this->d['tono'] = $tono; return $this; }
    public function tono(string $tono): self { $this->d['tono'] = $tono; return $this; }
    /** @param array<string,string|int|float|null> $filas */
    public function detalle(array $filas): self
    {
        foreach ($filas as $k => $v) if ($v !== null && $v !== '') $this->d['detalle'][] = [(string) $k, mb_substr((string) $v, 0, 300)];

        return $this;
    }
    public function cita(string $titulo, ?string $texto): self { if ($texto !== null && trim($texto) !== '') $this->d['cita'] = ['titulo' => $titulo, 'texto' => mb_substr(trim($texto), 0, 1500)]; return $this; }
    /** @param string[] $pasos */
    public function progreso(array $pasos, int $actual): self { $this->d['progreso'] = ['pasos' => array_values($pasos), 'actual' => $actual]; return $this; }
    /** @param string[] $pasos */
    public function pasos(array $pasos): self { $this->d['pasos'] = array_values(array_filter($pasos)); return $this; }
    public function boton(string $texto, ?string $ruta): self { $this->d['boton'] = ['texto' => $texto, 'url' => self::url($ruta)]; return $this; }
    public function secundario(string $texto, ?string $ruta): self { $this->d['secundario'] = ['texto' => $texto, 'url' => self::url($ruta)]; return $this; }

    public function datos(): array
    {
        return $this->d + ['titulo' => $this->asunto, 'base' => self::base(), 'panel' => self::base().'/login'];
    }

    public function mail(): MailMessage
    {
        return (new MailMessage)->subject($this->asunto.' — SIGAE')->view('emails.sigae', $this->datos());
    }
}
