@extends('pdfs.reportes._base')
@section('titulo', 'Folio '.($fichas[0]['folio'] ?? ''))
@section('contenido')
    @foreach ($fichas as $n => $f)
        <div class="{{ $n > 0 ? 'salto' : '' }}">
            <h1>Folio {{ $f['folio'] }}</h1>
            <p class="sub">{{ $f['titulo'] }}</p>
            <p>@foreach ($f['etiquetas'] as $e)<span class="pill {{ $e['tono'] }}">{{ $e['texto'] }}</span>@endforeach</p>

            @foreach ($f['secciones'] as $sec)
                <h2>{{ $sec['titulo'] }}</h2>
                <table class="campos">
                    @foreach ($sec['campos'] as $c)
                        <tr><td class="k">{{ $c['etiqueta'] }}</td><td class="v">{{ ($c['valor'] ?? '') !== '' && $c['valor'] !== null ? $c['valor'] : '—' }}</td></tr>
                    @endforeach
                </table>
            @endforeach

            @foreach ($f['tablas'] as $t)
                <h2>{{ $t['titulo'] }}</h2>
                @if (count($t['filas']))
                    <table class="tabla">
                        <thead><tr>@foreach ($t['columnas'] as $col)<th>{{ $col }}</th>@endforeach</tr></thead>
                        <tbody>@foreach ($t['filas'] as $fila)<tr>@foreach ($fila as $celda)<td>{{ $celda }}</td>@endforeach</tr>@endforeach</tbody>
                    </table>
                @else
                    <p class="sub">Sin registros.</p>
                @endif
            @endforeach

            <h2>Historial</h2>
            @if (count($f['historial']))
                <table class="tabla">
                    <thead><tr><th style="width: 16%">Fecha</th><th style="width: 30%">Acción</th><th>Detalle</th><th style="width: 18%">Quién</th></tr></thead>
                    <tbody>@foreach ($f['historial'] as $h)<tr><td>{{ $h['fecha'] }}</td><td>{{ $h['texto'] }}</td><td>{{ $h['detalle'] }}</td><td>{{ $h['quien'] }}</td></tr>@endforeach</tbody>
                </table>
            @else
                <p class="sub">Sin movimientos registrados.</p>
            @endif
        </div>
    @endforeach
@endsection
