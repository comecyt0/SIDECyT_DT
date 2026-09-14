<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Solicitud con Observaciones - COMECYT</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
        .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 30px; text-align: center; }
        .header h1 { font-size: 24px; margin-bottom: 10px; font-weight: 600; }
        .content { padding: 30px; }
        .message-box { background-color: #fffbf0; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px; }
        .info-block { background-color: #f3f4f6; padding: 15px; border-radius: 4px; margin: 15px 0; font-size: 14px; }
        .info-block strong { color: #d97706; display: block; margin-bottom: 5px; }
        .observaciones { background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 15px 0; border-radius: 4px; font-size: 14px; }
        .observaciones strong { color: #d97706; }
        .button { display: inline-block; background-color: #d97706; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; margin: 20px 0; font-weight: 500; }
        .button:hover { background-color: #b45309; }
        .footer { background-color: #f9fafb; border-top: 1px solid #e5e7eb; padding: 20px 30px; font-size: 12px; color: #6b7280; text-align: center; }
        .footer a { color: #d97706; text-decoration: none; }
        .divider { border: 0; border-top: 1px solid #e5e7eb; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>⚠️ Solicitud Devuelta para Correcciones</h1>
            <p>COMECYT - Sistema de Gestión de Apoyo Científico</p>
        </div>

        <div class="content">
            <div style="font-size: 16px; margin-bottom: 20px;">
                Hola <strong>{{ $user_name }}</strong>,
            </div>

            <p>Tu solicitud ha sido <strong>devuelta para correcciones</strong> durante la revisión documental.</p>

            <div class="message-box">
                <strong>⚠️ Se Requieren Correcciones</strong>
                <p style="margin-top: 10px; font-size: 14px;">
                    El revisor de COMECYT ha identificado algunas observaciones que debes subsanar antes de que la solicitud pueda avanzar a evaluación técnica.
                </p>
            </div>

            <div class="info-block">
                <strong>📋 Detalles de tu Solicitud</strong>
                Folio: <code>{{ $folio }}</code><br>
                Proyecto: {{ $titulo_proyecto }}<br>
                Estado Actual: <strong>EN REVISIÓN - OBSERVADA</strong><br>
                Fecha de Observación: {{ $fecha_observacion->format('d/m/Y H:i') }}
            </div>

            <div class="observaciones">
                <strong>📝 Observaciones del Revisor:</strong>
                <div style="margin-top: 10px; white-space: pre-wrap; font-size: 13px;">{{ $observaciones }}</div>
            </div>

            <p style="margin-top: 20px; font-size: 14px; color: #6b7280;">
                <strong>¿Qué hacer ahora?</strong><br>
                1. Revisa cuidadosamente las observaciones listadas arriba<br>
                2. Realiza las correcciones necesarias en tus documentos<br>
                3. Accede al sistema y envía la solicitud nuevamente<br>
                4. Tu solicitud volverá a la bandeja de revisión para validación final
            </p>

            <div style="text-align: center; margin: 30px 0;">
                <a href="{{ $app_url }}/solicitante/solicitudes/{{ $solicitud_id }}" class="button">
                    Ir a mi Solicitud para Corregir
                </a>
            </div>

            <div class="divider"></div>

            <p style="font-size: 14px; color: #6b7280;">
                Si tienes dudas sobre las observaciones, puedes contactar al equipo de soporte de COMECYT a través del sistema.<br>
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
