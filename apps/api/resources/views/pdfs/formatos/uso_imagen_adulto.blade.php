@extends('pdfs.formatos._base')
@php
    $F = \App\Support\FormatosClub::class;
    $meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
@endphp
@section('titulo', 'Autorización para derechos de uso de imagen')
@section('contenido')
    <h1>Autorización para Derechos de Uso de Imagen</h1>
    <p class="derecha">En {{ $F::campo($lugar, 150) }}, a {{ $fecha->day }} de {{ $meses[$fecha->month - 1] }} de {{ $fecha->year }}.</p>

    <p>Por una parte, EL GOBIERNO DEL ESTADO DE MÉXICO, representado en este acto por el Consejo Mexiquense de Ciencia y Tecnología, con domicilio en Paseo Colón número 112A, col. Ciprés, C.P. 50120, Toluca, Estado de México, en adelante “El COMECyT”.</p>
    <p>Y por la otra el (la) C. {{ $F::campo($persona->nombre, 260) }} con domicilio en {{ $F::campo($persona->domicilio, 260) }}, en adelante “LA PERSONA”; manifiesta su conformidad en suscribir la presente Autorización de Derechos de Uso de Imagen y consentimiento expreso en el tratamiento de datos personales, al tenor de las siguientes:</p>

    <div class="titulo" style="text-align: center; border: 0;">Cláusulas</div>
    <p><strong>PRIMERA.-</strong> “LA PERSONA” en este acto autoriza a “El COMECyT” así como a todas sus instancias, a que derivado de su participación en el evento y/o promocional, indistintamente puedan utilizar todas las imágenes obtenidas de la sesión en modo de video y/o fotográfico en su totalidad o parte de ellas, siendo éstas fijas o en cualquier soporte, y realizadas el mismo día de la firma de la presente autorización, únicamente para fines relacionados con difusión de obra, acciones, redes sociales, boletines de prensa y fines informativos, etc. del Gobierno del Estado de México sin que medie pago o remuneración actual o futura en cualquiera de sus modalidades.</p>
    <p><strong>SEGUNDA.-</strong> “LA PERSONA” manifiesta que las imágenes obtenidas de la sesión no tienen ámbito geográfico determinado, por lo que autoriza a “El COMECyT” así como a todas sus instancias, la utilización en el ámbito Estatal, en la República Mexicana, así como en el extranjero sin limitación geográfica de ninguna clase, mediante la utilización de la tecnología actual y las que pudieran desarrollarse en el futuro para cualquier aplicación.</p>
    <p><strong>TERCERA.-</strong> “LA PERSONA” autoriza y no fija límite de tiempo alguno para la utilización de las imágenes obtenidas de la sesión, por lo que esta autorización de derechos de uso de imagen y consentimiento expreso en el tratamiento de datos personales, se tiene concedida por un plazo de tiempo ilimitado.</p>
    <p>La presente Autorización de Derechos de Uso de Imagen se celebra de conformidad a lo estipulado en los artículos 27, 86 y 87 de la Ley Federal del Derecho de Autor; así como de los artículos 2, 3, 4, 6, 7, 8, 18, 19, 20, 21, 29, 30, 31 y 32, de la Ley de Protección de Datos Personales del Estado de México y Municipios.</p>
    <p>Por lo tanto “LA PERSONA” entiende íntegramente su contenido y naturaleza y está de acuerdo con todos y cada uno de los puntos y que es su deseo firmarla por propia voluntad y sin que medie fuerza ni coacción o intimidación de algún tipo, señalando que conoce y ha leído el Aviso de Privacidad Integral en el siguiente link: https://edomex.gob.mx/aviso_privacidad_gobierno_del_estado_de_mexico</p>

    <table class="firmas salto" style="margin-top: 46px;">
        <tr><td style="width: 60%; margin: 0 auto;"><div class="linea-firma">{{ $persona->nombre }}<br>Firma de “LA PERSONA”</div></td></tr>
    </table>
@endsection
