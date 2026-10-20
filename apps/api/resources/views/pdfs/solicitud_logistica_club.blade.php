@php
    // E52 · F3 — Formato de solicitud de transporte y box lunch (uno por evento si la logística es por evento).
    // E87 (20/10/2026, pedido del usuario): título «y» con los dos apoyos y «y/o» con uno; los dos renglones siempre (el
    // no incluido como respaldo); «para cuántos» frente a los integrantes del club; salida (líder) y regreso (COMECYT).
    $franja = @file_get_contents(base_path('../web/public/identidad/convivencia-color.png'));
    $franjaUri = $franja ? 'data:image/png;base64,'.base64_encode($franja) : null;
    $daT = (bool) ($cfg->incluye_transporte ?? true);
    $daL = (bool) ($cfg->incluye_lunch ?? true);
    $titulo = $daT && $daL ? 'SOLICITUD DE TRANSPORTE Y BOX LUNCH' : 'SOLICITUD DE TRANSPORTE Y/O BOX LUNCH';
    $n = $club->integrantes->count();
    $tz = 'America/Mexico_City';
    $hora = fn ($f) => $f ? \Illuminate\Support\Carbon::parse($f)->setTimezone($tz)->format('d/m/Y H:i').' h' : 'Por confirmar';
@endphp
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <title>{{ ucfirst(mb_strtolower($titulo)) }} — {{ $club->folio }}</title>
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
        table.servicios th { width: auto; }
        .grande { font-size: 14px; font-weight: bold; color: #56212F; }
        .respaldo { color: #6b7280; font-style: italic; }
        .firma { margin-top: 48px; width: 100%; }
        .firma td { border: 0; text-align: center; width: 50%; padding-top: 50px; }
        .linea { border-top: 1px solid #1f2933; display: inline-block; width: 80%; padding-top: 4px; }
        .pie { position: fixed; bottom: -40px; left: 0; right: 0; text-align: center; font-size: 9px; color: #6b7280; }
        a { color: #56212F; }
    </style>
</head>
<body>
    @if ($franjaUri)
        <div class="franja"><img src="{{ $franjaUri }}" alt="Gobierno del Estado de México y COMECYT"></div>
    @endif

    <h1>{{ $titulo }}</h1>
    <div class="folio">Registro {{ $club->folio }} · {{ $club->convocatoria->nombre }}</div>

    <div class="bloque">
        <div class="titulo">Club</div>
        <table>
            <tr><th>Club</th><td>{{ $club->nombre }} · {{ $n }} integrante(s)</td></tr>
            <tr><th>Escuela</th><td>{{ $club->escuela->nombre }} (CCT {{ $club->escuela->cct }}) · {{ $club->escuela->municipio }} · Sistema estatal</td></tr>
            <tr><th>Líder</th><td>{{ $club->lider->name }}</td></tr>
            @if ($log->evento)
                <tr><th>Evento</th><td>{{ $log->evento->nombre }}{{ $log->evento->fecha ? ' · '.$log->evento->fecha->format('d/m/Y') : '' }}{{ $log->evento->sede ? ' · '.$log->evento->sede : '' }}</td></tr>
            @endif
        </table>
    </div>

    <div class="bloque">
        <div class="titulo">Lo que se solicita</div>
        <table class="servicios">
            <tr><th style="width: 38%">Servicio</th><th>Para cuántos</th></tr>
            <tr><td>Transporte</td><td>{!! $daT ? '<span class="grande">'.e($log->transporte).'</span> de '.e($n).' integrante(s)' : '<span class="respaldo">No incluido en esta convocatoria (respaldo)</span>' !!}</td></tr>
            <tr><td>Box lunch</td><td>{!! $daL ? '<span class="grande">'.e($log->lunch).'</span> de '.e($n).' integrante(s)' : '<span class="respaldo">No incluido en esta convocatoria (respaldo)</span>' !!}</td></tr>
            <tr><td>Enviada</td><td>{{ $log->enviada_at ? $log->enviada_at->setTimezone($tz)->format('d/m/Y H:i').' h' : '—' }}</td></tr>
        </table>
    </div>

    @if ($daT)
        <div class="bloque">
            <div class="titulo">Transporte</div>
            <table>
                <tr><th>Salida (la define el líder)</th><td>{{ $club->transporte_salida_lugar ?: 'Por confirmar' }} · {{ $hora($club->transporte_salida_hora) }}@if ($club->transporte_salida_maps)<br>Mapa: {{ $club->transporte_salida_maps }}@endif</td></tr>
                <tr><th>Regreso (lo define el COMECYT)</th><td>{{ $cfg->transporte_regreso_lugar ?: 'Por confirmar' }} · {{ $hora($cfg->transporte_regreso_hora) }}@if ($cfg->transporte_regreso_maps)<br>Mapa: {{ $cfg->transporte_regreso_maps }}@endif</td></tr>
            </table>
        </div>
    @endif

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
