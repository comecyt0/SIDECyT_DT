<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ $subject ?? 'Notificación COMECYT' }}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
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
            background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .header h1 {
            font-size: 24px;
            margin-bottom: 10px;
            font-weight: 600;
        }
        .header p {
            font-size: 14px;
            opacity: 0.9;
        }
        .content {
            padding: 30px;
        }
        .greeting {
            font-size: 16px;
            margin-bottom: 20px;
        }
        .greeting strong {
            color: #1e3c72;
        }
        .message-box {
            background-color: #f9f9f9;
            border-left: 4px solid #2a5298;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }
        .message-box.success {
            border-left-color: #10b981;
            background-color: #f0fdf4;
        }
        .message-box.warning {
            border-left-color: #f59e0b;
            background-color: #fffbf0;
        }
        .message-box.danger {
            border-left-color: #ef4444;
            background-color: #fef2f2;
        }
        .message-box.info {
            border-left-color: #3b82f6;
            background-color: #f0f9ff;
        }
        .info-block {
            background-color: #f3f4f6;
            padding: 15px;
            border-radius: 4px;
            margin: 15px 0;
            font-size: 14px;
        }
        .info-block strong {
            color: #1e3c72;
            display: block;
            margin-bottom: 5px;
        }
        .button {
            display: inline-block;
            background-color: #2a5298;
            color: white;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 4px;
            margin: 20px 0;
            font-weight: 500;
        }
        .button:hover {
            background-color: #1e3c72;
        }
        .button.secondary {
            background-color: #6b7280;
        }
        .button.secondary:hover {
            background-color: #4b5563;
        }
        .footer {
            background-color: #f9fafb;
            border-top: 1px solid #e5e7eb;
            padding: 20px 30px;
            font-size: 12px;
            color: #6b7280;
            text-align: center;
        }
        .footer a {
            color: #2a5298;
            text-decoration: none;
        }
        .footer a:hover {
            text-decoration: underline;
        }
        .divider {
            border: 0;
            border-top: 1px solid #e5e7eb;
            margin: 20px 0;
        }
        .status-badge {
            display: inline-block;
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            margin: 5px 0;
        }
        .status-badge.success {
            background-color: #d1fae5;
            color: #065f46;
        }
        .status-badge.warning {
            background-color: #fef3c7;
            color: #92400e;
        }
        .status-badge.danger {
            background-color: #fee2e2;
            color: #991b1b;
        }
        .status-badge.info {
            background-color: #dbeafe;
            color: #0c2340;
        }
    </style>
</head>
<body>
    <div class="container">
        {{ $slot }}
    </div>
</body>
</html>
