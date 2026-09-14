<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Nueva Solicitud de Acceso — COMECYT</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f5f5f5;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
        }
        .header {
            background: linear-gradient(135deg, #3A0F22 0%, #6B1F3A 60%, #4A1528 100%);
            color: white;
            padding: 36px 30px;
            text-align: center;
        }
        .header-logo {
            font-size: 13px;
            letter-spacing: 3px;
            text-transform: uppercase;
            opacity: 0.85;
            margin-bottom: 10px;
        }
        .header h1 { font-size: 22px; font-weight: 700; margin-bottom: 6px; }
        .header p { font-size: 14px; opacity: 0.8; }
        .accent-bar {
            height: 4px;
            background: linear-gradient(90deg, #C9A96E 0%, #e8c98a 50%, #C9A96E 100%);
        }
        .content { padding: 36px 30px; }
        .greeting { font-size: 16px; margin-bottom: 20px; }
        .greeting strong { color: #6B1F3A; }
        .message-box {
            background-color: #fdf8f0;
            border-left: 4px solid #C9A96E;
            padding: 16px 20px;
            margin: 20px 0;
            border-radius: 4px;
        }
        .info-table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            font-size: 14px;
        }
        .info-table th {
            background-color: #6B1F3A;
            color: white;
            padding: 10px 14px;
            text-align: left;
            font-weight: 600;
        }
        .info-table td {
            padding: 10px 14px;
            border-bottom: 1px solid #e5e7eb;
            color: #374151;
        }
        .info-table tr:nth-child(even) td { background-color: #f9fafb; }
        .info-table td:first-child { font-weight: 600; color: #6B1F3A; width: 40%; }
        .badge {
            display: inline-block;
            background-color: #fef3c7;
            color: #92400e;
            padding: 4px 10px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 600;
        }
        .cta-section { text-align: center; margin: 28px 0; }
        .button {
            display: inline-block;
            background: linear-gradient(135deg, #6B1F3A, #8B2448);
            color: #ffffff !important;
            padding: 13px 32px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            font-size: 14px;
        }
        .divider { border: 0; border-top: 1px solid #e5e7eb; margin: 24px 0; }
        .footer {
            background-color: #f9fafb;
            border-top: 1px solid #e5e7eb;
            padding: 20px 30px;
            font-size: 12px;
            color: #9ca3af;
            text-align: center;
        }
        .footer a { color: #C9A96E; text-decoration: none; }
    </style>
</head>
<body>
    <div class="container">

        <div class="header">
            <div class="header-logo">COMECYT — Panel Administrativo</div>
            <h1>Nueva Solicitud de Acceso</h1>
            <p>Un usuario requiere aprobación para acceder al sistema</p>
        </div>
        <div class="accent-bar"></div>

        <div class="content">
            <div class="greeting">
                Hola <strong>{{ $admin_name }}</strong>,
            </div>

            <p>Se ha recibido una nueva solicitud de acceso al sistema COMECYT. Revisa los datos del solicitante y toma una decisión.</p>

            <div class="message-box">
                <strong style="color: #6B1F3A;">📋 Datos del Solicitante</strong>
                &nbsp;<span class="badge">Pendiente de Revisión</span>
            </div>

            <table class="info-table">
                <tr>
                    <td>Nombre completo</td>
                    <td>{{ $solicitud->nombre }}</td>
                </tr>
                <tr>
                    <td>Correo electrónico</td>
                    <td>{{ $solicitud->email }}</td>
                </tr>
                <tr>
                    <td>Institución</td>
                    <td>{{ $solicitud->institucion_nombre }}</td>
                </tr>
                @if ($solicitud->cargo)
                <tr>
                    <td>Cargo</td>
                    <td>{{ $solicitud->cargo }}</td>
                </tr>
                @endif
                @if ($solicitud->telefono)
                <tr>
                    <td>Teléfono</td>
                    <td>{{ $solicitud->telefono }}</td>
                </tr>
                @endif
                @if ($solicitud->motivo)
                <tr>
                    <td>Motivo de acceso</td>
                    <td>{{ $solicitud->motivo }}</td>
                </tr>
                @endif
                <tr>
                    <td>Fecha de solicitud</td>
                    <td>{{ $solicitud->created_at->format('d/m/Y H:i') }}</td>
                </tr>
            </table>

            <div class="cta-section">
                <a href="{{ $app_url }}/admin/solicitudes-acceso" class="button">
                    Revisar Solicitud en el Panel
                </a>
            </div>

            <hr class="divider">

            <p style="font-size: 13px; color: #9ca3af;">
                Este es un mensaje automático del sistema COMECYT. <strong>No respondas a este correo.</strong>
            </p>
        </div>

        <div class="footer">
            <p>
                © {{ date('Y') }} COMECYT — Consejo Mexiquense de Ciencia y Tecnología<br>
                <a href="https://comecyt.gob.mx">www.comecyt.gob.mx</a>
            </p>
        </div>

    </div>
</body>
</html>
