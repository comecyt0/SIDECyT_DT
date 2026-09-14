<x-mail::layout>
    <x-slot:header>
        <div class="header">
            <h1>📬 Solicitud Enviada</h1>
            <p>COMECYT - Sistema de Gestión de Apoyo Científico</p>
        </div>
    </x-slot:header>

    <div class="content">
        <div class="greeting">
            Hola <strong>{{ $user_name }}</strong>,
        </div>

        <p>Nos complace confirmar que tu solicitud ha sido <strong>enviada exitosamente</strong> a revisión documental.</p>

        <div class="message-box success">
            <strong>✓ Solicitud Enviada Correctamente</strong>
            <p style="margin-top: 10px; font-size: 14px;">
                Tu solicitud está en la bandeja de revisión. Los revisores de COMECYT validarán tu documentación en los próximos días.
            </p>
        </div>

        <div class="info-block">
            <strong>📋 Detalles de tu Solicitud</strong>
            Folio: <code>{{ $folio }}</code><br>
            Proyecto: {{ $titulo_proyecto }}<br>
            Monto Solicitado: <strong>${{ number_format($monto_solicitado, 2, '.', ',') }}</strong><br>
            Fecha de Envío: {{ $fecha_envio->format('d/m/Y H:i') }}
        </div>

        <p style="margin-top: 20px; font-size: 14px; color: #6b7280;">
            <strong>¿Qué sigue?</strong><br>
            Un revisor de COMECYT validará que todos tus documentos sean correctos. Si hay observaciones, te notificaremos para que realices las correcciones necesarias. Este proceso suele tomar 5-10 días hábiles.
        </p>

        <div style="text-align: center; margin: 30px 0;">
            <a href="{{ $app_url }}/solicitante/solicitudes/{{ $solicitud_id }}" class="button">
                Ver Detalles de Solicitud
            </a>
        </div>

        <div class="divider"></div>

        <p style="font-size: 14px; color: #6b7280;">
            Si tienes preguntas sobre tu solicitud, puedes acceder al sistema COMECYT y contactar al equipo de soporte.<br>
            <strong>No respondas a este correo</strong> — es un mensaje automático generado por el sistema.
        </p>
    </div>

    <x-slot:footer>
        <p>
            © {{ date('Y') }} COMECYT - Consejo Mexiquense de Ciencia y Tecnología<br>
            <a href="https://comecyt.gob.mx">www.comecyt.gob.mx</a>
        </p>
    </x-slot:footer>
</x-mail::layout>
