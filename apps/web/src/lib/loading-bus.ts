/**
 * Bus mínimo de "hay una acción en curso" fuera de React — lo alimenta el interceptor de
 * axios (`lib/api.ts`) para toda petición que escribe (POST/PUT/PATCH/DELETE) o descarga un
 * archivo, y lo escucha `RouteChangeOverlay` para mostrar la pantalla de carga del sistema.
 * Así "al pulsar botones" aparece sin tocar cada botón. Ver docs/DISENO_UI.md §Pantalla de carga.
 */
type Listener = (pending: number) => void;

let pending = 0;
const listeners = new Set<Listener>();

function emit() {
  for (const fn of listeners) fn(pending);
}

export function beginLoading(): void {
  pending += 1;
  emit();
}

export function endLoading(): void {
  pending = Math.max(0, pending - 1);
  emit();
}

export function subscribeLoading(fn: Listener): () => void {
  listeners.add(fn);
  fn(pending);
  return () => {
    listeners.delete(fn);
  };
}
