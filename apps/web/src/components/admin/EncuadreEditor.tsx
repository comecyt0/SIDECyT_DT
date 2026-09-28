'use client';

import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { Crosshair, Expand, Move, RotateCcw, ScanLine } from 'lucide-react';
import BannerImagen, { ENCUADRE_INICIAL, fondoEsClaro, type Encuadre, type Fondo } from '@/components/ui/BannerImagen';
import { LogoComecyt } from '@/components/branding/Logos';

/**
 * E50 (28/09/2026) — Herramienta de encuadre para las imágenes del carrusel del login.
 * El panel del login cambia de proporción con la pantalla (≈ 2:3 en tablet, 4:5 en laptop, 1:1 en monitor grande),
 * así que no se recorta el archivo: se guarda CÓMO mostrarlo (completa con fondo y margen, o recorte con enfoque y
 * zoom) y la vista previa usa la misma pieza que el login (BannerImagen). Arrastrar, flechas del teclado o tocar.
 */

/** Proporciones reales del banner del login (ancho/alto) medidas en pantallas comunes. */
export const MARCOS = [
  { clave: 'monitor', etiqueta: 'Monitor grande', proporcion: 1.05 },
  { clave: 'laptop', etiqueta: 'Laptop', proporcion: 0.8 },
  { clave: 'tablet', etiqueta: 'Tablet horizontal', proporcion: 0.66 },
] as const;

const FONDOS: { clave: Fondo; etiqueta: string }[] = [
  { clave: 'desenfoque', etiqueta: 'La misma imagen, difuminada' },
  { clave: 'claro', etiqueta: 'Claro' },
  { clave: 'vino', etiqueta: 'Vino institucional' },
];

interface Props {
  src: string;
  valor: Encuadre;
  onChange: (e: Encuadre) => void;
  mostrarTextos: boolean;
  onMostrarTextos: (v: boolean) => void;
  titulo: string;
}

function Marco({ src, e, proporcion, textos, titulo, children, editable = false }: {
  src: string; e: Encuadre; proporcion: number; textos: boolean; titulo: string; children?: React.ReactNode; editable?: boolean;
}) {
  const claro = fondoEsClaro(e);
  return (
    <div className="encuadre-marco" style={{ aspectRatio: String(proporcion) }} data-editable={editable || undefined}>
      <BannerImagen src={src} encuadre={e} />
      <span className="encuadre-scrim" data-textos={textos} aria-hidden="true" />
      {/* Simulación del contenido del login encima: logo, tarjeta de textos (si se muestra) y controles. */}
      <div className="encuadre-sim" aria-hidden="true">
        <LogoComecyt variante={claro ? 'color' : 'negativo'} decorativo className="encuadre-sim-logo" />
        <div className="encuadre-sim-abajo">
          {textos && <div className="encuadre-sim-tarjeta"><span>{titulo || 'Título de la diapositiva'}</span></div>}
          <div className="encuadre-sim-barra"><i /><i /><i /></div>
        </div>
      </div>
      {children}
    </div>
  );
}

