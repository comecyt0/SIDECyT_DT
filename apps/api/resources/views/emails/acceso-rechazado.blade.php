<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Actualización sobre tu Solicitud — COMECYT</title>
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
        .info-box {
            background-color: #fdf8f0;
            border-left: 4px solid #C9A96E;
            padding: 16px 20px;
            margin: 20px 0;
            border-radius: 4px;
            font-size: 14px;
            color: #374151;
        }
        .reason-box {
            background-color: #fef9f0;
            border: 1px solid #fcd34d;
            border-radius: 6px;
            padding: 18px 20px;
            margin: 24px 0;
        }
        .reason-box h3 {
            color: #92400e;
            font-size: 13px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 10px;
        }
        .reason-box p {
            font-size: 14px;
            color: #374151;
            line-height: 1.7;
        }
        .contact-box {
            background-color: #f9fafb;
            border-radius: 6px;
            padding: 18px 20px;
            margin: 20px 0;
            font-size: 14px;
            color: #374151;
        }
        .contact-box h3 {
            color: #6B1F3A;
            font-size: 14px;
            margin-bottom: 10px;
        }
        .divider { border: 0; border-top: 1px solid #e5e7eb; margin: 28px 0; }
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
            <div class="header-logo">COMECYT</div>
            <h1>Actualización de tu Solicitud</h1>
            <p>Sistema de Gestión de Apoyo Científico</p>
        </div>
        <div class="accent-bar"></div>

        <div class="content">
            <div class="greeting">
                Hola <strong>{{ $nombre }}</strong>,
            </div>

            <p>Gracias por tu interés en el sistema COMECYT. Después de revisar tu solicitud de acceso, lamentamos informarte que en esta ocasión <strong>no ha sido posible aprobarla</strong>.</p>

            <div class="info-box">
                Valoramos el tiempo que tomaste para registrarte. La decisión fue tomada con base en los criterios de acceso vigentes del sistema.
            </div>

            @if ($motivo_rechazo)
            <div class="reason-box">
                <h3>Motivo del rechazo</h3>
                <p>{{ $motivo_rechazo }}</p>
            </div>
            @endif

            <div class="contact-box">
                <h3>¿Tienes dudas o crees que hay un error?</h3>
                <p>Si consideras que esta decisión es incorrecta o deseas más información, puedes comunicarte con el equipo de COMECYT:</p>
                <ul style="margin-top: 10px; padding-left: 20px; font-size: 14px;">
                    <li>Visita nuestro sitio web: <a href="https://comecyt.gob.mx" style="color: #6B1F3A;">www.comecyt.gob.mx</a></li>
                    <li>O comunícate con la dirección de sistemas COMECYT</li>
                </ul>
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
