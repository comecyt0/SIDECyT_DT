@php
    // E52 · F4 — Credencial del club con su QR. Identidad oficial (E50): franja en el encabezado como data URI (DomPDF sin red).
    $franja = @file_get_contents(base_path('../web/public/identidad/convivencia-color.png'));
    $franjaUri = $franja ? 'data:image/png;base64,'.base64_encode($franja) : null;
@endphp
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <title>Credencial — {{ $club->folio }}</title>
    <style>
        @page { margin: 28px 40px 50px; }
        body { font-family: 'Helvetica', sans-serif; color: #1f2933; font-size: 11px; line-height: 1.45; }
        .franja { text-align: center; padding-bottom: 10px; border-bottom: 2px solid #BC955B; margin-bottom: 16px; }
        .franja img { width: 100%; max-width: 640px; }
        .tarjeta { border: 2px solid #56212F; border-radius: 14px; padding: 18px 20px; }
        .tarjeta table { width: 100%; border-collapse: collapse; }
        .tarjeta td { vertical-align: top; }
        .qr { width: 230px; text-align: center; }
        .qr img { width: 210px; height: 210px; }
        .qr small { display: block; color: #6b7280; font-size: 9px; margin-top: 4px; }
        h1 { font-size: 20px; color: #56212F; margin: 0 0 2px; }
        .folio { font-size: 12px; color: #BC955B; font-weight: bold; margin-bottom: 10px; }
        .dato { margin-bottom: 6px; }
        .dato b { color: #56212F; display: block; font-size: 9.5px; text-transform: uppercase; letter-spacing: .4px; }
        .logo { width: 64px; height: 64px; border-radius: 10px; float: right; margin-left: 10px; }
        h2 { font-size: 13px; color: #56212F; border-left: 4px solid #BC955B; padding-left: 8px; margin: 22px 0 10px; }
        .integrantes { width: 100%; border-collapse: collapse; }
        .integrantes td { width: 25%; text-align: center; padding: 8px 4px; vertical-align: top; }
        .foto { width: 86px; height: 86px; border-radius: 43px; border: 2px solid #BC955B; }
        .sinfoto { width: 86px; height: 86px; border-radius: 43px; border: 2px dashed #d6d1ca; display: inline-block; line-height: 86px; color: #9ca3af; font-size: 22px; }
        .nombre { font-size: 10px; margin-top: 4px; }
        .papel { font-size: 8.5px; color: #BC955B; font-weight: bold; }
        .indica { margin-top: 16px; font-size: 10px; color: #4b5563; background: #f6f1ea; padding: 8px 10px; border-radius: 8px; }
        .pie { position: fixed; bottom: -32px; left: 0; right: 0; text-align: center; font-size: 8.5px; color: #6b7280; }
    </style>
</head>
<body>
    @if ($franjaUri)
        <div class="franja"><img src="{{ $franjaUri }}" alt="Gobierno del Estado de México y COMECYT"></div>
    @endif

    <div class="tarjeta">
        <table>
            <tr>
                <td>
                    @if ($logo)<img class="logo" src="{{ $logo }}" alt="">@endif
                    <h1>{{ $club->nombre }}</h1>
                    <div class="folio">{{ $club->folio }}</div>
                    <div class="dato"><b>Escuela</b>{{ $club->escuela->nombre }} (CCT {{ $club->escuela->cct }})</div>
                    <div class="dato"><b>Municipio</b>{{ $club->escuela->municipio }}, Estado de México</div>
                    <div class="dato"><b>Líder del club</b>{{ $club->lider->name }}</div>
                    <div class="dato"><b>Convocatoria</b>{{ $club->convocatoria->nombre }}</div>
                    <div class="dato"><b>Integrantes</b>{{ $club->integrantes->count() }}</div>
                </td>
                <td class="qr">
                    <img src="{{ $qr }}" alt="QR del club">
                    <small>Muestra este código al personal del COMECYT en cada evento.</small>
                </td>
            </tr>
        </table>
    </div>

    <h2>Integrantes</h2>
    <table class="integrantes">
        @foreach ($club->integrantes->chunk(4) as $fila)
            <tr>
                @foreach ($fila as $i)
                    <td>
                        @if ($fotos[$i->id] ?? null)
                            <img class="foto" src="{{ $fotos[$i->id] }}" alt="">
                        @else
                            <span class="sinfoto">?</span>
                        @endif
                        <div class="nombre">{{ $i->nombre }}</div>
                        @if ($i->es_lider)<div class="papel">LÍDER</div>@endif
                    </td>
                @endforeach
                @for ($k = $fila->count(); $k < 4; $k++)<td></td>@endfor
            </tr>
        @endforeach
    </table>

    <div class="indica">
        Lleva esta credencial impresa o en tu celular. El QR identifica a tu club para registrar la asistencia, el box lunch y la
        entrega del kit. No lo compartas en redes: si se pierde o se usa mal, el COMECYT puede desactivarlo y darte uno nuevo.
    </div>

    <div class="pie">Generada por SIDECyT el {{ $fecha->format('d/m/Y H:i') }} · Consejo Mexiquense de Ciencia y Tecnología</div>
</body>
</html>
