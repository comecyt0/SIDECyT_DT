/**
 * Errores de guardado de un formulario, en lenguaje de la persona (29/09/2026, reporte del usuario: "Crear usuario" se
 * quedaba en el último paso con un 422 en consola y sin decir qué corregir).
 *
 * Convierte la respuesta del servidor en: una línea por problema con el nombre del campo tal como se ve en pantalla,
 * los errores por campo (para marcar cada input) y el paso del formulario donde se corrige el primero. Así el marco por
 * pasos (`StepFrame` con `error` + `errorStep`) regresa a ese paso y lo muestra dentro de la ventana, no detrás.
 */

export interface ErroresFormulario {
  /** Resumen para el encabezado del aviso. */
  titulo: string;
  /** Una línea por problema: "Correo electrónico: ya está registrado." */
  lineas: string[];
  /** Errores por campo (clave del servidor → mensaje), para marcar cada input. */
  campos: Record<string, string>;
  /** Clave del paso donde está el primer campo con error (o null si no se sabe). */
  paso: string | null;
}

/**
 * 16/10/2026 (reporte del usuario: un aviso mostraba «validation.regex»): ningún texto técnico llega a la persona.
 * Una clave de traducción sin traducir («validation.regex», «passwords.token») o un mensaje por defecto de Laravel en
 * inglés se cambia por un texto en español. El API ya trae sus traducciones (lang/es); esto es la segunda red.
 */
export function textoLegible(mensaje: string, porDefecto = 'Revisa este dato: no tiene el formato esperado.'): string {
  const m = mensaje.trim();
  const partes = m.split('.');
  if (partes.length > 1 && partes.every((p) => /^[a-z0-9_]+$/i.test(p))) return porDefecto;
  if (/^(The |This |Validation failed|Server Error|The given data was invalid|Unauthenticated|Too Many Attempts)/.test(m)) return porDefecto;
  return m;
}

// Algunos controladores antiguos responden `{ error: '...' }` en lugar de `{ message }`; se aceptan ambos.
type RespuestaError = { response?: { status?: number; data?: { message?: string; error?: string; errors?: Record<string, unknown> } } };

/**
 * Mensaje de error en una línea para avisos simples (acciones fuera de un formulario por pasos). Toma los errores de
 * validación del servidor (`errors`), luego `message` y luego `error`; si nada sirve, usa `porDefecto`.
 */
export function mensajeError(e: unknown, porDefecto: string): string {
  const r = erroresFormulario(e);
  const generico = r.titulo === 'No se pudo guardar.';
  if (generico) return porDefecto;
  return r.lineas.length && r.titulo.startsWith('Hay ') ? r.lineas.join(' · ') : [r.titulo, ...r.lineas].join(' ');
}

/**
 * @param etiquetas nombre visible de cada campo ("email" → "Correo electrónico"). Para listas ("periodo_ids.0") basta la raíz.
 * @param pasoDeCampo en qué paso vive cada campo ("email" → "cuenta").
 */
export function erroresFormulario(
  e: unknown,
  etiquetas: Record<string, string> = {},
  pasoDeCampo: Record<string, string> = {},
): ErroresFormulario {
  const r = (e as RespuestaError)?.response;
  const status = r?.status;
  const errors = r?.data?.errors && typeof r.data.errors === 'object' ? r.data.errors : null;

  if (!r) {
    return { titulo: 'No hay conexión con el servidor.', lineas: ['Revisa tu conexión a internet e inténtalo de nuevo; no se guardó nada.'], campos: {}, paso: null };
  }
  if (status === 429) return { titulo: 'Demasiados intentos seguidos.', lineas: ['Espera un minuto y vuelve a intentarlo.'], campos: {}, paso: null };
  if (status === 403) return { titulo: r.data?.message || r.data?.error || 'No tienes permiso para hacer esto.', lineas: [], campos: {}, paso: null };

  if (errors) {
    const campos: Record<string, string> = {};
    const lineas: string[] = [];
    let paso: string | null = null;
    for (const [clave, valor] of Object.entries(errors)) {
      const crudo = Array.isArray(valor) ? String(valor[0] ?? '') : String(valor ?? '');
      const mensaje = crudo ? textoLegible(crudo) : '';
      if (!mensaje) continue;
      const raiz = clave.split('.')[0];
      campos[clave] = mensaje;
      if (!(raiz in campos)) campos[raiz] = mensaje;
      const nombre = etiquetas[clave] ?? etiquetas[raiz];
      lineas.push(nombre ? `${nombre}: ${mensaje}` : mensaje);
      if (paso === null && (pasoDeCampo[clave] || pasoDeCampo[raiz])) paso = pasoDeCampo[clave] ?? pasoDeCampo[raiz];
    }
    if (lineas.length) {
      return { titulo: lineas.length === 1 ? 'Hay un dato por corregir.' : `Hay ${lineas.length} datos por corregir.`, lineas, campos, paso };
    }
  }

  const msg = r.data?.message || (typeof r.data?.error === 'string' ? r.data.error : undefined);
  const legible = msg && status !== 500 && textoLegible(msg, '') !== '';
  return {
    titulo: legible ? msg! : 'No se pudo guardar.',
    lineas: legible ? [] : ['Ocurrió un problema en el servidor. Inténtalo de nuevo en un momento; si continúa, avisa al administrador.'],
    campos: {},
    paso: null,
  };
}
