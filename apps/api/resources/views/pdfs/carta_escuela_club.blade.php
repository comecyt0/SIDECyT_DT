@php
    // Identidad oficial (E50): franja institucional en el encabezado. Se incrusta como data URI (DomPDF sin red).
    $franja = @file_get_contents(base_path('../web/public/identidad/convivencia-color.png'));
    $franjaUri = $franja ? 'data:image/png;base64,'.base64_encode($franja) : null;
    $nivel = ['primaria' => 'Primaria', 'secundaria' => 'Secundaria', 'media_superior' => 'Media superior', 'superior' => 'Superior'];
@endphp
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <title>Carta de consentimiento — {{ $club->folio }}</title>
    <style>
        @page { margin: 28px 40px 60px; }
        p { text-align: justify; } /* 20/10/2026: texto justificado en todos los formatos */
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
        .firma { margin-top: 40px; width: 100%; }
        .firma td { border: 0; text-align: center; width: 50%; padding-top: 50px; }
        .linea { border-top: 1px solid #1f2933; display: inline-block; width: 80%; padding-top: 4px; }
        .sello { border: 1px dashed #977E5B; height: 90px; width: 150px; margin: 0 auto; color: #977E5B; font-size: 10px; padding-top: 38px; }
        .pie { position: fixed; bottom: -40px; left: 0; right: 0; text-align: center; font-size: 9px; color: #6b7280; }
    </style>
</head>
<body>
    @if ($franjaUri)
        <div class="franja"><img src="{{ $franjaUri }}" alt="Gobierno del Estado de México y COMECYT"></div>
    @endif

    <h1>CARTA DE CONSENTIMIENTO DE LA ESCUELA</h1>
    <div class="folio">Registro {{ $club->folio }} · {{ $club->convocatoria->nombre }}</div>

    <div class="bloque">
        <p>
            Por medio de la presente, la escuela <strong>{{ $club->escuela->nombre }}</strong> (CCT <strong>{{ $club->escuela->cct }}</strong>),
            del sistema <strong>{{ ucfirst($club->escuela->sistema) }}</strong>, ubicada en el municipio de {{ $club->escuela->municipio }},
            Estado de México, <strong>avala la participación</strong> del club <strong>«{{ $club->nombre }}»</strong> en la convocatoria
            <strong>{{ $club->convocatoria->nombre }}</strong> del Consejo Mexiquense de Ciencia y Tecnología (COMECYT), y
            <strong>otorga su consentimiento</strong> para el registro y tratamiento de los datos personales y las fotografías de los
            integrantes enlistados, incluidas las personas menores de edad, con el único fin de gestionar su participación, conforme
            al aviso de privacidad del COMECYT.
        </p>
    </div>

    <div class="bloque">
        <div class="titulo">Datos del club</div>
        <table>
            <tr><th>Club</th><td>{{ $club->nombre }}</td></tr>
            <tr><th>Líder del club</th><td>{{ $club->lider->name }}</td></tr>
            <tr><th>Escuela</th><td>{{ $club->escuela->nombre }} — {{ $nivel[$club->escuela->nivel] ?? $club->escuela->nivel }}</td></tr>
            <tr><th>Integrantes</th><td>{{ $club->integrantes->count() }}</td></tr>
        </table>
    </div>

    <div class="bloque">
        <div class="titulo">Integrantes</div>
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
            <td>{{-- 20/10/2026 (pedido del usuario): nombre del director(a) si está dado de alta; si no, línea para escribirlo --}}<span class="linea">{!! ($dirNombre = \App\Support\FormatosClub::director($club)) ? e($dirNombre).'<br>Director(a) de la escuela · ' : '' !!}{{ $dirNombre ? 'Firma (visto bueno)' : 'Nombre, cargo y firma de la autoridad escolar' }}</span></td>
            <td><div class="sello">Sello de la escuela</div></td>
        </tr>
    </table>

    <div class="pie">Generado por SIDECyT el {{ $fecha->format('d/m/Y H:i') }} · Esta carta debe firmarse y sellarse por la escuela y subirse al sistema.</div>
</body>
</html>
