import type { Metadata } from 'next';
import { INSTITUTION } from '@/lib/institution';

export const metadata: Metadata = {
  title: `Aviso de Privacidad — ${INSTITUTION.name}`,
  description: `Aviso de privacidad integral del sistema ${INSTITUTION.name} conforme a la LFPDPPP y LGPDPPSO.`,
};

export default function PrivacidadPage() {
  return (
    <>
      <h1>Aviso de Privacidad Integral</h1>
      <p className="text-sm text-neutral-500 dark:text-neutral-400">
        Sistema {INSTITUTION.systemTagline}<br />
        <strong>Vigente desde:</strong> 12 de junio de 2026<br />
        <strong>Última actualización:</strong> 12 de junio de 2026
      </p>

      <hr />

      <h2>1. Identidad y domicilio del Responsable</h2>
      <p>
        El <strong>{INSTITUTION.fullName}</strong> ({INSTITUTION.name}), organismo público
        descentralizado del Gobierno del Estado de México, es el responsable del tratamiento de
        los datos personales que se recaban a través del sistema {INSTITUTION.name}.
      </p>
      <p>
        <strong>Domicilio:</strong> [pendiente — capturar domicilio institucional formal]<br />
        <strong>Correo de contacto:</strong> <a href={`mailto:${INSTITUTION.contactEmail}`}>{INSTITUTION.contactEmail}</a><br />
        <strong>Portal institucional:</strong> https://comecyt.edomex.gob.mx
      </p>

      <h2>2. Datos personales que se recaban</h2>
      <p>Para las finalidades descritas en el siguiente apartado, el {INSTITUTION.name} recaba los siguientes datos personales:</p>

      <h3>2.1 Datos de identificación</h3>
      <ul>
        <li>Nombre completo</li>
        <li>Correo electrónico</li>
        <li>Teléfono de contacto</li>
        <li>Cargo o puesto laboral</li>
      </ul>

      <h3>2.2 Datos de la empresa o institución solicitante</h3>
      <ul>
        <li>Razón social</li>
        <li>RFC</li>
        <li>Tipo de persona (física, moral, asociación civil, otro)</li>
        <li>Domicilio fiscal</li>
        <li>Datos del representante legal</li>
        <li>Información de contactos institucionales (responsable, legal, administrativo, técnico)</li>
      </ul>

      <h3>2.3 Datos financieros (cuando aplica)</h3>
      <ul>
        <li>CLABE interbancaria</li>
        <li>Número de cuenta bancaria</li>
        <li>Institución bancaria</li>
        <li>Titular de la cuenta</li>
        <li>Constancia de situación fiscal del SAT</li>
      </ul>

      <h3>2.4 Información del proyecto</h3>
      <ul>
        <li>Descripción del proyecto a postular</li>
        <li>Equipo de trabajo y currículos</li>
        <li>Cronograma y presupuesto</li>
        <li>Documentación técnica relevante</li>
        <li>Informes de avance y final</li>
      </ul>

      <h3>2.5 Datos de uso del sistema</h3>
      <ul>
        <li>Dirección IP</li>
        <li>Navegador y sistema operativo</li>
        <li>Bitácoras de acceso (fecha, hora, acción)</li>
      </ul>

      <p>
        <strong>El {INSTITUTION.name} NO recaba datos personales sensibles.</strong> Esto incluye,
        entre otros, datos relativos a origen racial, opiniones políticas, convicciones religiosas
        o filosóficas, afiliación sindical, salud, vida sexual o información genética y biométrica.
      </p>

      <h2>3. Finalidades del tratamiento</h2>

      <h3>3.1 Finalidades primarias (necesarias para la prestación del servicio)</h3>
      <ul>
        <li>Gestionar el proceso de postulación, evaluación y ministración de apoyos institucionales.</li>
        <li>Generar el folio de seguimiento y dar atención a cada solicitud.</li>
        <li>Comunicarse con el titular para notificar el estado de su solicitud, observaciones,
            aprobaciones, rechazos y vencimientos.</li>
        <li>Realizar el pago de las ministraciones aprobadas a la cuenta bancaria del beneficiario.</li>
        <li>Cumplir con las obligaciones administrativas, contables, fiscales y de transparencia
            del COMECYT.</li>
        <li>Generar reportes estadísticos agregados (sin individualizar al titular).</li>
        <li>Atender requerimientos de autoridades fiscales, judiciales o administrativas conforme
            a la normatividad aplicable.</li>
      </ul>

      <h3>3.2 Finalidades secundarias (no necesarias, requieren consentimiento)</h3>
      <ul>
        <li>Envío de boletines informativos sobre convocatorias futuras.</li>
        <li>Invitaciones a eventos institucionales del COMECYT.</li>
      </ul>
      <p>
        <em>
          El titular puede oponerse a las finalidades secundarias en cualquier momento sin que
          ello afecte la prestación del servicio. Para hacerlo, envíe correo a {INSTITUTION.contactEmail}
          con asunto &ldquo;Oposición a finalidades secundarias&rdquo;.
        </em>
      </p>

      <h2>4. Fundamento legal</h2>
      <p>El tratamiento de los datos personales se realiza con fundamento en:</p>
      <ul>
        <li>Ley Federal de Protección de Datos Personales en Posesión de los Particulares
            (LFPDPPP) y su Reglamento.</li>
        <li>Ley General de Protección de Datos Personales en Posesión de Sujetos Obligados
            (LGPDPPSO).</li>
        <li>Ley de Protección de Datos Personales del Estado de México y Municipios.</li>
        <li>Normatividad institucional del COMECYT.</li>
      </ul>

      <h2>5. Transferencia de datos personales</h2>
      <p>El {INSTITUTION.name} podrá transferir datos personales en los siguientes supuestos:</p>
      <ul>
        <li>A autoridades fiscales (SAT) para cumplir obligaciones tributarias.</li>
        <li>A autoridades administrativas y de transparencia (INAI, INFOEM) cuando lo requieran.</li>
        <li>A instituciones bancarias autorizadas para la dispersión de ministraciones.</li>
        <li>A auditores externos contratados por el COMECYT, bajo acuerdos de confidencialidad.</li>
      </ul>
      <p>
        <strong>NO se realizan transferencias internacionales</strong> de datos personales que requieran
        consentimiento expreso del titular fuera del marco operativo descrito.
      </p>
      <p>
        El uso de la herramienta Sentry (monitoreo de errores técnicos) podría implicar
        transferencia internacional limitada a metadatos técnicos. El sistema implementa
        <strong> redacción agresiva (PII scrubbing) </strong>
        antes del envío para eliminar cualquier dato personal identificable.
      </p>

      <h2>6. Derechos ARCO</h2>
      <p>Como titular de datos personales, tiene derecho a:</p>
      <ul>
        <li><strong>Acceso</strong> — conocer qué datos suyos están en el sistema.</li>
        <li><strong>Rectificación</strong> — corregir datos inexactos o incompletos.</li>
        <li><strong>Cancelación</strong> — solicitar la eliminación de sus datos cuando aplique.</li>
        <li><strong>Oposición</strong> — oponerse al tratamiento para finalidades específicas.</li>
      </ul>

      <p>Para ejercer cualquier derecho ARCO, envíe solicitud a:</p>
      <p>
        <strong>Unidad de Transparencia del COMECYT</strong><br />
        Correo: <a href={`mailto:${INSTITUTION.contactEmail}`}>{INSTITUTION.contactEmail}</a><br />
        Plazo de respuesta: 20 días hábiles conforme al artículo 32 de la LFPDPPP.
      </p>
      <p>
        La solicitud debe incluir: nombre completo, copia de identificación oficial, descripción
        clara y precisa de los datos sobre los que solicita ejercer el derecho, y cualquier
        documento que facilite la localización de los datos.
      </p>

      <h2>7. Plazo de conservación de los datos</h2>
      <p>Los datos personales se conservan por los plazos establecidos en la Ley de Archivos del
      Estado de México y Municipios y normatividad institucional:</p>
      <ul>
        <li><strong>Solicitudes aprobadas:</strong> 10 años a partir del cierre del proyecto.</li>
        <li><strong>Solicitudes rechazadas/canceladas:</strong> 5 años.</li>
        <li><strong>Bitácoras de auditoría:</strong> 90 días en caliente, hasta 5 años en archivo.</li>
        <li><strong>Datos bancarios:</strong> conforme a obligaciones fiscales (típicamente 5 años).</li>
      </ul>

      <h2>8. Medidas de seguridad</h2>
      <p>El {INSTITUTION.name} ha implementado medidas administrativas, físicas y técnicas
         razonables para proteger los datos personales contra daño, pérdida, alteración,
         destrucción o uso, acceso o tratamiento no autorizado, entre las cuales destacan:</p>
      <ul>
        <li>Cifrado de datos en tránsito (HTTPS/TLS 1.2+) y en reposo.</li>
        <li>Autenticación de dos factores (2FA) para cuentas administrativas.</li>
        <li>Limitación de intentos de acceso y bloqueo progresivo de cuentas.</li>
        <li>Bitácoras de auditoría inmutables.</li>
        <li>Respaldos periódicos cifrados.</li>
        <li>Capacitación al personal en protección de datos.</li>
        <li>Procedimientos formales de respuesta a incidentes de seguridad.</li>
      </ul>

      <h2>9. Notificación de cambios al Aviso de Privacidad</h2>
      <p>
        El presente Aviso de Privacidad podrá ser modificado en el futuro. Cualquier cambio será
        publicado en la presente página y comunicado por correo a los titulares al momento del
        siguiente acceso al sistema. La fecha de última actualización aparece al inicio de este
        documento.
      </p>

      <h2>10. Autoridad reguladora</h2>
      <p>
        Si considera que sus derechos han sido vulnerados, puede acudir ante el{' '}
        <strong>Instituto Nacional de Transparencia, Acceso a la Información y Protección de
        Datos Personales (INAI)</strong> o el{' '}
        <strong>Instituto de Transparencia, Acceso a la Información Pública y Protección de
        Datos Personales del Estado de México y Municipios (INFOEM)</strong>.
      </p>
      <ul>
        <li>INAI: <a href="https://home.inai.org.mx" target="_blank" rel="noopener noreferrer">home.inai.org.mx</a></li>
        <li>INFOEM: <a href="https://www.infoem.org.mx" target="_blank" rel="noopener noreferrer">infoem.org.mx</a></li>
      </ul>

      <hr />

      <p className="text-xs text-neutral-500 dark:text-neutral-400">
        <em>
          Este aviso de privacidad cumple con los artículos 16 y 17 de la LFPDPPP. Para más
          información sobre el tratamiento de sus datos personales, contacte a{' '}
          <a href={`mailto:${INSTITUTION.contactEmail}`}>{INSTITUTION.contactEmail}</a>.
        </em>
      </p>
      <p className="text-xs text-neutral-500 dark:text-neutral-400">
        <strong>Nota institucional:</strong> Este documento es una plantilla técnica. El texto definitivo
        debe ser revisado y aprobado por la Unidad de Transparencia del COMECYT antes de su publicación
        formal.
      </p>
    </>
  );
}
