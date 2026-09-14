<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Recuperar Contraseña — COMECYT</title>
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
        .header h1 {
            font-size: 22px;
            font-weight: 700;
            margin-bottom: 6px;
        }
        .header p {
            font-size: 14px;
            opacity: 0.8;
        }
        .accent-bar {
            height: 4px;
            background: linear-gradient(90deg, #C9A96E 0%, #e8c98a 50%, #C9A96E 100%);
        }
        .content {
            padding: 36px 30px;
        }
        .greeting {
            font-size: 16px;
            margin-bottom: 20px;
            color: #333;
        }
        .greeting strong {
            color: #6B1F3A;
        }
        .message-box {
            background-color: #fdf8f0;
            border-left: 4px solid #C9A96E;
            padding: 16px 20px;
            margin: 24px 0;
            border-radius: 4px;
        }
        .message-box p {
            font-size: 14px;
            color: #555;
            margin-top: 8px;
        }
        .cta-section {
            text-align: center;
            margin: 32px 0;
        }
        .button {
            display: inline-block;
            background: linear-gradient(135deg, #6B1F3A, #8B2448);
            color: #ffffff !important;
            padding: 14px 36px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            font-size: 15px;
            letter-spacing: 0.3px;
        }
        .expiry-notice {
            text-align: center;
            font-size: 13px;
            color: #9ca3af;
            margin-top: 12px;
        }
        .expiry-notice strong {
            color: #6B1F3A;
        }
        .url-fallback {
            background-color: #f3f4f6;
            border: 1px solid #e5e7eb;
            border-radius: 4px;
            padding: 12px 16px;
            margin: 20px 0;
            font-size: 12px;
            color: #6b7280;
            word-break: break-all;
        }
        .url-fallback strong {
            display: block;
            margin-bottom: 6px;
            color: #374151;
        }
        .divider {
            border: 0;
            border-top: 1px solid #e5e7eb;
            margin: 28px 0;
        }
        .security-notice {
            background-color: #fef2f2;
            border-left: 4px solid #ef4444;
            padding: 14px 16px;
            border-radius: 4px;
            font-size: 13px;
            color: #7f1d1d;
            margin: 20px 0;
        }
        .footer {
            background-color: #f9fafb;
            border-top: 1px solid #e5e7eb;
            padding: 20px 30px;
            font-size: 12px;
            color: #9ca3af;
            text-align: center;
        }
        .footer a {
            color: #C9A96E;
            text-decoration: none;
        }
    </style>
</head>
<body>
    <div class="container">

        <div class="header">
            <div class="header-logo">COMECYT</div>
            <h1>Recuperar Contraseña</h1>
            <p>Sistema de Gestión de Apoyo Científico</p>
        </div>
        <div class="accent-bar"></div>

        <div class="content">
            <div class="greeting">
                Hola,
            </div>

            <p>Recibimos una solicitud para restablecer la contraseña de la cuenta asociada a <strong>{{ $email }}</strong> en el sistema COMECYT.</p>

            <div class="message-box">
                <strong style="color: #6B1F3A;">🔐 Enlace de Recuperación</strong>
                <p>Si tú realizaste esta solicitud, haz clic en el botón a continuación para crear una nueva contraseña.</p>
            </div>

            <div class="cta-section">
                <a href="{{ $url }}" class="button">Restablecer mi Contraseña</a>
                <div class="expiry-notice">
                    Este enlace expira en <strong>60 minutos</strong>.
                </div>
            </div>

            <div class="url-fallback">
                <strong>¿El botón no funciona? Copia y pega este enlace en tu navegador:</strong>
                {{ $url }}
            </div>

            <div class="security-notice">
                <strong>⚠️ Aviso de Seguridad:</strong> Si no solicitaste restablecer tu contraseña, puedes ignorar este correo con seguridad. Tu contraseña actual permanecerá sin cambios. Si crees que tu cuenta ha sido comprometida, contáctanos de inmediato.
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
