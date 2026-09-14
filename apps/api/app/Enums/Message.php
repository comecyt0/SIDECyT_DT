<?php

namespace App\Enums;

/**
 * COMECYT System Messages Enum
 *
 * Centralized error and success messages to avoid hardcoding strings throughout the codebase
 * Use: Message::SOLICITUD_NO_ENCONTRADA->value or Message::SOLICITUD_NO_ENCONTRADA->message()
 *
 * Last Updated: 2026-04-06
 */
enum Message: string
{
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 🔐 AUTENTICACIÓN Y AUTORIZACIÓN
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    case AUTH_INVALID_CREDENTIALS = 'Las credenciales proporcionadas no son válidas.';
    case AUTH_UNAUTHORIZED = 'No tienes permiso para acceder a este recurso.';
    case AUTH_NO_INSTITUTION = 'No puedes crear solicitudes sin tener una institución asignada en tu perfil.';
    case AUTH_INSTITUTION_BLOCKED = 'Tu institución está inhabilitada para participar en convocatorias COMECYT. Contacta al administrador.';
    case AUTH_TOKEN_INVALID = 'El token de autenticación es inválido o ha expirado.';
    case AUTH_ROLE_REQUIRED = 'Tu rol no permite acceder a este recurso.';

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 📋 SOLICITUDES
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    case SOLICITUD_NO_ENCONTRADA = 'La solicitud solicitada no fue encontrada.';
    case SOLICITUD_NO_EDITABLES = 'La solicitud no puede ser editada en su estado actual.';
    case SOLICITUD_YA_ENVIADA = 'La solicitud ya ha sido enviada y no puede ser modificada.';
    case SOLICITUD_CONVOCATORIA_CERRADA = 'La convocatoria ya no acepta solicitudes.';
    case SOLICITUD_DOCUMENTOS_FALTANTES = 'Faltan documentos obligatorios para enviar la solicitud.';
    case SOLICITUD_MINIMO_EQUIPO = 'Se requieren mínimo {min} miembro(s) del equipo.';
    case SOLICITUD_MAXIMO_EQUIPO = 'No se permiten más de {max} miembros del equipo.';
    case SOLICITUD_EDAD_MINIMA_MIEMBRO = 'Los miembros del equipo deben tener al menos {min} años.';
    case SOLICITUD_EDAD_MAXIMA_MIEMBRO = 'Los miembros del equipo no pueden tener más de {max} años.';
    case SOLICITUD_MONTO_MAXIMO_EXCEDIDO = 'El monto solicitado excede el máximo permitido de ${max}.';

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 📄 DOCUMENTOS
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    case DOCUMENTO_NO_ENCONTRADO = 'El documento solicitado no fue encontrado.';
    case DOCUMENTO_TIPO_INVALIDO = 'El tipo de archivo no es permitido. Solo se aceptan: {tipos}.';
    case DOCUMENTO_TAMANIO_EXCEDIDO = 'El archivo excede el tamaño máximo permitido de {max} MB.';
    case DOCUMENTO_CORRUPTO = 'El archivo parece estar corrupto o no es un documento válido.';
    case DOCUMENTO_MIME_INVALIDO = 'El tipo MIME del archivo no corresponde a su extensión.';
    case DOCUMENTO_NO_PUEDE_ELIMINARSE = 'El documento no puede ser eliminado en este estado.';

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 🔍 REVISIÓN
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    case REVISION_NO_ENCONTRADA = 'La revisión solicitada no fue encontrada.';
    case REVISION_YA_COMPLETADA = 'La revisión ya ha sido completada y no puede ser modificada.';
    case REVISION_OBSERVACION_REQUERIDA = 'Debes agregar una observación al rechazar una solicitud.';
    case REVISION_ESTADO_INVALIDO = 'No puedes cambiar la solicitud a este estado.';

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // ⭐ EVALUACIÓN
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    case EVALUACION_NO_ENCONTRADA = 'La evaluación solicitada no fue encontrada.';
    case EVALUACION_YA_COMPLETADA = 'La evaluación ya ha sido completada.';
    case EVALUACION_PUNTAJE_INVALIDO = 'El puntaje debe estar entre {min} y {max}.';
    case EVALUACION_PONDERACION_INVALIDA = 'La suma de las ponderaciones debe ser exactamente 100%.';
    case EVALUACION_CRITERIOS_INCOMPLETOS = 'Debes evaluar todos los criterios antes de enviar.';
    case EVALUACION_CONFLICTO_INTERES = 'No puedes evaluar solicitudes de tu propia institución.';
    case EVALUACION_INFORME_FALTANTE = 'La fecha límite para entregar el informe final ya pasó.';

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 📜 CONVOCATORIAS
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    case CONVOCATORIA_NO_ENCONTRADA = 'La convocatoria solicitada no fue encontrada.';
    case CONVOCATORIA_NO_ACTIVA = 'La convocatoria no está activa.';
    case CONVOCATORIA_FECHA_VALIDA_REQUERIDA = 'La fecha de apertura no puede ser mayor a la fecha de cierre.';
    case CONVOCATORIA_NOMBRE_REQUERIDO = 'El nombre de la convocatoria es obligatorio.';

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 🎯 PROGRAMAS Y CONFIGURACIÓN
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    case PROGRAMA_NO_ENCONTRADO = 'El programa solicitado no fue encontrado.';
    case PROGRAMA_CLAVE_DUPLICADA = 'Ya existe un programa con esa clave.';
    case PROGRAMA_CAMPO_NO_ENCONTRADO = 'El campo del programa no fue encontrado.';
    case PROGRAMA_DOCUMENTO_NO_ENCONTRADO = 'El documento del programa no fue encontrado.';
    case PROGRAMA_RUBRO_NO_ENCONTRADO = 'El rubro del programa no fue encontrado.';
    case PROGRAMA_CRITERIO_NO_ENCONTRADO = 'El criterio del programa no fue encontrado.';

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 💳 MINISTERACIONES Y PAGOS
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    case MINISTRACION_NO_ENCONTRADA = 'La ministración solicitada no fue encontrada.';
    case MINISTRACION_YA_PAGADA = 'La ministración ya ha sido pagada.';
    case MINISTRACION_ESTADO_INVALIDO = 'No puedes cambiar la ministración a este estado.';
    case CONVENIO_NO_ENCONTRADO = 'El convenio solicitado no fue encontrado.';
    case CONVENIO_YA_EXISTE = 'Ya existe un convenio para esta solicitud.';

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // ✅ MENSAJES DE ÉXITO
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    case SUCCESS_SOLICITUD_CREADA = 'Solicitud creada exitosamente.';
    case SUCCESS_SOLICITUD_ENVIADA = 'Solicitud enviada a revisión.';
    case SUCCESS_DOCUMENTO_CARGADO = 'Documento cargado exitosamente.';
    case SUCCESS_REVISION_COMPLETADA = 'Revisión completada exitosamente.';
    case SUCCESS_EVALUACION_COMPLETADA = 'Evaluación completada exitosamente.';
    case SUCCESS_CONVENIO_GENERADO = 'Convenio generado exitosamente.';
    case SUCCESS_MINISTRACION_CREADA = 'Ministración creada exitosamente.';
    case SUCCESS_INFORME_ENTREGADO = 'Informe final entregado exitosamente.';

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // ⚠️ ADVERTENCIAS
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    case WARNING_SOLICITUD_PRONTO_VENCE = 'La convocatoria vence en menos de {dias} días.';
    case WARNING_DOCUMENTO_PROXIMAMENTE_VENCE = 'Este documento próximamente vencerá.';
    case WARNING_EVALUACION_BAJA_CALIDAD = 'Se detectaron inconsistencias en la evaluación.';

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 🔧 ERRORES DEL SERVIDOR
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    case ERROR_STORAGE = 'Error al guardar el archivo. Intenta nuevamente.';
    case ERROR_DATABASE = 'Error al acceder a la base de datos. Intenta nuevamente.';
    case ERROR_UNKNOWN = 'Ocurrió un error desconocido. Intenta nuevamente más tarde.';
    case ERROR_MAIL = 'Error al enviar el correo electrónico. Intenta nuevamente.';

    /**
     * Get the message with interpolated values
     *
     * @param  array  $params  Parameters to replace in the message
     * @return string The formatted message
     */
    public function format(array $params = []): string
    {
        $message = $this->value;

        foreach ($params as $key => $value) {
            $message = str_replace('{'.$key.'}', $value, $message);
        }

        return $message;
    }
}
