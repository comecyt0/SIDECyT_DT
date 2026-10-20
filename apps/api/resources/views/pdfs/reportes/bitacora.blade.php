@extends('pdfs.reportes._base')
@section('titulo', $titulo)
@section('contenido')
    <h1>{{ $titulo }}</h1>
    <p class="sub">{{ $filtros !== '' ? $filtros.' · ' : '' }}{{ $total }} acción(es) · Las más recientes primero.</p>
    @foreach ($dias as $dia => $filas)
        <div class="dia">{{ $dia }} · {{ $filas->count() }} acción(es)</div>
        <table class="tabla">
            <thead><tr><th style="width: 7%">Hora</th><th style="width: 30%">Qué se hizo</th><th style="width: 26%">Quién</th><th style="width: 22%">Sobre qué</th><th>Desde dónde</th></tr></thead>
            <tbody>
                @foreach ($filas as $x)
                    <tr><td>{{ $x['hora'] }}</td><td>{{ $x['accion'] }}</td><td>{{ $x['quien'] }}@if ($x['correo'])<br><span style="color:#6b7280">{{ $x['correo'] }}</span>@endif</td><td>{{ $x['sobre'] }}</td><td>{{ $x['ip'] ?: '—' }}</td></tr>
                @endforeach
            </tbody>
        </table>
    @endforeach
@endsection
