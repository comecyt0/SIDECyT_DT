{{--
  02/10/2026 — Plantilla única de los correos de SIGAE (pedido del usuario: mismo estilo que la página de SIGAE, logos
  institucionales del encabezado, colores, llamativo, interactivo y, sobre todo, intuitivo). La arma
  App\Support\CorreoSigae; todo el texto llega escapado ({{ }}). Tablas y estilos en línea para Outlook, Gmail y Apple Mail.
  Variables: preencabezado, etiqueta, titulo, subtitulo, saludo, lineas[], destacado{texto,tono}, detalle[[k,v]],
  progreso{pasos[],actual}, pasos[], cita{titulo,texto}, boton{texto,url}, secundario{texto,url}, tono, panel, base.
--}}
@php
  $colores = [
    'vino' => ['#7a2748', '#a8466b', '#fdebf4', '#7a2748'],
    'verde' => ['#13795b', '#1f9d77', '#e6f6ef', '#13795b'],
    'oro' => ['#9a6b00', '#c58f12', '#fff5d6', '#7a5200'],
    'rojo' => ['#a1262f', '#c43c46', '#fdecee', '#a1262f'],
    'azul' => ['#1d4f86', '#2f6fb3', '#e8f1fb', '#1d4f86'],
  ];
  [$c1, $c2, $suave, $tinta] = $colores[$tono ?? 'vino'] ?? $colores['vino'];
  $f = "font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;";
