<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Dictamen Técnico - COMECYT</title>
    <style>
        body { font-family: 'Helvetica', sans-serif; color: #333; line-height: 1.5; font-size: 12px; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #800020; padding-bottom: 10px; }
        .logo { font-size: 24px; font-weight: bold; color: #800020; }
        .title { font-size: 18px; font-weight: bold; margin-bottom: 5px; }
        .folio { color: #666; font-family: monospace; }
        .section { margin-bottom: 20px; }
        .section-title { font-weight: bold; background: #f4f4f4; padding: 5px; border-left: 4px solid #D4AF37; margin-bottom: 10px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background: #f9f9f9; }
        .score-box { text-align: center; font-size: 24px; font-weight: bold; padding: 20px; border: 2px solid #800020; display: inline-block; margin-top: 10px; }
        .status-badge { padding: 5px 10px; border-radius: 4px; font-weight: bold; text-transform: uppercase; }
        .aprobado { background: #d4edda; color: #155724; }
        .rechazado { background: #f8d7da; color: #721c24; }
        .footer { position: fixed; bottom: 0; width: 100%; text-align: center; font-size: 10px; color: #999; border-top: 1px solid #eee; padding-top: 5px; }
    </style>
</head>
<body>
    <div class="header">
        <div class="logo">COMECYT</div>
        <div class="title">DICTAMEN DE EVALUACIÓN TÉCNICO-ACADÉMICA</div>
        <div class="folio">Folio: {{ $dictamen->asignacion->solicitud->folio }}</div>
    </div>

    <div class="section">
        <div class="section-title">DATOS DEL PROYECTO</div>
        <table>
            <tr>
                <th width="30%">Título:</th>
                <td>{{ $dictamen->asignacion->solicitud->titulo_proyecto }}</td>
            </tr>
            <tr>
                <th>Institución:</th>
                <td>{{ $dictamen->asignacion->solicitud->institucion->nombre }}</td>
            </tr>
            <tr>
                <th>Convocatoria:</th>
                <td>{{ $dictamen->asignacion->solicitud->convocatoria->nombre }}</td>
            </tr>
        </table>
    </div>

    <div class="section">
        <div class="section-title">RESULTADOS DE LA EVALUACIÓN (RÚBRICA)</div>
        <table>
            <thead>
                <tr>
                    <th>Criterio de Evaluación</th>
                    <th width="20%" style="text-align: center;">Puntaje (máx. 25)</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>Relevancia Científica / Tecnológica</td>
                    <td style="text-align: center;">{{ $dictamen->criterio_1_puntaje }}</td>
                </tr>
                <tr>
                    <td>Metodología y Diseño del Proyecto</td>
                    <td style="text-align: center;">{{ $dictamen->criterio_2_puntaje }}</td>
                </tr>
                <tr>
                    <td>Impacto Regional y Social</td>
                    <td style="text-align: center;">{{ $dictamen->criterio_3_puntaje }}</td>
                </tr>
                <tr>
                    <td>Viabilidad Técnica y Financiera</td>
                    <td style="text-align: center;">{{ $dictamen->criterio_4_puntaje }}</td>
                </tr>
                <tr style="font-weight: bold; background: #eee;">
                    <td>PUNTAJE TOTAL</td>
                    <td style="text-align: center;">{{ $dictamen->puntaje_total }} / 100</td>
                </tr>
            </tbody>
        </table>
    </div>

    <div class="section">
        <div class="section-title">JUSTIFICACIÓN DEL DICTAMEN</div>
        <div style="padding: 10px; border: 1px solid #eee; min-height: 100px;">
            {{ $dictamen->comentarios_justificacion }}
        </div>
    </div>

    <div style="text-align: center; margin-top: 30px;">
        <p>RESULTADO FINAL DE LA EVALUACIÓN:</p>
        <div class="status-badge {{ $dictamen->sujeto_apoyo ? 'aprobado' : 'rechazado' }}">
            {{ $dictamen->sujeto_apoyo ? 'SUCEPTIBLE DE APOYO' : 'NO SUCEPTIBLE DE APOYO' }}
        </div>
    </div>

    <div class="section" style="margin-top: 40px; border: 1px solid #800020; padding: 12px; background: #fdf8f9;">
        <div style="font-weight: bold; color: #800020; font-size: 11px; margin-bottom: 6px; letter-spacing: 1px;">
            SELLO DIGITAL DEL DOCUMENTO
        </div>
        <table style="font-size: 9px; font-family: monospace;">
            <tr>
                <th style="width: 22%; background: transparent; border: none; padding: 2px 4px;">Hash SHA-256:</th>
                <td style="border: none; padding: 2px 4px; word-break: break-all;">{{ $firma['hash'] ?? '—' }}</td>
            </tr>
            <tr>
                <th style="background: transparent; border: none; padding: 2px 4px;">Algoritmo:</th>
                <td style="border: none; padding: 2px 4px;">{{ $firma['algoritmo'] ?? 'SHA-256' }}</td>
            </tr>
            <tr>
                <th style="background: transparent; border: none; padding: 2px 4px;">Timestamp UTC:</th>
                <td style="border: none; padding: 2px 4px;">{{ $firma['timestamp'] ?? now()->utc()->toIso8601String() }}</td>
            </tr>
            <tr>
                <th style="background: transparent; border: none; padding: 2px 4px;">Cadena de evidencia:</th>
                <td style="border: none; padding: 2px 4px; word-break: break-all;">{{ $firma['sello_evidencia'] ?? '—' }}</td>
            </tr>
            <tr>
                <th style="background: transparent; border: none; padding: 2px 4px;">Emisor:</th>
                <td style="border: none; padding: 2px 4px;">{{ $firma['emisor'] ?? 'COMECYT' }}</td>
            </tr>
            <tr>
                <th style="background: transparent; border: none; padding: 2px 4px;">Evaluador:</th>
                <td style="border: none; padding: 2px 4px;">{{ $dictamen->asignacion->evaluador->name ?? '—' }}</td>
            </tr>
        </table>
        <p style="font-size: 8.5px; color: #666; margin-top: 8px; text-align: justify;">
            Este sello criptográfico permite verificar la integridad del documento. Cualquier alteración del
            contenido invalida el hash. El registro en la bitácora de auditoría del sistema COMECYT bajo el
            código <strong>document.signed.dictamen</strong> sirve como evidencia de no-repudio.
        </p>
    </div>

    <div class="footer">
        Comprobante oficial de evaluación · Sistema COMECYT · Fecha de emisión: {{ date('d/m/Y H:i') }}
    </div>
</body>
</html>
