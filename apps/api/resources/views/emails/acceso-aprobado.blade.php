<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Acceso Aprobado — COMECYT</title>
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
        .success-box {
            background-color: #f0fdf4;
            border-left: 4px solid #10b981;
            padding: 18px 20px;
            margin: 24px 0;
            border-radius: 4px;
        }
        .success-box strong { color: #065f46; font-size: 15px; }
        .success-box p { font-size: 14px; color: #374151; margin-top: 8px; }
        .credentials-box {
            background-color: #fdf8f0;
            border: 1px solid #C9A96E;
            border-radius: 6px;
            padding: 20px 24px;
            margin: 24px 0;
        }
        .credentials-box h3 {
            color: #6B1F3A;
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 14px;
        }
        .credential-row {
            display: flex;
            margin-bottom: 10px;
            font-size: 14px;
        }
        .credential-label {
            color: #6b7280;
            min-width: 120px;
            font-weight: 600;
        }
        .credential-value {
            color: #1f2937;
            font-family: monospace;
            background-color: #f3f4f6;
            padding: 2px 8px;
            border-radius: 3px;
        }
        .steps-list {
            background-color: #f9fafb;
            border-radius: 6px;
            padding: 20px 24px;
            margin: 20px 0;
        }
        .steps-list h3 {
            color: #6B1F3A;
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 14px;
        }
        .step {
            display: flex;
            align-items: flex-start;
            margin-bottom: 10px;
            font-size: 14px;
            color: #374151;
        }
        .step-num {
            background-color: #6B1F3A;
            color: white;
            width: 22px;
            height: 22px;
            border-radius: 50%;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 11px;
            font-weight: 700;
            margin-right: 10px;
            flex-shrink: 0;
            margin-top: 1px;
        }
        .cta-section { text-align: center; margin: 30px 0; }
        .button {
            display: inline-block;
            background: linear-gradient(135deg, #6B1F3A, #8B2448);
            color: #ffffff !important;
            padding: 14px 36px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            font-size: 15px;
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
            <h1>¡Bienvenido al Sistema!</h1>
            <p>Tu solicitud de acceso ha sido aprobada</p>
        </div>
        <div class="accent-bar"></div>

        <div class="content">
            <div class="greeting">
                Hola <strong>{{ $nombre }}</strong>,
            </div>

            <p>Nos complace informarte que tu solicitud de acceso al sistema COMECYT ha sido <strong>aprobada</strong>. Ya puedes iniciar sesión y comenzar a gestionar tus solicitudes de apoyo científico.</p>

            <div class="success-box">
                <strong>✓ Acceso Aprobado Exitosamente</strong>
                <p>Tu cuenta ha sido creada y está lista para usar. A continuación encontrarás tus datos de acceso.</p>
            </div>

            <div class="credentials-box">
                <h3>🔑 Tus Credenciales de Acceso</h3>
                <div class="credential-row">
                    <span class="credential-label">Correo:</span>
                    <span class="credential-value">{{ $email }}</span>
                </div>
                <div class="credential-row">
                    <span class="credential-label">Contraseña:</span>
                    <span class="credential-value">La que registraste en tu solicitud</span>
                </div>
            </div>

            <div class="steps-list">
                <h3>¿Cómo empezar?</h3>
                <div class="step">
                    <span class="step-num">1</span>
                    <span>Accede al sistema con tu correo y la contraseña que registraste.</span>
                </div>
                <div class="step">
                    <span class="step-num">2</span>
                    <span>Explora las convocatorias activas disponibles para tu institución.</span>
                </div>
                <div class="step">
                    <span class="step-num">3</span>
                    <span>Crea tu primera solicitud y adjunta la documentación requerida.</span>
                </div>
                <div class="step">
                    <span class="step-num">4</span>
                    <span>Da seguimiento a tu solicitud desde el panel de "Mis Solicitudes".</span>
                </div>
            </div>

            <div class="cta-section">
                <a href="{{ $app_url }}/login" class="button">Iniciar Sesión en COMECYT</a>
            </div>

            <hr class="divider">

            <p style="font-size: 13px; color: #9ca3af;">
                Si tienes dudas o necesitas ayuda, comunícate con el equipo de soporte COMECYT.<br>
                Este es un mensaje automático. <strong>No respondas a este correo.</strong>
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
