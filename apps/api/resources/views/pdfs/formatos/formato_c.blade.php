@extends('pdfs.formatos._base')
@php
    $F = \App\Support\FormatosClub::class;
    // Renglones según el club (decisión del usuario): al menos los 10 y 2 del formato; si hay más, la tabla crece.
    $nEst = max(10, $estudiantes->count());
    $nDoc = max(2, $docentes->count());
    $grado = fn ($i) => $i->grado ?: ($i->grupo ? '' : ($i->grado_grupo ?: ''));
@endphp
@section('titulo', 'Formato C · Integración del club de robótica')
@section('contenido')
<div class="compacto">
    <p class="formato">FORMATO C</p>
    <h1>Integración del club de robótica</h1>
    <p class="sub">STEAM EDOMEX Programa Estatal de Robótica</p>

    <p class="derecha">Lugar y fecha: {{ $F::campo($lugar, 160) }}, {{ $F::fechaLarga($fecha) }}</p>

    <div class="titulo">Datos de la institución educativa</div>
    <p class="fila">Nombre de la escuela: {{ $F::campo($escuela?->nombre, 300) }}</p>
    <p class="fila">Clave del Centro de Trabajo (CCT): {{ $F::campo($escuela?->cct, 160) }}</p>
    <p class="fila">Nivel educativo: {{ $F::casilla($nivel === 'primaria') }}Primaria {{ $F::casilla($nivel === 'secundaria') }}Secundaria</p>
    <p class="fila">Subsistema Educativo: {{ $F::casilla($sistema === 'estatal') }}Estatal {{ $F::casilla($sistema === 'federal') }}Federalizado</p>
    <p class="fila">Municipio: {{ $F::campo($escuela?->municipio, 260) }}</p>

    <div class="titulo">Datos del club de robótica</div>
    <p class="fila">Nombre del Club de Robótica: {{ $F::campo($club->nombre, 280) }}</p>

    <div class="titulo">Relación de estudiantes integrantes del club</div>
    <table class="tabla compacta">
        <thead><tr><th style="width: 7%">No.</th><th>Nombre completo del(a) estudiante</th><th style="width: 15%">Grado</th><th style="width: 15%">Grupo</th></tr></thead>
        <tbody>
            @for ($n = 0; $n < $nEst; $n++)
                @php $e = $estudiantes[$n] ?? null; @endphp
                <tr><td>{{ $n + 1 }}</td><td>{{ $e?->nombre }}</td><td>{{ $e ? $grado($e) : '' }}</td><td>{{ $e?->grupo }}</td></tr>
            @endfor
        </tbody>
    </table>

    <div class="titulo">Docentes integrantes del club</div>
    <table class="tabla compacta">
        <thead><tr><th style="width: 7%">No.</th><th>Nombre completo</th><th style="width: 34%">Cargo</th></tr></thead>
        <tbody>
            @for ($n = 0; $n < $nDoc; $n++)
                <tr><td>{{ $n + 1 }}</td><td>{{ $docentes[$n]->nombre ?? '' }}</td><td>Docente integrante del club</td></tr>
            @endfor
        </tbody>
    </table>

    <p>Se expide la presente para los fines de participación en el STEAM EDOMEX Programa Estatal de Robótica, a solicitud de las personas interesadas.</p>

    <table class="firmas salto">
        <tr>
            <td style="width: 58%">
                <p style="text-align: center; margin-bottom: 34px;"><strong>ATENTAMENTE</strong></p>
                <div class="linea-firma">{{ $director ?? 'Nombre de la persona titular de la escuela' }}<br>Director(a) de la Escuela<br>Firma</div>
            </td>
            <td><div class="sello">Sello de la escuela</div></td>
        </tr>
    </table>

    <p class="protesta">Bajo protesta de decir verdad, se certifica que las y los estudiantes señalados, se encuentran inscritos en esta institución educativa y forman parte del Club de Robótica referido.</p>
</div>
@endsection
