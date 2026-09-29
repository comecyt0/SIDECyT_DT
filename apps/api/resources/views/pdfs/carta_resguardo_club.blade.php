@php
    // E52 · F3 — Carta de resguardo del kit. Identidad oficial (E50): franja en el encabezado como data URI (DomPDF sin red).
    $franja = @file_get_contents(base_path('../web/public/identidad/convivencia-color.png'));
    $franjaUri = $franja ? 'data:image/png;base64,'.base64_encode($franja) : null;
    $tz = 'America/Mexico_City';
@endphp
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <title>Carta de resguardo — {{ $club->folio }}</title>
    <style>
        @page { margin: 28px 40px 60px; }
        body { font-family: 'Helvetica', sans-serif; color: #1f2933; font-size: 11.5px; line-height: 1.55; }
        .franja { text-align: center; padding-bottom: 10px; border-bottom: 2px solid #BC955B; margin-bottom: 18px; }
        .franja img { width: 100%; max-width: 640px; }
        h1 { font-size: 16px; color: #56212F; margin: 0 0 4px; text-align: center; }
        .folio { text-align: center; color: #6b7280; font-size: 10.5px; margin-bottom: 16px; }
        .bloque { margin-bottom: 14px; }
        .titulo { font-weight: bold; color: #56212F; border-left: 4px solid #BC955B; padding-left: 8px; margin-bottom: 6px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #d6d1ca; padding: 5px 7px; text-align: left; vertical-align: top; }
        th { background: #f6f1ea; width: 32%; }
        .integrantes th { width: auto; }
        .firma { margin-top: 44px; width: 100%; }
        .firma td { border: 0; text-align: center; width: 50%; padding-top: 50px; }
        .linea { border-top: 1px solid #1f2933; display: inline-block; width: 80%; padding-top: 4px; }
        .pie { position: fixed; bottom: -40px; left: 0; right: 0; text-align: center; font-size: 9px; color: #6b7280; }
    </style>
</head>
<body>
    @if ($franjaUri)
        <div class="franja"><img src="{{ $franjaUri }}" alt="Gobierno del Estado de México y COMECYT"></div>
    @endif

    <h1>CARTA DE RESGUARDO DEL KIT</h1>
    <div class="folio">Registro {{ $club->folio }} · {{ $club->convocatoria->nombre }}</div>

    <div class="bloque">
        <p>
            Quien suscribe, <strong>{{ $club->lider->name }}</strong>, líder del club <strong>«{{ $club->nombre }}»</strong> de la escuela
            <strong>{{ $club->escuela->nombre }}</strong> (CCT <strong>{{ $club->escuela->cct }}</strong>), {{ $club->escuela->municipio }},
            Estado de México, <strong>recibe en resguardo</strong> el kit <strong>«{{ $cfg->kit_nombre ?: 'Kit de la convocatoria' }}»</strong>
            otorgado por el Consejo Mexiquense de Ciencia y Tecnología (COMECYT) en la convocatoria {{ $club->convocatoria->nombre }}, y se
            compromete a <strong>usarlo exclusivamente para las actividades del club</strong>, conservarlo en buen estado y ponerlo a
            disposición del COMECYT cuando lo solicite.
        </p>
    </div>

    <div class="bloque">
        <div class="titulo">Kit</div>
        <table>
            <tr><th>Nombre</th><td>{{ $cfg->kit_nombre ?: '—' }}</td></tr>
            @if ($cfg->kit_descripcion)<tr><th>Contenido</th><td>{{ $cfg->kit_descripcion }}</td></tr>@endif
            <tr><th>Entrega programada</th><td>{{ $club->kit_fecha ? $club->kit_fecha->setTimezone($tz)->format('d/m/Y H:i').' h' : 'Por asignar' }}{{ $club->kit_lugar ? ' · '.$club->kit_lugar : '' }}</td></tr>
        </table>
    </div>

    <div class="bloque">
        <div class="titulo">Integrantes del club</div>
        <table class="integrantes">
            <thead><tr><th style="width:6%">#</th><th>Nombre</th><th style="width:22%">Grado y grupo</th><th style="width:18%">Papel</th></tr></thead>
            <tbody>
                @foreach ($club->integrantes as $n => $i)
                    <tr><td>{{ $n + 1 }}</td><td>{{ $i->nombre }}</td><td>{{ $i->grado_grupo ?: '—' }}</td><td>{{ $i->es_lider ? 'Líder' : 'Integrante' }}</td></tr>
                @endforeach
            </tbody>
        </table>
    </div>

    <table class="firma">
        <tr>
            <td><span class="linea">{{ $club->lider->name }}<br>Nombre y firma del líder del club</span></td>
            <td><span class="linea">Nombre y firma de la autoridad escolar (visto bueno)</span></td>
        </tr>
    </table>

    <div class="pie">Generado por SIDECyT el {{ $fecha->format('d/m/Y H:i') }} · Descárgala, fírmala y súbela al sistema; el COMECYT la valida.</div>
</body>
</html>
