@extends('pdfs.reportes._base')
@section('titulo', $titulo)
@section('contenido')
    <h1>{{ $titulo }}</h1>
    <p class="sub">{{ $filtros !== '' ? $filtros.' · ' : '' }}{{ $items->count() }} folio(s)</p>
    <table class="tabla">
        <thead>
            <tr><th>Folio</th><th>Tipo</th><th>Convocatoria</th><th>Solicitante / líder</th><th>Proyecto / club</th><th>Empresa / escuela</th><th>Estado</th><th>Pública</th><th>Actualizado</th></tr>
        </thead>
        <tbody>
            @foreach ($items as $x)
                <tr>
                    <td><strong>{{ $x['folio'] }}</strong></td>
                    <td>{{ $x['tipo'] === 'club' ? 'Club' : 'Solicitud' }}</td>
                    <td>{{ $x['convocatoria']['nombre'] ?? '—' }}{{ ! empty($x['convocatoria']['periodo']['nombre']) ? ' · '.$x['convocatoria']['periodo']['nombre'] : '' }}</td>
                    <td>{{ $x['user']['name'] ?? '—' }}</td>
                    <td>{{ $x['titulo_proyecto'] ?? '—' }}</td>
                    <td>
                        {{ $x['empresa']['nombre'] ?? '—' }}
                        @if ($x['escuela_nueva'] !== null)
                            <br><span class="pill {{ $x['escuela_nueva'] ? 'mint' : 'gold' }}">{{ $x['escuela_nueva'] ? 'Nueva escuela' : 'Ya participó' }}</span>
                        @endif
                    </td>
                    <td>{{ $x['estado_texto'] }}</td>
                    <td>{{ $x['publicado_en_landing'] ? 'Sí' : 'No' }}</td>
                    <td>{{ $x['updated_at'] ? \Carbon\Carbon::parse($x['updated_at'])->setTimezone('America/Mexico_City')->format('d/m/Y H:i') : '' }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>
@endsection
