'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FileText, Upload, Download, X, ExternalLink, Loader2, RefreshCw } from 'lucide-react';

/**
 * 02/10/2026 — Vista previa de archivos dentro de la página (pedido del usuario: «debe haber vista previa de los archivos
 * que suben antes de mandarlos» y los botones «Ver» deben mostrarlos, no descargarlos).
 *  - `confirmarSubida(file)`: muestra el archivo elegido y resuelve 'subir', 'otro' (abrir el selector otra vez) o 'cancelar'.
 *  - `ver({ cargar, nombre })`: carga el archivo con sesión (Blob) y lo muestra, con opción de descargarlo.
 * PDF en <iframe> con URL blob: (CSP `frame-src 'self' blob:`, aprobado), imágenes en <img>; otros tipos: nombre y tamaño.
 * El Blob se vuelve a tipar (application/pdf o image/*) para que el navegador nunca lo interprete como HTML.
 */
type Tipo = 'pdf' | 'imagen' | 'otro';
interface Estado {
  modo: 'subida' | 'ver';
  nombre: string;
  tamano: number | null;
  tipo: Tipo;
  url: string | null;
  cargando: boolean;
  error: string | null;
  resolver?: (r: ResultadoSubida) => void;
  etiqueta?: string;
  blob?: Blob;
}
export type ResultadoSubida = 'subir' | 'otro' | 'cancelar';
interface Ctx {
  /** `etiqueta`: texto del botón principal (p. ej. «Usar este archivo» si se sube al enviar el formulario). */
  confirmarSubida: (f: File, opciones?: { etiqueta?: string }) => Promise<ResultadoSubida>;
  ver: (o: { cargar: () => Promise<{ data: BlobPart; tipo?: string | null }>; nombre: string }) => Promise<void>;
}

const VistaPreviaContext = createContext<Ctx | null>(null);

function tipoDe(nombre: string, mime?: string | null): Tipo {
  const m = (mime ?? '').toLowerCase();
  if (m.includes('pdf') || /\.pdf$/i.test(nombre)) return 'pdf';
  if (/^image\/(png|jpe?g|webp|gif)$/.test(m) || /\.(png|jpe?g|webp|gif)$/i.test(nombre)) return 'imagen';
  return 'otro';
}
const mimeSeguro = (t: Tipo, nombre: string) => (t === 'pdf' ? 'application/pdf' : t === 'imagen'
  ? (/\.png$/i.test(nombre) ? 'image/png' : /\.webp$/i.test(nombre) ? 'image/webp' : /\.gif$/i.test(nombre) ? 'image/gif' : 'image/jpeg') : 'application/octet-stream');
