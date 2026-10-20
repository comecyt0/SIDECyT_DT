@extends('pdfs.formatos._base')
@php
    $F = \App\Support\FormatosClub::class;
    $nDocentes = max(2, $docentes->count());
@endphp
@section('titulo', 'Formato A · Carta de interés de participación')
@section('contenido')
    <p class="formato">FORMATO A</p>
    <h1>Carta de interés de participación</h1>

    <p class="derecha">Lugar y fecha: {{ $F::campo($lugar, 160) }}, {{ $F::fechaLarga($fecha) }}</p>
    <p class="derecha"><strong>Asunto:</strong> Carta de interés de participación en el STEAM EDOMEX Programa Estatal de Robótica</p>

    <p class="destinatario">{{ mb_strtoupper($director_general) }}</p>
    <p class="destinatario">DIRECTOR GENERAL DEL CONSEJO MEXIQUENSE DE CIENCIA Y TECNOLOGÍA (COMECYT)</p>
    <p class="destinatario" style="margin-bottom: 10px;">P R E S E N T E</p>

    <p>Por medio de la presente, quienes suscribimos, manifestamos nuestro interés en participar en el STEAM EDOMEX Programa Estatal de Robótica, con el propósito de fortalecer las habilidades científicas, tecnológicas y de innovación de las y los estudiantes de nuestra institución educativa, mediante el desarrollo de proyectos de robótica educativa y la participación en las actividades, competencias y acciones que se deriven del programa.</p>
    <p>Asimismo, hacemos constar que el club de robótica de nuestra institución se encuentra integrado por estudiantes inscritos en esta escuela y cuenta con el acompañamiento de docentes responsables, por lo que solicitamos atentamente ser considerados para participar en el programa, comprometiéndonos a cumplir con las disposiciones establecidas en las Reglas de Operación, la convocatoria correspondiente y demás normatividad aplicable.</p>
    <p>De igual manera, manifestamos nuestra disposición para colaborar en las actividades académicas, tecnológicas y de seguimiento que determine el COMECYT en el marco del programa.</p>
    <p>Sin otro particular, agradecemos la atención brindada a la presente y quedamos atentos a cualquier información adicional que sea requerida.</p>

    <div class="titulo">Datos de la escuela</div>
    <p class="fila">Nombre de la escuela: {{ $F::campo($escuela?->nombre, 300) }}</p>
    <p class="fila">Clave del Centro de Trabajo (CCT): {{ $F::campo($escuela?->cct, 160) }}</p>
    <p class="fila">Municipio: {{ $F::campo($escuela?->municipio, 260) }}</p>
    <p class="fila">Subsistema Educativo: {{ $F::casilla($sistema === 'estatal') }}Estatal {{ $F::casilla($sistema === 'federal') }}Federalizado</p>
    <p class="fila">Nombre del Club de Robótica: {{ $F::campo($club->nombre, 280) }}</p>

    <table class="tabla salto">
        <tr><th style="width: 45%">Nombre del docente integrante</th><th style="width: 30%">Cargo</th><th>Firma</th></tr>
        @for ($n = 0; $n < $nDocentes; $n++)
            <tr><td>{{ $docentes[$n]->nombre ?? '' }}</td><td>Docente integrante del club</td><td class="firma"></td></tr>
        @endfor
    </table>
    <table class="tabla salto">
        <tr><th style="width: 45%">Nombre de la persona titular de la escuela</th><th style="width: 30%">Cargo</th><th>Firma</th></tr>
        <tr><td>{{ $director ?? '' }}</td><td>Director(a) de la escuela</td><td class="firma"></td></tr>
    </table>

    <table class="firmas salto"><tr><td><div class="sello">Sello</div></td></tr></table>

    <p class="protesta">Bajo protesta de decir verdad, la información contenida en la presente solicitud es verídica y corresponde a la institución educativa participante.</p>
@endsection
