{{-- E81 (20/10/2026): base de los reportes institucionales (Folios, Historial de acciones). Franja de convivencia arriba,
     línea dorada, título en vino y pie con fecha y página. Todo el texto se escapa con {{ }}. --}}
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <title>@yield('titulo')</title>
    <style>
        @page { margin: 24px 34px 48px; }
        body { font-family: 'Helvetica', sans-serif; color: #1f2933; font-size: 10px; line-height: 1.45; }
        .franja { text-align: center; padding-bottom: 7px; border-bottom: 2px solid #BC955B; margin-bottom: 10px; }
        .franja img { width: 100%; max-width: 640px; }
        p { text-align: justify; } /* 20/10/2026 */
        h1 { font-size: 15px; color: #56212F; margin: 0; }
        .sub { color: #6b7280; font-size: 9.5px; margin: 2px 0 10px; }
        h2 { font-size: 11.5px; color: #56212F; border-left: 4px solid #BC955B; padding-left: 7px; margin: 12px 0 5px; text-transform: uppercase; }
        table.tabla { width: 100%; border-collapse: collapse; }
        table.tabla th { background: #56212F; color: #fff; text-align: left; padding: 5px 6px; font-size: 9.5px; }
        table.tabla td { border-bottom: 1px solid #e3ddd6; padding: 4px 6px; vertical-align: top; font-size: 9.5px; }
        table.tabla tr:nth-child(even) td { background: #faf7f3; }
        .pill { display: inline-block; border-radius: 9px; padding: 1px 7px; font-size: 8.5px; font-weight: bold; margin: 0 3px 3px 0; border: 1px solid #c9c1b8; color: #374151; }
        .pill.emerald { background: #e3f4ec; border-color: #9fd5bb; color: #0b6b45; }
        .pill.red { background: #fde8e8; border-color: #f2b1b1; color: #9b1c1c; }
        .pill.violet { background: #efeafb; border-color: #c9bdf0; color: #4c3b99; }
        .pill.sky { background: #e6f1fb; border-color: #a9cdee; color: #1e5a8a; }
        .pill.gold { background: #fbf2de; border-color: #e4cc8e; color: #7a5a12; }
        .pill.mint { background: #e2f6f2; border-color: #9edbcd; color: #0f6b5a; }
        table.campos { width: 100%; border-collapse: collapse; }
        table.campos td { padding: 3px 6px; vertical-align: top; border-bottom: 1px dotted #ddd5cc; }
        table.campos td.k { width: 26%; color: #6b7280; }
        table.campos td.v { font-weight: bold; }
        .pie { position: fixed; bottom: -30px; left: 0; right: 0; text-align: center; font-size: 8px; color: #6b7280; }
        .pie .pagina:after { content: counter(page); }
        .salto { page-break-before: always; }
        .dia { background: #f3ece4; color: #56212F; font-weight: bold; padding: 4px 6px; margin-top: 10px; }
    </style>
</head>
<body>
    @if ($franja)
        <div class="franja"><img src="{{ $franja }}" alt="Gobierno del Estado de México · Educación · COMECYT"></div>
    @endif
    @yield('contenido')
    <div class="pie">SIDECyT · COMECYT · Generado el {{ $fecha->format('d/m/Y H:i') }} · Página <span class="pagina"></span></div>
</body>
</html>