export default function EncuadreEditor({ src, valor, onChange, mostrarTextos, onMostrarTextos, titulo }: Props) {
  const e = valor;
  const zona = useRef<HTMLDivElement>(null);
  const arrastre = useRef<{ x: number; y: number; fx: number; fy: number } | null>(null);
  const [arrastrando, setArrastrando] = useState(false);
  const set = (p: Partial<Encuadre>) => onChange({ ...e, ...p });
  const lim = (n: number) => Math.min(100, Math.max(0, Math.round(n)));

  // Arrastrar la imagen mueve el punto de enfoque en sentido contrario (como mover una foto bajo un marco).
  const bajar = (ev: PointerEvent<HTMLDivElement>) => {
    if (e.ajuste !== 'recorte') return;
    ev.currentTarget.setPointerCapture(ev.pointerId);
    arrastre.current = { x: ev.clientX, y: ev.clientY, fx: e.foco_x, fy: e.foco_y };
    setArrastrando(true);
  };
  const mover = (ev: PointerEvent<HTMLDivElement>) => {
    const a = arrastre.current;
    const r = zona.current?.getBoundingClientRect();
    if (!a || !r) return;
    const k = 100 / (e.zoom / 100);
    set({ foco_x: lim(a.fx - ((ev.clientX - a.x) / r.width) * k), foco_y: lim(a.fy - ((ev.clientY - a.y) / r.height) * k) });
  };
  const soltar = () => { arrastre.current = null; setArrastrando(false); };
  const teclado = (ev: KeyboardEvent<HTMLDivElement>) => {
    if (e.ajuste !== 'recorte') return;
    const paso = ev.shiftKey ? 10 : 2;
    const d: Record<string, [number, number]> = { ArrowLeft: [-paso, 0], ArrowRight: [paso, 0], ArrowUp: [0, -paso], ArrowDown: [0, paso] };
    const m = d[ev.key];
    if (!m) return;
    ev.preventDefault();
    set({ foco_x: lim(e.foco_x + m[0]), foco_y: lim(e.foco_y + m[1]) });
  };

  return (
    <div className="encuadre">
      {/* Modo */}
      <div className="seg-tabs encuadre-modo" role="radiogroup" aria-label="Cómo se muestra la imagen">
        <button type="button" role="radio" aria-checked={e.ajuste === 'completa'} onClick={() => set({ ajuste: 'completa' })}>
          <Expand className="h-4 w-4" aria-hidden="true" /> Imagen completa
        </button>
        <button type="button" role="radio" aria-checked={e.ajuste === 'recorte'} onClick={() => set({ ajuste: 'recorte' })}>
          <ScanLine className="h-4 w-4" aria-hidden="true" /> Recortar y enfocar
        </button>
      </div>
      <p className="encuadre-ayuda">
        {e.ajuste === 'completa'
          ? 'La imagen se ve entera en cualquier pantalla. Ideal para banners con texto y para logos.'
          : 'La imagen llena todo el espacio. Arrastra la foto (o usa las flechas) para elegir qué parte se ve y ajusta el zoom.'}
      </p>

      <div className="encuadre-rejilla">
        {/* Editor principal (proporción de laptop, la más común) */}
        <div>
          <div
            ref={zona}
            className="encuadre-zona"
            role={e.ajuste === 'recorte' ? 'application' : undefined}
            aria-label={e.ajuste === 'recorte' ? `Punto de enfoque: ${e.foco_x}% horizontal, ${e.foco_y}% vertical. Usa las flechas para moverlo.` : undefined}
            tabIndex={e.ajuste === 'recorte' ? 0 : -1}
            onPointerDown={bajar}
            onPointerMove={mover}
            onPointerUp={soltar}
            onPointerCancel={soltar}
            onKeyDown={teclado}
            data-arrastrando={arrastrando || undefined}
            data-modo={e.ajuste}
          >
            <Marco src={src} e={e} proporcion={0.8} textos={mostrarTextos} titulo={titulo} editable>
              {e.ajuste === 'recorte' && (
                <span className="encuadre-mira" style={{ left: `${e.foco_x}%`, top: `${e.foco_y}%` }} aria-hidden="true">
                  <Crosshair className="h-5 w-5" />
                </span>
              )}
            </Marco>
          </div>
          {e.ajuste === 'recorte' && (
            <p className="encuadre-ayuda mt-2 flex items-center gap-1.5"><Move className="h-3.5 w-3.5" aria-hidden="true" />Arrastra para mover · Mayús + flecha: pasos grandes</p>
          )}
        </div>

        {/* Controles */}
        <div className="encuadre-controles">
          {e.ajuste === 'recorte' ? (
            <label className="encuadre-control">
              <span>Zoom <strong>{e.zoom}%</strong></span>
              <input type="range" min={100} max={300} step={5} value={e.zoom} onChange={(ev) => set({ zoom: Number(ev.target.value) })} aria-label="Zoom" />
            </label>
          ) : (
            <>
              <fieldset className="encuadre-control">
                <legend>Fondo detrás de la imagen</legend>
                <div className="encuadre-fondos">
                  {FONDOS.map((f) => (
                    <label key={f.clave} className="encuadre-fondo" data-activo={e.fondo === f.clave || undefined}>
                      <input type="radio" name="encuadre-fondo" value={f.clave} checked={e.fondo === f.clave} onChange={() => set({ fondo: f.clave })} className="sr-only" />
                      <span className="encuadre-fondo-muestra" data-fondo={f.clave} aria-hidden="true" />
                      {f.etiqueta}
                    </label>
                  ))}
                </div>
              </fieldset>
              <label className="encuadre-control">
                <span>Margen alrededor <strong>{e.margen}%</strong></span>
                <input type="range" min={0} max={30} step={1} value={e.margen} onChange={(ev) => set({ margen: Number(ev.target.value) })} aria-label="Margen alrededor" />
                <small>Útil para logos: que no toquen los bordes.</small>
              </label>
            </>
          )}
          <label className="encuadre-check">
            <input type="checkbox" checked={mostrarTextos} onChange={(ev) => onMostrarTextos(ev.target.checked)} />
            <span>
              <strong>Mostrar título y textos sobre la imagen</strong>
              <small>Desactívalo si la imagen ya trae su propio texto (flyers y banners).</small>
            </span>
          </label>
          <button type="button" className="encuadre-reset" onClick={() => onChange({ ...ENCUADRE_INICIAL, ajuste: e.ajuste })}>
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /> Restablecer
          </button>
        </div>
      </div>

      {/* Así se verá en distintas pantallas */}
      <div>
        <p className="encuadre-subtitulo">Así se verá en el inicio de sesión</p>
        <div className="encuadre-previas">
          {MARCOS.map((m) => (
            <figure key={m.clave}>
              <Marco src={src} e={e} proporcion={m.proporcion} textos={mostrarTextos} titulo={titulo} />
              <figcaption>{m.etiqueta}</figcaption>
            </figure>
          ))}
        </div>
      </div>
    </div>
  );
}