@endphp
<!DOCTYPE html>
<html lang="es" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>{{ $titulo }}</title>
<style>
  @media (max-width: 620px) {
    .sg-contenedor { width: 100% !important; }
    .sg-pad { padding-left: 20px !important; padding-right: 20px !important; }
    .sg-titulo { font-size: 24px !important; line-height: 30px !important; }
    .sg-boton a { display: block !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:#f4eef1;">
  {{-- Texto de vista previa en la bandeja de entrada (oculto en el cuerpo) --}}
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">{{ $preencabezado ?? $titulo }}&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4eef1;">
    <tr><td align="center" style="padding:24px 12px;">
      <table role="presentation" class="sg-contenedor" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 12px 32px rgba(74,21,48,0.12);">

        {{-- Franja institucional (convivencia de logos), igual que el encabezado del sitio --}}
        <tr><td style="padding:18px 24px 14px 24px;background:#ffffff;" align="center">
          <img src="{{ $base }}/identidad/correo-franja.png" width="552" alt="Gobierno del Estado de México · Educación · COMECYT" style="display:block;width:100%;max-width:552px;height:auto;border:0;">
        </td></tr>
        <tr><td style="height:4px;line-height:4px;font-size:0;background:{{ $c1 }};background-image:linear-gradient(90deg,{{ $c1 }},{{ $c2 }},#d9a441);">&nbsp;</td></tr>

        {{-- Encabezado: qué pasó, en grande --}}
        <tr><td class="sg-pad" bgcolor="{{ $c1 }}" style="padding:30px 36px 28px 36px;background:{{ $c1 }};background-image:linear-gradient(135deg,{{ $c1 }} 0%,{{ $c2 }} 100%);{{ $f }}">
          <span style="display:inline-block;padding:5px 12px;border-radius:999px;background:rgba(255,255,255,0.18);color:#ffffff;font-size:12px;font-weight:700;letter-spacing:0.2px;">{{ $etiqueta ?? 'SIGAE · Apoyo Empresarial' }}</span>
          <h1 class="sg-titulo" style="margin:14px 0 0 0;color:#ffffff;font-size:28px;line-height:34px;font-weight:800;{{ $f }}">{{ $titulo }}</h1>
          @if (! empty($subtitulo))
            <p style="margin:8px 0 0 0;color:rgba(255,255,255,0.9);font-size:15px;line-height:22px;{{ $f }}">{{ $subtitulo }}</p>
          @endif
        </td></tr>

        {{-- Cuerpo --}}
        <tr><td class="sg-pad" style="padding:28px 36px 8px 36px;{{ $f }}color:#2b1f25;">
          @if (! empty($saludo))
            <p style="margin:0 0 14px 0;font-size:16px;line-height:24px;font-weight:700;color:#2b1f25;">{{ $saludo }}</p>
          @endif

          @if (! empty($destacado))
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 18px 0;"><tr>
              <td style="padding:8px 14px;border-radius:999px;background:{{ $suave }};color:{{ $tinta }};font-size:13px;font-weight:800;">● {{ $destacado['texto'] }}</td>
            </tr></table>
          @endif

          @foreach (($lineas ?? []) as $l)
            <p style="margin:0 0 14px 0;font-size:15px;line-height:24px;color:#43363c;">{{ $l }}</p>
          @endforeach

          @if (! empty($cita))
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 18px 0;"><tr>
              <td style="padding:14px 16px;border-left:4px solid {{ $c1 }};background:{{ $suave }};border-radius:10px;">
                <p style="margin:0 0 4px 0;font-size:12px;font-weight:800;color:{{ $tinta }};text-transform:uppercase;letter-spacing:0.4px;">{{ $cita['titulo'] }}</p>
                <p style="margin:0;font-size:14px;line-height:22px;color:#2b1f25;white-space:pre-wrap;">{{ $cita['texto'] }}</p>
              </td>
            </tr></table>
          @endif

          @if (! empty($detalle))
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 20px 0;border:1px solid #efe3e9;border-radius:14px;">
              @foreach ($detalle as $i => $d)
                <tr>
                  <td style="padding:11px 16px;font-size:13px;color:#7b6a72;width:42%;{{ $i ? 'border-top:1px solid #f3eaee;' : '' }}">{{ $d[0] }}</td>
                  <td style="padding:11px 16px;font-size:14px;font-weight:700;color:#2b1f25;{{ $i ? 'border-top:1px solid #f3eaee;' : '' }}">{{ $d[1] }}</td>
                </tr>
              @endforeach
            </table>
          @endif

          {{-- Línea de avance (dónde va el trámite) --}}
          @if (! empty($progreso['pasos']))
            @php $act = (int) ($progreso['actual'] ?? 0); $n = count($progreso['pasos']); @endphp
            <p style="margin:4px 0 10px 0;font-size:12px;font-weight:800;color:#7b6a72;text-transform:uppercase;letter-spacing:0.4px;">Así va tu trámite</p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 22px 0;table-layout:fixed;"><tr>
              @foreach ($progreso['pasos'] as $i => $p)
                @php $hecho = $i < $act; $aqui = $i === $act; @endphp
                <td align="center" valign="top" style="padding:0 2px;">
                  <div style="height:6px;border-radius:6px;background:{{ $hecho ? $c1 : ($aqui ? $c2 : '#eadde3') }};"></div>
                  <p style="margin:7px 0 0 0;font-size:11px;line-height:14px;font-weight:{{ $aqui ? '800' : '600' }};color:{{ $aqui ? $tinta : ($hecho ? '#43363c' : '#a3939a') }};">{{ $hecho ? '✓ ' : '' }}{{ $p }}</p>
                </td>
              @endforeach
            </tr></table>
          @endif

          {{-- Qué sigue (pasos numerados): lo más importante para que sea intuitivo --}}
          @if (! empty($pasos))
            <p style="margin:4px 0 10px 0;font-size:12px;font-weight:800;color:#7b6a72;text-transform:uppercase;letter-spacing:0.4px;">Qué sigue</p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px 0;">
              @foreach ($pasos as $i => $p)
                <tr>
                  <td valign="top" width="34" style="padding:0 0 10px 0;">
                    <div style="width:26px;height:26px;line-height:26px;border-radius:999px;background:{{ $c1 }};color:#ffffff;font-size:13px;font-weight:800;text-align:center;">{{ $i + 1 }}</div>
                  </td>
                  <td valign="top" style="padding:3px 0 10px 8px;font-size:14px;line-height:21px;color:#2b1f25;">{{ $p }}</td>
                </tr>
              @endforeach
            </table>
          @endif

          {{-- Acción principal (botón a prueba de clientes de correo) --}}
          @if (! empty($boton))
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" class="sg-boton" style="margin:8px 0 10px 0;"><tr>
              <td align="center" bgcolor="{{ $c1 }}" style="border-radius:999px;background:{{ $c1 }};background-image:linear-gradient(135deg,{{ $c1 }},{{ $c2 }});">
                <a href="{{ $boton['url'] }}" target="_blank" style="display:inline-block;padding:15px 30px;border-radius:999px;color:#ffffff;font-size:16px;font-weight:800;text-decoration:none;{{ $f }}">{{ $boton['texto'] }} &rarr;</a>
              </td>
            </tr></table>
            <p style="margin:0 0 18px 0;font-size:12px;line-height:18px;color:#9a8a91;">Si el botón no abre, copia esta dirección en tu navegador:<br><a href="{{ $boton['url'] }}" style="color:{{ $tinta }};word-break:break-all;">{{ $boton['url'] }}</a></p>
          @endif
          @if (! empty($secundario))
            <p style="margin:0 0 18px 0;font-size:14px;"><a href="{{ $secundario['url'] }}" target="_blank" style="color:{{ $tinta }};font-weight:700;text-decoration:underline;">{{ $secundario['texto'] }}</a></p>
          @endif
        </td></tr>

        {{-- Pie --}}
        <tr><td bgcolor="#4a1530" style="padding:22px 36px;background:#4a1530;{{ $f }}">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
            <td valign="middle" width="130"><img src="{{ $base }}/identidad/correo-comecyt-negativo.png" width="110" alt="COMECYT" style="display:block;width:110px;height:auto;border:0;"></td>
            <td valign="middle" style="font-size:12px;line-height:18px;color:rgba(255,255,255,0.82);">
              Aviso automático de <strong style="color:#ffffff;">SIDECyT · SIGAE</strong>. No respondas a este correo.<br>
              <a href="{{ $panel }}" style="color:#f2c6d6;text-decoration:underline;">Entrar a mi panel</a>
            </td>
          </tr></table>
        </td></tr>
      </table>
      <p style="margin:14px 0 0 0;font-size:11px;color:#a3939a;{{ $f }}">Consejo Mexiquense de Ciencia y Tecnología · Gobierno del Estado de México</p>
    </td></tr>
  </table>
</body>
</html>
