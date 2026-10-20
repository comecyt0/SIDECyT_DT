@extends('pdfs.formatos._base')
@php
    $F = \App\Support\FormatosClub::class;
    $subsistema = ['estatal' => 'Estatal', 'federal' => 'Federalizado'][$sistema] ?? null;
@endphp
@section('titulo', 'Formato B · Constancia de integración del club de robótica')
@section('contenido')
    <p class="formato">FORMATO B</p>
    <h1>Constancia de integración del club de robótica</h1>
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
    <p class="fila">Número total de estudiantes integrantes: {{ $F::campo($estudiantes->count() ?: null, 80) }}</p>
    <p class="fila">Número de docentes integrantes: {{ $F::campo($docentes->count() ?: null, 80) }}</p>

    <div class="titulo">Constancia</div>
    <p>La persona que suscribe, en mi carácter de Director(a) de la institución educativa antes señalada, hago constar que el Club de Robótica denominado: {{ $F::campo($club->nombre, 260) }}</p>
    <p>se encuentra conformado por estudiantes debidamente inscritos en esta institución educativa pública perteneciente al Subsistema Educativo {{ $F::campo($subsistema, 140) }}, en modalidad escolarizada del Estado de México, así como por docentes adscritos a esta escuela.</p>
    <p>Asimismo, manifiesto que las y los estudiantes integrantes del club cuentan con inscripción vigente durante el ciclo lectivo correspondiente y que la información proporcionada para su participación en el STEAM EDOMEX Programa Estatal de Robótica es veraz y comprobable, de conformidad con las disposiciones aplicables.</p>
    <p>Se expide la presente para los fines de participación en el STEAM EDOMEX Programa Estatal de Robótica, a solicitud de los interesados.</p>

    <table class="firmas salto">
        <tr>
            <td style="width: 58%">
                <p style="text-align: center; margin-bottom: 34px;"><strong>ATENTAMENTE</strong></p>
                <div class="linea-firma">{{ $director ?? 'Nombre de la persona titular de la escuela' }}<br>Director(a) de la Escuela<br>Firma</div>
            </td>
            <td><div class="sello">Sello de la escuela</div></td>
        </tr>
    </table>

    <p class="protesta">Bajo protesta de decir verdad, se certifica hace constar que las y los estudiantes señalados en el Formato C, se encuentran inscritos en esta institución educativa y forman parte del Club de Robótica referido.</p>
@endsection
