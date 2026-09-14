import type { Metadata } from 'next';
import { INSTITUTION } from '@/lib/institution';

export const metadata: Metadata = {
  title: `Términos y Condiciones — ${INSTITUTION.name}`,
  description: `Términos y condiciones de uso del sistema ${INSTITUTION.name}.`,
};

export default function TerminosPage() {
  return (
    <>
      <h1>Términos y Condiciones de Uso</h1>
      <p className="text-sm text-neutral-500 dark:text-neutral-400">
        Sistema {INSTITUTION.systemTagline}<br />
        <strong>Vigente desde:</strong> 12 de junio de 2026
      </p>

      <hr />

      <h2>1. Aceptación de los Términos</h2>
      <p>
        El uso del sistema {INSTITUTION.name} implica la aceptación plena de los presentes
        Términos y Condiciones, así como del{' '}
        <a href="/privacidad">Aviso de Privacidad</a>. Si no está de acuerdo con cualquiera de
        sus disposiciones, abstenerse de utilizar el sistema.
      </p>

      <h2>2. Definiciones</h2>
      <ul>
        <li>
          <strong>Sistema:</strong> Plataforma web {INSTITUTION.name} que permite la postulación,
          revisión, evaluación y ministración de apoyos institucionales.
        </li>
        <li>
          <strong>Usuario:</strong> Persona física o moral que accede al Sistema, incluyendo
          solicitantes, revisores, evaluadores y administradores.
        </li>
        <li>
          <strong>COMECYT:</strong> {INSTITUTION.fullName}, responsable institucional del Sistema.
        </li>
        <li>
          <strong>Convocatoria:</strong> Llamado público a postular proyectos por un periodo y
          monto determinado.
        </li>
      </ul>

      <h2>3. Cuentas de usuario</h2>
      <ol>
        <li>
          El registro al Sistema requiere aprobación administrativa por parte del COMECYT.
        </li>
        <li>
          El Usuario es responsable de la veracidad de la información proporcionada en el
          registro.
        </li>
        <li>
          La contraseña es personal e intransferible. El Usuario asume responsabilidad por
          cualquier actividad realizada bajo su cuenta.
        </li>
        <li>
          El COMECYT podrá suspender o cancelar cuentas que violen estos Términos, sin
          previo aviso.
        </li>
        <li>
          Se recomienda activar la autenticación de dos factores (2FA) en todas las cuentas
          administrativas.
        </li>
      </ol>

      <h2>4. Uso permitido</h2>
      <p>El Sistema debe utilizarse exclusivamente para:</p>
      <ul>
        <li>Postular proyectos a convocatorias activas del COMECYT.</li>
        <li>Dar seguimiento al estado de las solicitudes propias.</li>
        <li>Revisar y evaluar solicitudes asignadas por el COMECYT (revisores y evaluadores).</li>
        <li>Administrar el ciclo de convocatorias (personal autorizado del COMECYT).</li>
      </ul>

      <h2>5. Uso prohibido</h2>
      <p>El Usuario se compromete a NO:</p>
      <ol>
        <li>
          Compartir credenciales de acceso con terceros.
        </li>
        <li>
          Intentar acceder a información de otros usuarios sin autorización.
        </li>
        <li>
          Realizar ingeniería inversa, escaneo de vulnerabilidades sin autorización formal del
          COMECYT, o intentar evadir los controles de seguridad del Sistema.
        </li>
        <li>
          Subir archivos con virus, malware, o cualquier código malicioso.
        </li>
        <li>
          Proporcionar información falsa, alterada o engañosa en cualquier formulario del
          Sistema.
        </li>
        <li>
          Usar el Sistema para fines distintos a los institucionales del COMECYT.
        </li>
        <li>
          Generar carga abusiva sobre el Sistema (ataques de denegación de servicio,
          scraping masivo, etc.).
        </li>
      </ol>

      <h2>6. Veracidad de la información</h2>
      <ol>
        <li>
          Toda la información proporcionada (datos personales, documentos, datos del proyecto)
          se entiende bajo protesta de decir verdad.
        </li>
        <li>
          La detección de información falsa puede derivar en:
          <ul>
            <li>Rechazo automático de la solicitud.</li>
            <li>Cancelación del apoyo previamente aprobado.</li>
            <li>Inclusión en la <strong>Lista Negra</strong> de empresas vetadas.</li>
            <li>Comunicación a las autoridades competentes para acciones legales.</li>
          </ul>
        </li>
      </ol>

      <h2>7. Documentación y respaldos</h2>
      <ol>
        <li>
          El Usuario es responsable de respaldar copias propias de los documentos y comprobantes
          que sube al Sistema.
        </li>
        <li>
          El Sistema mantiene los documentos por los plazos descritos en el{' '}
          <a href="/privacidad">Aviso de Privacidad</a>.
        </li>
        <li>
          Los archivos deben ser legibles, no estar dañados, y cumplir con los formatos y tamaños
          requeridos por cada convocatoria.
        </li>
      </ol>

      <h2>8. Lista Negra (Sanciones)</h2>
      <p>El COMECYT podrá incluir empresas en Lista Negra por causas como:</p>
      <ul>
        <li>No entrega del informe final en los plazos establecidos.</li>
        <li>Uso de los recursos para fines distintos a los aprobados.</li>
        <li>Información falsa en la postulación.</li>
        <li>Incumplimiento del convenio firmado.</li>
        <li>Cualquier otra causa que determine la dirección del COMECYT.</li>
      </ul>
      <p>
        Las empresas en Lista Negra no podrán postular a nuevas convocatorias durante el periodo
        de la sanción.
      </p>

      <h2>9. Propiedad intelectual</h2>
      <ol>
        <li>
          El Sistema, su código fuente, diseño, marcas y contenidos son propiedad institucional
          del COMECYT (ver archivo LICENSE en el repositorio público).
        </li>
        <li>
          El contenido subido por el Usuario (proyectos, documentos) permanece como propiedad
          del Usuario; sin embargo, el Usuario otorga al COMECYT licencia no exclusiva para
          procesar, almacenar y consultar dicha información para fines administrativos
          conforme al Aviso de Privacidad.
        </li>
      </ol>

      <h2>10. Limitación de responsabilidad</h2>
      <p>
        El COMECYT se esfuerza por mantener el Sistema operativo y seguro. Sin embargo, no se
        garantiza disponibilidad ininterrumpida ni inmunidad a errores. El COMECYT no será
        responsable por:
      </p>
      <ul>
        <li>Pérdida de datos del usuario por falta de respaldos propios.</li>
        <li>Interrupciones temporales por mantenimiento o causas de fuerza mayor.</li>
        <li>Demoras en la dispersión de recursos por causas ajenas (revisión bancaria, etc.).</li>
        <li>Acciones de terceros que comprometan la cuenta del Usuario por mal manejo de
            credenciales.</li>
      </ul>

      <h2>11. Modificaciones a los Términos</h2>
      <p>
        El COMECYT se reserva el derecho de modificar los presentes Términos en cualquier
        momento. Las modificaciones serán publicadas en esta página, indicando la fecha de
        última actualización. El uso continuado del Sistema después de las modificaciones
        constituye aceptación de los nuevos términos.
      </p>

      <h2>12. Ley aplicable y jurisdicción</h2>
      <p>
        Los presentes Términos se rigen por las leyes de los Estados Unidos Mexicanos.
        Cualquier controversia será resuelta por los tribunales competentes del Estado de
        México, renunciando las partes a cualquier otra jurisdicción que pudiera
        corresponderles.
      </p>

      <h2>13. Contacto</h2>
      <p>
        Para cualquier duda o aclaración sobre los presentes Términos:<br />
        Correo: <a href={`mailto:${INSTITUTION.contactEmail}`}>{INSTITUTION.contactEmail}</a><br />
        Portal: https://comecyt.edomex.gob.mx
      </p>

      <hr />

      <p className="text-xs text-neutral-500 dark:text-neutral-400">
        <strong>Nota institucional:</strong> Este documento es una plantilla técnica. El texto
        definitivo debe ser revisado y aprobado por las áreas jurídica y de comunicación del
        COMECYT antes de su publicación formal.
      </p>
    </>
  );
}
