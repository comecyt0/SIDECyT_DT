<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Convenio Generado - COMECYT</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
        .header { background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%); color: white; padding: 30px; text-align: center; }
        .header h1 { font-size: 24px; margin-bottom: 10px; font-weight: 600; }
        .content { padding: 30px; }
        .message-box { background-color: #f5f3ff; border-left: 4px solid #7c3aed; padding: 15px; margin: 20px 0; border-radius: 4px; }
        .info-block { background-color: #f3f4f6; padding: 15px; border-radius: 4px; margin: 15px 0; font-size: 14px; }
        .info-block strong { color: #6d28d9; display: block; margin-bottom: 5px; }
        .terms-box { background-color: #f9fafb; border: 1px solid #e5e7eb; padding: 15px; border-radius: 4px; margin: 15px 0; }
        .terms-box strong { color: #6d28d9; }
        .terms-box ul { margin-left: 20px; margin-top: 10px; font-size: 14px; }
        .terms-box li { margin-bottom: 8px; }
        .button { display: inline-block; background-color: #7c3aed; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; margin: 20px 0; font-weight: 500; }
        .button:hover { background-color: #6d28d9; }
        .button.secondary { background-color: #6b7280; }
        .button.secondary:hover { background-color: #4b5563; }
        .footer { background-color: #f9fafb; border-top: 1px solid #e5e7eb; padding: 20px 30px; font-size: 12px; color: #6b7280; text-align: center; }
        .footer a { color: #7c3aed; text-decoration: none; }
        .divider { border: 0; border-top: 1px solid #e5e7eb; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📜 Convenio Generado</h1>
            <p>COMECYT - Sistema de Gestión de Apoyo Científico</p>
        </div>

        <div class="content">
            <div style="font-size: 16px; margin-bottom: 20px;">
                Hola <strong>{{ $user_name }}</strong>,
            </div>

            <p>Te informamos que se ha <strong>generado el convenio formal</strong> entre COMECYT y tu institución para la realización de tu proyecto.</p>

            <div class="message-box">
                <strong>✓ Convenio Listo para Firma</strong>
                <p style="margin-top: 10px; font-size: 14px;">
                    El documento de convenio establece los términos, condiciones y obligaciones de ambas partes. El siguiente paso es la firma electrónica del convenio.
                </p>
            </div>

            <div class="info-block">
                <strong>📋 Detalles del Convenio</strong>
                Folio Solicitud: <code>{{ $folio }}</code><br>
                Número Convenio: <code>{{ $convenio_numero }}</code><br>
                Proyecto: {{ $titulo_proyecto }}<br>
                Monto Aprobado: <strong>${{ number_format($monto_aprobado, 2, '.', ',') }}</strong><br>
                Fecha Generación: {{ $fecha_generacion->format('d/m/Y') }}<br>
                Institución: {{ $institucion_nombre }}
            </div>

            <div class="terms-box">
                <strong>📄 Términos del Convenio:</strong>
                <ul>
                    <li><strong>Monto Total:</strong> ${{ number_format($monto_aprobado, 2, '.', ',') }}</li>
                    <li><strong>Número de Tranches:</strong> {{ $num_tranches }} ministración(es)</li>
                    <li><strong>Vigencia:</strong> {{ $fecha_inicio->format('d/m/Y') }} a {{ $fecha_termino->format('d/m/Y') }}</li>
                    <li><strong>Destino:</strong> Realización del proyecto aprobado por COMECYT</li>
                    <li><strong>Obligaciones:</strong> Entrega de informes de avance y informe final</li>
                    <li><strong>Modalidad de Pago:</strong> Según ministración de fondos</li>
                </ul>
            </div>

            <p style="margin-top: 20px; font-size: 14px; color: #6b7280;">
                <strong>Próximos Pasos:</strong><br>
                1. Accede al sistema para revisar el convenio completo<br>
                2. El representante legal de tu institución deberá firmar electrónicamente<br>
                3. Una vez firmado, se iniciará el proceso de ministración de fondos<br>
                4. La primera ministración se procesará en los próximos 5-10 días hábiles
            </p>

            <div style="text-align: center; margin: 30px 0;">
                <a href="{{ $app_url }}/solicitante/solicitudes/{{ $solicitud_id }}" class="button">
                    Ver Convenio y Firmar
                </a>
                <br>
                <a href="{{ $app_url }}/solicitante/dashboard" class="button secondary" style="background-color: #6b7280;">
                    Ir al Dashboard
                </a>
            </div>

            <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 15px 0; border-radius: 4px;">
                <strong style="color: #92400e;">⚠️ Importante:</strong>
                <p style="font-size: 13px; margin-top: 10px;">El convenio debe ser firmado dentro de 30 días. Transcurrido este plazo, el convenio puede caducar y el apoyo será cancelado. Realiza el trámite de firma lo antes posible.</p>
            </div>

            <div class="divider"></div>

            <p style="font-size: 14px; color: #6b7280;">
                Si tienes preguntas sobre el convenio o necesitas asistencia, contacta al equipo de COMECYT.<br>
                <strong>No respondas a este correo</strong> — es un mensaje automático generado por el sistema.
            </p>
        </div>

        <div class="footer">
            <p>
                © {{ date('Y') }} COMECYT - Consejo Mexiquense de Ciencia y Tecnología<br>
                <a href="https://comecyt.gob.mx">www.comecyt.gob.mx</a>
            </p>
        </div>
    </div>
</body>
</html>
