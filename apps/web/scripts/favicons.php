<?php
/**
 * Genera TODOS los favicons del sistema a partir del logo oficial COMECYT 2026.
 * REGLA PERMANENTE (E50, 28/09/2026, pedido del usuario): este logo es el favicon de todo el sistema.
 * El logo no se recorta ni se recolorea (manual de identidad): se centra, con sus proporciones, en un lienzo cuadrado.
 *
 * Uso (desde la raíz del repo):  C:\php\php.exe apps\web\scripts\favicons.php
 * Requiere la extensión GD. Escribe en apps/web/public y copia favicon.ico a apps/api/public
 * (IIS lo sirve directo por la regla StaticFiles). Después: desplegar el front y subir la versión de sw.js.
 */
$web = dirname(__DIR__);
$pub = $web.'/public/';
$src = $pub.'identidad/comecyt-color.png';
$logo = imagecreatefrompng($src) ?: exit("No se pudo leer $src\n");
imagesavealpha($logo, true);
$lw = imagesx($logo);
$lh = imagesy($logo);

function lienzo(int $n, bool $fondoBlanco, float $ocupa, $logo, int $lw, int $lh)
{
    $im = imagecreatetruecolor($n, $n);
    imagesavealpha($im, true);
    imagealphablending($im, false);
    $fondo = $fondoBlanco ? imagecolorallocatealpha($im, 255, 255, 255, 0) : imagecolorallocatealpha($im, 0, 0, 0, 127);
    imagefilledrectangle($im, 0, 0, $n, $n, $fondo);
    imagealphablending($im, true);
    $w = (int) round($n * $ocupa);
    $h = (int) round($w * $lh / $lw);
    imagecopyresampled($im, $logo, (int) (($n - $w) / 2), (int) (($n - $h) / 2), 0, 0, $w, $h, $lw, $lh);

    return $im;
}

function png($im): string
{
    ob_start();
    imagepng($im, null, 9);

    return ob_get_clean();
}

$salidas = [
    'favicon-32.png' => [32, false, 1.0],
    'favicon-48.png' => [48, false, 1.0],
    'icon-192.png' => [192, false, 0.94],
    'icon-512.png' => [512, false, 0.94],
    'apple-touch-icon.png' => [180, true, 0.86],   // iOS pinta negro el fondo transparente
    'icon-maskable-512.png' => [512, true, 0.72],  // zona segura del 80 % de los íconos adaptables
];
foreach ($salidas as $nombre => [$n, $blanco, $ocupa]) {
    $im = lienzo($n, $blanco, $ocupa, $logo, $lw, $lh);
    file_put_contents($pub.$nombre, png($im));
    imagedestroy($im);
    echo "$nombre ({$n}px)\n";
}

// favicon.ico con entradas PNG de 16, 32 y 48 (el formato ICO admite PNG embebido)
$imgs = [];
foreach ([16, 32, 48] as $n) {
    $im = lienzo($n, false, 1.0, $logo, $lw, $lh);
    $imgs[$n] = png($im);
    imagedestroy($im);
}
$ico = pack('vvv', 0, 1, count($imgs));
$offset = 6 + 16 * count($imgs);
$datos = '';
foreach ($imgs as $n => $bin) {
    $ico .= pack('CCCCvvVV', $n, $n, 0, 0, 1, 32, strlen($bin), $offset);
    $offset += strlen($bin);
    $datos .= $bin;
}
$ico .= $datos;
file_put_contents($pub.'favicon.ico', $ico);
file_put_contents(dirname($web).'/api/public/favicon.ico', $ico);
echo 'favicon.ico: ', strlen($ico), " bytes (web/public y api/public)\n";
