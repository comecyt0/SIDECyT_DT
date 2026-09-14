<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Convenio de Asignación - COMECYT</title>
    <style>
        body { font-family: 'Times New Roman', serif; color: #000; line-height: 1.7; font-size: 13.5px; padding: 40px; }
        .header { text-align: center; margin-bottom: 36px; border-bottom: 2px solid #800020; padding-bottom: 18px; }
        .logo { font-size: 26px; font-weight: bold; color: #800020; margin-bottom: 4px; letter-spacing: 2px; }
        .subtitle { font-size: 12px; color: #555; margin-bottom: 8px; }
        .title { font-size: 15px; font-weight: bold; text-decoration: underline; margin-bottom: 4px; }
        .folio { font-size: 11px; color: #800020; font-family: monospace; }
        .justified { text-align: justify; }
        .clause { font-weight: bold; margin-top: 20px; margin-bottom: 4px; }
        .info-table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 12px; }
        .info-table td { padding: 5px 10px; border: 1px solid #ddd; }
        .info-table td:first-child { font-weight: bold; background: #f9f9f9; width: 38%; }
        .signature-block { margin-top: 60px; width: 100%; }
        .signature-line { border-top: 1px solid #000; width: 220px; text-align: center; padding-top: 6px; font-size: 11px; }
        .footer { margin-top: 50px; font-size: 10px; text-align: center; color: #777; border-top: 1px solid #eee; padding-top: 10px; }
    </style>
</head>
<body>
    <div class="header">
        <div class="logo">COMECYT</div>
        <div class="subtitle">Consejo Mexiquense de Ciencia y Tecnología</div>
        <div class="title">CONVENIO DE ASIGNACIÓN DE RECURSOS</div>
        <div class="folio">Folio: {{ $solicitud->folio }} | Ejercicio: {{ $solicitud->convocatoria?->ejercicio_fiscal ?? date('Y') }}</div>
    </div>

    <div class="justified">
        <p>CONVENIO DE ASIGNACIÓN DE RECURSOS QUE CELEBRAN POR UNA PARTE EL <strong>CONSEJO MEXIQUENSE DE CIENCIA Y TECNOLOGÍA (COMECYT)</strong>, Y POR LA OTRA PARTE LA INSTITUCIÓN
        <strong>{{ $solicitud->institucion?->nombre ?? $solicitud->user->name }}</strong>{{ $solicitud->institucion?->acronimo ? ' (' . $solicitud->institucion->acronimo . ')' : '' }},
        REPRESENTADA POR EL <strong>{{ $solicitud->user->cargo ?? 'Representante Legal' }}</strong>,
        <strong>{{ $solicitud->user->name }}</strong>, PARA EL DESARROLLO DEL PROYECTO DENOMINADO:
        <strong>"{{ $solicitud->titulo_proyecto }}"</strong>.</p>

        <p>Ambas partes reconocen mutuamente su personalidad jurídica y manifiestan su voluntad de cumplir con las obligaciones contraídas en el presente instrumento.</p>
    </div>

    <table class="info-table">
        <tr><td>Folio del Proyecto</td><td>{{ $solicitud->folio }}</td></tr>
        <tr><td>Convocatoria</td><td>{{ $solicitud->convocatoria?->nombre ?? 'N/A' }}</td></tr>
        <tr><td>Institución Beneficiaria</td><td>{{ $solicitud->institucion?->nombre ?? 'N/A' }}</td></tr>
        <tr><td>Responsable del Proyecto</td><td>{{ $solicitud->user->name }}</td></tr>
        <tr><td>Cargo</td><td>{{ $solicitud->user->cargo ?? 'No especificado' }}</td></tr>
        <tr><td>Email de Contacto</td><td>{{ $solicitud->user->email }}</td></tr>
        <tr><td>Monto Asignado</td><td><strong>${{ number_format($solicitud->monto_solicitado ?? 0, 2) }} MXN</strong></td></tr>
        <tr><td>Área de Conocimiento</td><td>{{ $solicitud->areaConocimiento?->nombre ?? 'N/A' }}</td></tr>
        <tr><td>Modalidad</td><td>{{ $solicitud->modalidad ?? 'N/A' }}</td></tr>
    </table>

    <div class="justified">
        <div class="clause">CLÁUSULAS</div>

        <p><strong>PRIMERA. OBJETO DEL CONVENIO.</strong> El objeto del presente convenio es establecer las bases jurídicas y operativas para la asignación y correcto ejercicio de los recursos públicos destinados al apoyo del proyecto citado, bajo el folio <strong>{{ $solicitud->folio }}</strong>, registrado en la convocatoria <strong>{{ $solicitud->convocatoria?->nombre ?? 'vigente' }}</strong>.</p>

        <p><strong>SEGUNDA. MONTO DE LA ASIGNACIÓN.</strong> El COMECYT asignará la cantidad de <strong>${{ number_format($solicitud->monto_solicitado ?? 0, 2) }} MXN</strong> ({{ $solicitud->monto_solicitado ? 'Pesos Mexicanos' : 'por determinar' }}), condicionada a la disponibilidad presupuestal de la institución y el cumplimiento de las Reglas de Operación de la convocatoria.</p>

        <p><strong>TERCERA. OBLIGACIONES DEL BENEFICIARIO.</strong> La institución se compromete a: (1) Destinar los recursos íntegramente al fin solicitado; (2) Llevar control documental de los gastos; (3) Entregar un Informe Final de actividades, evidencias y resultados en un plazo <strong>no mayor a 20 días hábiles</strong> posteriores a la conclusión del evento o proyecto.</p>

        <p><strong>CUARTA. CAUSAS DE RESCISIÓN.</strong> El incumplimiento de cualquier cláusula del presente convenio, así como el uso indebido de los recursos, será motivo de rescisión inmediata, devolución de fondos, y podrá conllevar la inclusión de la institución en el <em>Padrón de Instituciones Inhabilitadas</em> de COMECYT.</p>

        <p><strong>QUINTA. TRANSPARENCIA Y RENDICIÓN DE CUENTAS.</strong> La información relativa a este convenio es pública en términos de la Ley de Transparencia y Acceso a la Información Pública del Estado de México.</p>
    </div>

    <table class="signature-block">
        <tr>
            <td align="center" style="padding: 0 20px;">
                <br><br><br>
                <div class="signature-line">POR EL COMECYT</div>
                <br>
                Director General<br>
                Consejo Mexiquense de Ciencia y Tecnología
            </td>
            <td align="center" style="padding: 0 20px;">
                <br><br><br>
                <div class="signature-line">POR LA INSTITUCIÓN BENEFICIARIA</div>
                <br>
                {{ $solicitud->user->name }}<br>
                {{ $solicitud->user->cargo ?? 'Representante Legal' }}<br>
                {{ $solicitud->institucion?->nombre ?? '' }}
            </td>
        </tr>
    </table>

    @if(isset($firma))
    <div style="margin-top: 30px; border: 1px solid #800020; padding: 12px; background: #fdf8f9;">
        <div style="font-weight: bold; color: #800020; font-size: 11px; margin-bottom: 6px; letter-spacing: 1px;">
            SELLO DIGITAL DEL DOCUMENTO
        </div>
        <table style="font-size: 9px; font-family: monospace; width: 100%;">
            <tr>
                <th style="width: 25%; text-align: left; padding: 2px 4px;">Hash SHA-256:</th>
                <td style="padding: 2px 4px; word-break: break-all;">{{ $firma['hash'] }}</td>
            </tr>
            <tr>
                <th style="text-align: left; padding: 2px 4px;">Timestamp UTC:</th>
                <td style="padding: 2px 4px;">{{ $firma['timestamp'] }}</td>
            </tr>
            <tr>
                <th style="text-align: left; padding: 2px 4px;">Cadena de evidencia:</th>
                <td style="padding: 2px 4px; word-break: break-all;">{{ $firma['sello_evidencia'] }}</td>
            </tr>
            <tr>
                <th style="text-align: left; padding: 2px 4px;">Emisor:</th>
                <td style="padding: 2px 4px;">{{ $firma['emisor'] }}</td>
            </tr>
        </table>
        <p style="font-size: 8.5px; color: #666; margin-top: 6px;">
            Sello criptográfico de integridad. Registro de no-repudio en bitácora bajo el código
            <strong>document.signed.convenio</strong>.
        </p>
    </div>
    @endif

    <div class="footer">
        Documento generado electrónicamente el {{ date('d') }} de {{ date('F') }} de {{ date('Y') }},
        Toluca, Estado de México. | Sistema COMECYT — Folio {{ $solicitud->folio }}
    </div>
</body>
</html>
