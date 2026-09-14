<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Pago Liberado - COMECYT</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
        .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; }
        .header h1 { font-size: 24px; margin-bottom: 10px; font-weight: 600; }
        .content { padding: 30px; }
        .message-box { background-color: #f0fdf4; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; border-radius: 4px; }
        .amount-box { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 20px; border-radius: 4px; margin: 20px 0; text-align: center; }
        .amount-box .label { font-size: 14px; opacity: 0.9; }
        .amount-box .amount { font-size: 36px; font-weight: 700; margin-top: 10px; }
        .info-block { background-color: #f3f4f6; padding: 15px; border-radius: 4px; margin: 15px 0; font-size: 14px; }
        .info-block strong { color: #059669; display: block; margin-bottom: 5px; }
        .account-box { background-color: #f0fdf4; border: 1px solid #10b981; padding: 15px; border-radius: 4px; margin: 15px 0; }
        .account-box strong { color: #059669; }
        .account-field { margin-top: 10px; font-size: 14px; }
        .account-field span { display: inline-block; background-color: #f3f4f6; padding: 6px 12px; border-radius: 4px; font-family: monospace; margin-left: 5px; }
        .button { display: inline-block; background-color: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; margin: 20px 0; font-weight: 500; }
        .button:hover { background-color: #059669; }
        .footer { background-color: #f9fafb; border-top: 1px solid #e5e7eb; padding: 20px 30px; font-size: 12px; color: #6b7280; text-align: center; }
        .footer a { color: #10b981; text-decoration: none; }
        .divider { border: 0; border-top: 1px solid #e5e7eb; margin: 20px 0; }
        .timeline { margin: 20px 0; }
        .timeline-item { border-left: 3px solid #10b981; padding-left: 15px; margin-left: 5px; padding-bottom: 15px; }
        .timeline-item.completed .status { color: #059669; font-weight: 600; }
        .timeline-item.pending .status { color: #6b7280; }
        .timeline-item strong { display: block; color: #1f2937; margin-bottom: 3px; }
        .status { font-size: 13px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>💰 Pago Liberado</h1>
            <p>COMECYT - Sistema de Gestión de Apoyo Científico</p>
        </div>

        <div class="content">
            <div style="font-size: 16px; margin-bottom: 20px;">
                Hola <strong>{{ $user_name }}</strong>,
            </div>

            <p>Te informamos que COMECYT ha <strong>autorizado y liberado</strong> una ministración de fondos para tu proyecto.</p>

            <div class="message-box">
                <strong>✓ Pago Autorizado</strong>
                <p style="margin-top: 10px; font-size: 14px;">
                    Los fondos han sido liberados y se transferirán a la cuenta bancaria de tu institución dentro de 1-3 días hábiles, según tu banco.
                </p>
            </div>

            <div class="amount-box">
                <div class="label">Monto Transferido</div>
                <div class="amount">${{ number_format($monto_ministrado, 2, '.', ',') }}</div>
            </div>

            <div class="info-block">
                <strong>📋 Detalles de la Ministración</strong>
                Folio Solicitud: <code>{{ $folio }}</code><br>
                Proyecto: {{ $titulo_proyecto }}<br>
                Tranche: {{ $numero_tranche }} de {{ $total_tranches }}<br>
                Fecha de Liberación: {{ $fecha_liberacion->format('d/m/Y') }}<br>
                Estado: <strong style="color: #10b981;">✓ PAGADA</strong>
            </div>

            <div class="account-box">
                <strong>🏦 Información de la Transferencia</strong>
                <div class="account-field">
                    <strong>Banco Receptor:</strong> <span>{{ $banco_nombre }}</span>
                </div>
                <div class="account-field">
                    <strong>Número de Cuenta:</strong> <span style="letter-spacing: 2px;">{{ $numero_cuenta }}</span>
                </div>
                <div class="account-field">
                    <strong>Titular:</strong> <span>{{ $titular_cuenta }}</span>
                </div>
                <p style="margin-top: 15px; font-size: 12px; color: #6b7280;">
                    Verifica que estos datos coincidan con los de tu institución. Si hay discrepancias, contacta inmediatamente al equipo de COMECYT.
                </p>
            </div>

            <p style="margin-top: 20px; font-size: 14px; color: #6b7280;">
                <strong>Próximos Pasos:</strong><br>
                @if($total_tranches > $numero_tranche)
                    • Realiza el seguimiento de tu proyecto hasta la siguiente ministración<br>
                    • La próxima ministración se liberará una vez se cumplan los hitos acordados<br>
                @endif
                • Mantén registros detallados del uso de los fondos<br>
                • Prepara reportes de avance según lo establecido en el convenio<br>
                • Consulta tu cuenta bancaria para confirmar la recepción del pago
            </p>

            <div style="background-color: #f0f9ff; border-left: 4px solid #3b82f6; padding: 15px; margin: 15px 0; border-radius: 4px;">
                <strong style="color: #0c2340;">📌 Importante:</strong>
                <p style="font-size: 13px; margin-top: 10px;">Los fondos transferidos deben utilizarse exclusivamente para los fines del proyecto aprobado. COMECYT se reserva el derecho de auditar el uso de los recursos. Mantén toda la documentación relacionada.</p>
            </div>

            @if($total_tranches > $numero_tranche)
            <div class="timeline">
                <strong style="display: block; margin-bottom: 15px; color: #1f2937;">Estado de Ministraciones:</strong>
                @for($i = 1; $i <= $total_tranches; $i++)
                    <div class="timeline-item @if($i <= $numero_tranche) completed @else pending @endif">
                        <strong>Tranche {{ $i }}</strong>
                        <div class="status">
                            @if($i <= $numero_tranche)
                                ✓ Pagada - {{ $fecha_liberacion->format('d/m/Y') }}
                            @else
                                ⏳ Pendiente
                            @endif
                        </div>
                    </div>
                @endfor
            </div>
            @endif

            <div style="text-align: center; margin: 30px 0;">
                <a href="{{ $app_url }}/solicitante/ministeraciones" class="button">
                    Ver Mis Ministraciones
                </a>
            </div>

            <div class="divider"></div>

            <p style="font-size: 14px; color: #6b7280;">
                Si tienes preguntas sobre el pago o tu proyecto, contacta al equipo de COMECYT.<br>
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
