{{-- E79 (20/10/2026): base de los formatos institucionales. Franja de convivencia arriba, línea dorada, pie con folio.
     Los datos que no existen se dibujan como línea para llenar a mano (FormatosClub::campo). --}}
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <title>@yield('titulo') — {{ $club->folio }}</title>
    <style>
        @page { margin: 26px 48px 56px; }
        body { font-family: 'Helvetica', sans-serif; color: #1f2933; font-size: 11px; line-height: 1.5; }
        .franja { text-align: center; padding-bottom: 8px; border-bottom: 2px solid #BC955B; margin-bottom: 14px; }
        .franja img { width: 100%; max-width: 660px; }
        .formato { text-align: center; font-size: 12px; font-weight: bold; color: #56212F; letter-spacing: 2px; margin: 0; }
        h1 { font-size: 15px; color: #56212F; margin: 2px 0 2px; text-align: center; text-transform: uppercase; }
        .sub { text-align: center; font-weight: bold; font-size: 11px; margin: 0 0 12px; text-transform: uppercase; }
        .derecha { text-align: right; margin: 6px 0 12px; }
        p { margin: 0 0 9px; text-align: justify; }
        .titulo { font-weight: bold; color: #56212F; border-left: 4px solid #BC955B; padding-left: 7px; margin: 12px 0 6px; text-transform: uppercase; font-size: 11px; }
        .fila { margin: 0 0 6px; }
        .dato { font-weight: bold; border-bottom: 1px solid #9aa1a9; padding: 0 3px; }
        .linea { display: inline-block; border-bottom: 1px solid #1f2933; height: 12px; vertical-align: bottom; }
        .caja { display: inline-block; width: 11px; height: 11px; border: 1px solid #1f2933; text-align: center; font-size: 9px; line-height: 11px; font-weight: bold; margin: 0 3px 0 8px; vertical-align: middle; }
        table.tabla { width: 100%; border-collapse: collapse; margin: 4px 0 10px; }
        table.tabla th, table.tabla td { border: 1px solid #8f8f8f; padding: 5px 6px; text-align: left; vertical-align: top; font-size: 10.5px; }
        table.tabla th { background: #f3ece4; color: #56212F; }
        table.tabla td.firma { height: 26px; }
        .firmas { width: 100%; margin-top: 26px; }
        .firmas td { text-align: center; vertical-align: bottom; padding: 0 10px; }
        .linea-firma { border-top: 1px solid #1f2933; padding-top: 4px; font-size: 10.5px; }
        .sello { border: 1px dashed #977E5B; height: 86px; width: 150px; margin: 0 auto; color: #977E5B; font-size: 10px; text-align: center; padding-top: 36px; }
        .protesta { font-size: 10px; font-style: italic; margin-top: 14px; }
        .destinatario { font-weight: bold; margin: 0; }
        .pie { position: fixed; bottom: -36px; left: 0; right: 0; text-align: center; font-size: 8.5px; color: #6b7280; }
        .salto { page-break-inside: avoid; }
        .izq { text-align: left; }
        table.compacta td, table.compacta th { padding: 3px 6px; }
        .compacto .titulo { margin: 8px 0 4px; }
        .compacto .fila { margin: 0 0 3px; }
        .compacto .firmas { margin-top: 10px; }
    </style>
</head>
<body>
    @if ($franja)
        <div class="franja"><img src="{{ $franja }}" alt="Gobierno del Estado de México · Educación · COMECYT"></div>
    @endif

    @yield('contenido')

    <div class="pie">Registro {{ $club->folio }} · Generado por SIDECyT el {{ $fecha->format('d/m/Y H:i') }} · Documento sin edición: fírmalo, séllalo y súbelo en PDF.</div>
</body>
</html>
