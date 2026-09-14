<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Resultado de Evaluación - COMECYT</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
        .header-success { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; }
        .header-rejected { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 30px; text-align: center; }
        .header h1 { font-size: 24px; margin-bottom: 10px; font-weight: 600; }
        .content { padding: 30px; }
        .message-box-success { background-color: #f0fdf4; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; border-radius: 4px; }
        .message-box-rejected { background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; border-radius: 4px; }
        .score-box { background-color: #f3f4f6; padding: 20px; border-radius: 4px; margin: 15px 0; text-align: center; }
        .score-box .score { font-size: 48px; font-weight: 700; color: #1e3c72; }
        .score-box .label { font-size: 14px; color: #6b7280; margin-top: 5px; }
        .info-block { background-color: #f3f4f6; padding: 15px; border-radius: 4px; margin: 15px 0; font-size: 14px; }
        .info-block strong { color: #1e3c72; display: block; margin-bottom: 5px; }
        .button { display: inline-block; background-color: #1e3c72; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; margin: 20px 0; font-weight: 500; }
        .button:hover { background-color: #1a2d56; }
        .footer { background-color: #f9fafb; border-top: 1px solid #e5e7eb; padding: 20px 30px; font-size: 12px; color: #6b7280; text-align: center; }
        .footer a { color: #1e3c72; text-decoration: none; }
        .divider { border: 0; border-top: 1px solid #e5e7eb; margin: 20px 0; }
        .badge { display: inline-block; padding: 8px 16px; border-radius: 20px; font-size: 13px; font-weight: 600; }
        .badge-success { background-color: #d1fae5; color: #065f46; }
        .badge-rejected { background-color: #fee2e2; color: #991b1b; }
    </style>
</head>
<body>
    <div class="container">
        @if($aprobado)
        <div class="header-success">
            <h1>✅ Evaluación Aprobada</h1>
            <p>COMECYT - Sistema de Gestión de Apoyo Científico</p>
        </div>
        @else
        <div class="header-rejected">
            <h1>❌ Evaluación No Aprobada</h1>
            <p>COMECYT - Sistema de Gestión de Apoyo Científico</p>
        </div>
        @endif

        <div class="content">
            <div style="font-size: 16px; margin-bottom: 20px;">
                Hola <strong>{{ $user_name }}</strong>,
            </div>

            @if($aprobado)
            <p>Te informamos que tu solicitud ha sido <strong>evaluada y aprobada</strong>. ¡Felicidades! Tu proyecto cumple con los requisitos técnicos establecidos por COMECYT.</p>

            <div class="message-box-success">
                <strong>✓ Solicitud Aprobada</strong>
                <p style="margin-top: 10px; font-size: 14px;">
                    Tu proyecto ha sido seleccionado para recibir apoyo financiero de COMECYT. Se procederá a la generación del convenio formal en los próximos días.
                </p>
            </div>
            @else
            <p>Te informamos que tu solicitud ha sido <strong>evaluada pero no aprobada</strong> en esta ocasión. Lamentablemente, el proyecto no alcanzó la puntuación mínima requerida.</p>

            <div class="message-box-rejected">
                <strong>✗ Solicitud No Aprobada</strong>
                <p style="margin-top: 10px; font-size: 14px;">
                    Aunque tu proyecto no fue seleccionado esta vez, te invitamos a participar en futuras convocatorias de COMECYT. Puedes revisar los comentarios del evaluador para mejorar tu propuesta.
                </p>
            </div>
            @endif

            <div class="score-box">
                <div class="score">{{ $puntaje_total }}/100</div>
                <div class="label">Puntuación Obtenida</div>
                <div style="margin-top: 10px;">
                    <span class="badge @if($aprobado) badge-success @else badge-rejected @endif">
                        @if($aprobado) APROBADO (≥80) @else NO APROBADO (<80) @endif
                    </span>
                </div>
            </div>

            <div class="info-block">
                <strong>📋 Detalles de tu Evaluación</strong>
                Folio: <code>{{ $folio }}</code><br>
                Proyecto: {{ $titulo_proyecto }}<br>
                Evaluador: {{ $evaluador_nombre }}<br>
                Fecha de Evaluación: {{ $fecha_evaluacion->format('d/m/Y H:i') }}<br>
                Puntaje Mínimo Requerido: <strong>80 puntos</strong>
            </div>

            @if($comentarios_evaluador)
            <div style="background-color: #f0f9ff; border-left: 4px solid #3b82f6; padding: 15px; margin: 15px 0; border-radius: 4px;">
                <strong style="color: #0c2340;">💭 Comentarios del Evaluador:</strong>
                <div style="margin-top: 10px; white-space: pre-wrap; font-size: 13px;">{{ $comentarios_evaluador }}</div>
            </div>
            @endif

            @if($aprobado)
            <p style="margin-top: 20px; font-size: 14px; color: #6b7280;">
                <strong>Próximos Pasos:</strong><br>
                1. Se generará tu convenio formal en los próximos 3-5 días hábiles<br>
                2. Recibirás notificación cuando el convenio esté listo<br>
                3. Se procederá a la liberación de fondos según lo acordado<br>
                4. Mantente atento a las comunicaciones de COMECYT
            </p>
            @else
            <p style="margin-top: 20px; font-size: 14px; color: #6b7280;">
                <strong>¿Qué hacer ahora?</strong><br>
                • Revisa los comentarios del evaluador cuidadosamente<br>
                • Mejora tu propuesta considerando el feedback recibido<br>
                • Consulta próximas convocatorias en el sistema COMECYT<br>
                • Contáctanos si tienes preguntas sobre la evaluación
            </p>
            @endif

            <div style="text-align: center; margin: 30px 0;">
                <a href="{{ $app_url }}/solicitante/solicitudes/{{ $solicitud_id }}" class="button">
                    Ver Detalles Completos
                </a>
            </div>

            <div class="divider"></div>

            <p style="font-size: 14px; color: #6b7280;">
                Si tienes dudas sobre tu evaluación, puedes contactar al equipo de soporte de COMECYT.<br>
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
