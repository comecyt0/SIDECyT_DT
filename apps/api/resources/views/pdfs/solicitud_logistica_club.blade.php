@php
    // E52 · F3 — Formato de solicitud de transporte y box lunch (uno por evento si la logística es por evento).
    $franja = @file_get_contents(base_path('../web/public/identidad/convivencia-color.png'));
    $franjaUri = $franja ? 'data:image/png;base64,'.base64_encode($franja) : null;
    $tipo = $log->transporte > 0 && $log->lunch > 0 ? 'Transporte y box lunch'
        : ($log->transporte > 0 ? 'Solo transporte' : ($log->lunch > 0 ? 'Solo box lunch' : 'Sin transporte ni box lunch'));
@endphp
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <title>Solicitud de transporte y box lunch — {{ $club->folio }}</title>
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
        th, td { border: 1px solid #d6d1ca; padding: 6px 8px; text-align: left; vertical-align: top; }
        th { background: #f6f1ea; width: 38%; }
        .grande { font-size: 15px; font-weight: bold; color: #56212F; }
        .firma { margin-top: 48px; width: 100%; }
        .firma td { border: 0; text-align: center; width: 50%; padding-top: 50px; }
        .linea { border-top: 1px solid #1f2933; display: inline-block; width: 80%; padding-top: 4px; }
        .pie { position: fixed; bottom: -40px; left: 0; right: 0; text-align: center; font-size: 9px; color: #6b7280; }
    </style>
</head>
<body>
    @if ($franjaUri)
        <div class="franja"><img src="{{ $franjaUri }}" alt="Gobierno del Estado de México y COMECYT"></div>
    @endif

    <h1>SOLICITUD DE TRANSPORTE Y BOX LUNCH</h1>
    <div class="folio">Registro {{ $club->folio }} · {{ $club->convocatoria->nombre }}</div>

    <div class="bloque">
        <div class="titulo">Club</div>
        <table>
            <tr><th>Club</th><td>{{ $club->nombre }}</td></tr>
            <tr><th>Escuela</th><td>{{ $club->escuela->nombre }} (CCT {{ $club->escuela->cct }}) · {{ $club->escuela->municipio }} · Sistema estatal</td></tr>
            <tr><th>Líder</th><td>{{ $club->lider->name }}</td></tr>
            @if ($log->evento)
                <tr><th>Evento</th><td>{{ $log->evento->nombre }}{{ $log->evento->fecha ? ' · '.$log->evento->fecha->format('d/m/Y') : '' }}{{ $log->evento->sede ? ' · '.$log->evento->sede : '' }}</td></tr>
            @endif
        </table>
    </div>

    <div class="bloque">
        <div class="titulo">Lo que se solicita</div>
        <table>
            <tr><th>Tipo de solicitud</th><td class="grande">{{ $tipo }}</td></tr>
            <tr><th>Personas con transporte</th><td class="grande">{{ $log->transporte }}</td></tr>
            <tr><th>Box lunch</th><td class="grande">{{ $log->lunch }}</td></tr>
            <tr><th>Enviada</th><td>{{ $log->enviada_at ? $log->enviada_at->setTimezone('America/Mexico_City')->format('d/m/Y H:i').' h' : '—' }}</td></tr>
        </table>
    </div>

    <p>Confirmo que los datos son correctos y que las personas indicadas asistirán. Cualquier cambio lo haré en el sistema antes de la fecha límite.</p>

    <table class="firma">
        <tr>
            <td><span class="linea">{{ $club->lider->name }}<br>Nombre y firma del líder del club</span></td>
            <td><span class="linea">Nombre y firma de la autoridad escolar (visto bueno)</span></td>
        </tr>
    </table>

    <div class="pie">Generado por SIDECyT el {{ $fecha->format('d/m/Y H:i') }} · Descárgalo, fírmalo y súbelo al sistema; el COMECYT lo valida.</div>
</body>
</html>
