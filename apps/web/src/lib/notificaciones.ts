/**
 * E45: a dónde lleva un aviso del buzón al pulsarlo. Devuelve null si la notificación no es del buzón.
 * El id se valida como entero positivo antes de ponerlo en la URL (el dato viene de la API).
 */
export function hrefBuzon(n: { tipo?: string; conversacion_id?: number | null }, base: string): string | null {
  if (n.tipo !== 'buzon_mensaje') return null;
  const id = Number(n.conversacion_id);
  return Number.isInteger(id) && id > 0 ? `${base}?hilo=${id}` : base;
}