const tamanoLegible = (n: number | null) => (n === null ? '' : n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`);
const nombreSeguro = (s: string) => s.replace(/[^\p{L}\p{N} ._()-]/gu, '_').slice(0, 120) || 'documento';

/** Sin proveedor (pruebas unitarias): sube directo y «Ver» no hace nada. */
const SIN_PROVEEDOR: Ctx = { confirmarSubida: async () => 'subir', ver: async () => {} };

export function useVistaPrevia(): Ctx {
  return useContext(VistaPreviaContext) ?? SIN_PROVEEDOR;
}

export default function VistaPreviaProvider({ children }: { children: React.ReactNode }) {
  const [e, setE] = useState<Estado | null>(null);
  const principal = useRef<HTMLButtonElement>(null);
  const previo = useRef<Element | null>(null);

  const limpiar = useCallback((x: Estado | null) => { if (x?.url) URL.revokeObjectURL(x.url); }, []);

  const confirmarSubida = useCallback((f: File, opciones?: { etiqueta?: string }) => new Promise<ResultadoSubida>((resolve) => {
    const tipo = tipoDe(f.name, f.type);
    const url = tipo === 'otro' ? null : URL.createObjectURL(new Blob([f], { type: mimeSeguro(tipo, f.name) }));
    previo.current = document.activeElement;
    setE((ant) => { limpiar(ant); ant?.resolver?.('cancelar'); return { modo: 'subida', nombre: f.name, tamano: f.size, tipo, url, cargando: false, error: null, resolver: resolve, etiqueta: opciones?.etiqueta }; });
  }), [limpiar]);

  const ver = useCallback<Ctx['ver']>(async ({ cargar, nombre }) => {
    previo.current = document.activeElement;
    setE((ant) => { limpiar(ant); ant?.resolver?.('cancelar'); return { modo: 'ver', nombre, tamano: null, tipo: tipoDe(nombre), url: null, cargando: true, error: null }; });
    try {
      const r = await cargar();
      const tipo = tipoDe(nombre, r.tipo);
      const blob = new Blob([r.data], { type: mimeSeguro(tipo, nombre) });
      const url = tipo === 'otro' ? null : URL.createObjectURL(blob);
      setE((ant) => {
        if (ant && ant.modo === 'ver' && ant.nombre === nombre) return { ...ant, tipo, url, blob, tamano: blob.size, cargando: false };
        if (url) URL.revokeObjectURL(url); // se cerró o se abrió otro mientras cargaba
        return ant;
      });
    } catch {
      setE((ant) => (ant ? { ...ant, cargando: false, error: 'No se pudo abrir el archivo. Inténtalo de nuevo.' } : ant));
    }
  }, [limpiar]);

  const cerrar = useCallback((r: ResultadoSubida = 'cancelar') => {
    setE((ant) => { ant?.resolver?.(r); limpiar(ant); return null; });
    if (previo.current instanceof HTMLElement) previo.current.focus();
  }, [limpiar]);

  const descargar = () => {
    if (!e?.blob) return;
    const url = URL.createObjectURL(e.blob);
    const a = document.createElement('a');
    a.href = url; a.download = nombreSeguro(e.nombre); a.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    if (!e) return;
    principal.current?.focus();
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') { cerrar('cancelar'); return; }
      if (ev.key !== 'Tab') return;
      const f = Array.from(document.querySelectorAll<HTMLElement>('.vp-dialogo button, .vp-dialogo a[href]'));
      if (!f.length) return;
      const i = f.indexOf(document.activeElement as HTMLElement);
      if (ev.shiftKey && i <= 0) { ev.preventDefault(); f[f.length - 1].focus(); } else if (!ev.shiftKey && i === f.length - 1) { ev.preventDefault(); f[0].focus(); }
    };
    document.addEventListener('keydown', onKey);
    const ov = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ov; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [e?.modo, e?.nombre]);

  return (
    <VistaPreviaContext.Provider value={{ confirmarSubida, ver }}>
      {children}
      {e && typeof document !== 'undefined' && createPortal(
        <div className="vp-fondo" onClick={(ev) => { if (ev.target === ev.currentTarget) cerrar('cancelar'); }}>
          <div className="vp-dialogo" role="dialog" aria-modal="true" aria-labelledby="vp-titulo">
            <header className="vp-cabecera">
              <span className="vp-icono" aria-hidden="true"><FileText /></span>
              <div className="min-w-0 flex-1">
                <p id="vp-titulo" className="truncate text-sm font-bold text-[var(--app-ink)]" title={e.nombre}>{e.modo === 'subida' ? 'Revisa el archivo antes de subirlo' : e.nombre}</p>
                <p className="truncate text-xs text-[var(--app-ink-2)]">{e.modo === 'subida' ? e.nombre : 'Vista previa'}{e.tamano !== null ? ` · ${tamanoLegible(e.tamano)}` : ''}</p>
              </div>
              <button type="button" onClick={() => cerrar('cancelar')} aria-label="Cerrar vista previa" className="vp-cerrar"><X className="h-5 w-5" aria-hidden="true" /></button>
            </header>
            <div className="vp-cuerpo">
              {e.cargando ? (
                <div className="grid h-full place-items-center"><Loader2 className="h-8 w-8 animate-spin text-[var(--app-ink-2)]" aria-label="Cargando archivo" /></div>
              ) : e.error ? (
                <p role="alert" className="grid h-full place-items-center p-6 text-center text-sm" style={{ color: 'var(--auth-danger)' }}>{e.error}</p>
              ) : e.tipo === 'pdf' && e.url ? (
                <iframe src={e.url} title={`Vista previa de ${e.nombre}`} className="h-full w-full border-0 bg-white" />
              ) : e.tipo === 'imagen' && e.url ? (
                // eslint-disable-next-line @next/next/no-img-element -- blob local, no optimizable
                <img src={e.url} alt={`Vista previa de ${e.nombre}`} className="mx-auto max-h-full max-w-full object-contain" />
              ) : (
                <div className="grid h-full place-items-center p-6 text-center">
                  <div><FileText className="mx-auto h-10 w-10 text-[var(--app-ink-2)]" aria-hidden="true" />
                    <p className="mt-3 text-sm font-semibold text-[var(--app-ink)]">Este tipo de archivo no tiene vista previa</p>
                    <p className="text-xs text-[var(--app-ink-2)]">{e.modo === 'subida' ? 'Revisa que el nombre sea el correcto antes de subirlo.' : 'Descárgalo para abrirlo.'}</p></div>
                </div>
              )}
            </div>
            <footer className="vp-pie">
              {e.tipo === 'pdf' && e.url && (
                <a href={e.url} target="_blank" rel="noopener noreferrer" className="vp-enlace"><ExternalLink className="h-4 w-4" aria-hidden="true" />Abrir en otra pestaña</a>
              )}
              <span className="flex-1" />
              {e.modo === 'subida' ? (
                <>
                  <button type="button" className="vp-boton vp-boton-sec" onClick={() => cerrar('otro')}><RefreshCw className="h-4 w-4" aria-hidden="true" />Elegir otro</button>
                  <button ref={principal} type="button" className="vp-boton vp-boton-pri" onClick={() => cerrar('subir')}><Upload className="h-4 w-4" aria-hidden="true" />{e.etiqueta ?? 'Subir este archivo'}</button>
                </>
              ) : (
                <>
                  {e.blob && <button type="button" className="vp-boton vp-boton-sec" onClick={descargar}><Download className="h-4 w-4" aria-hidden="true" />Descargar</button>}
                  <button ref={principal} type="button" className="vp-boton vp-boton-pri" onClick={() => cerrar('cancelar')}>Cerrar</button>
                </>
              )}
            </footer>
          </div>
        </div>,
        document.body,
      )}
    </VistaPreviaContext.Provider>
  );
}
