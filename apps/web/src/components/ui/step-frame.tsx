'use client';

import { useState, type ReactNode } from 'react';
import { Check, ChevronLeft, ChevronRight, Lightbulb, Loader2, X } from 'lucide-react';

/**
 * Marco por pasos para TODOS los formularios de crear / editar del sistema (14/09/2026, referencia
 * del usuario): lista de pasos a la izquierda, "PASO n DE N" + pregunta guía a la derecha, aviso de
 * contexto arriba y Cancelar / Siguiente / Guardar abajo. Sin jerga: cada paso se titula con lo que
 * la persona tiene que decidir, no con el nombre del campo.
 *
 * Dos modos: modal (por defecto, `open` lo muestra sobre la página) e `inline` (tarjeta en el flujo de
 * una página completa, p. ej. "Nueva solicitud" o "Editar convocatoria").
 *
 * `validate` de cada paso devuelve un mensaje de error (string) o null; si devuelve texto, no avanza.
 */
export interface StepDef {
  key: string;
  /** Nombre corto en la lista de pasos (izquierda). */
  label: string;
  /** Pregunta guía que encabeza el contenido del paso. */
  question: string;
  content: ReactNode;
  validate?: () => string | null;
}

interface StepFrameProps {
  /** Modal: controla si se ve. Inline: se ignora (siempre visible). */
  open?: boolean;
  title: string;
  /** Aviso de contexto en lenguaje llano, arriba del formulario. */
  intro?: ReactNode;
  icon?: ReactNode;
  steps: StepDef[];
  onClose: () => void;
  onSubmit: () => void | Promise<void>;
  submitting?: boolean;
  submitLabel?: string;
  /** Error global (del servidor) — se muestra encima del paso. */
  error?: ReactNode;
  /** Mensaje de éxito: reemplaza el formulario. */
  success?: string | null;
  size?: 'md' | 'lg';
  /** Tarjeta dentro de la página en vez de ventana modal. */
  inline?: boolean;
  /** Oculta "Cancelar" en el primer paso (flujos que no se pueden abandonar, como la bienvenida). */
  hideCancel?: boolean;
}

export default function StepFrame(props: StepFrameProps) {
  if (props.inline) {
    return (
      <div className={`w-full mx-auto ${props.size === 'md' ? 'max-w-xl' : 'max-w-3xl'}`}>
        <StepFrameBody {...props} />
      </div>
    );
  }
  // Se desmonta al cerrar para que el siguiente uso arranque en el paso 1
  if (!props.open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'color-mix(in oklch, var(--auth-ink) 40%, transparent)', backdropFilter: 'blur(6px)' }}
      onClick={(e) => { if (e.target === e.currentTarget && !props.submitting) props.onClose(); }}
    >
      <div className={`w-full ${props.size === 'md' ? 'max-w-xl' : 'max-w-3xl'} max-h-[100dvh] sm:max-h-[92dvh] flex animate-in slide-in-from-bottom-4 sm:zoom-in-95 fade-in duration-200`}>
        <StepFrameBody {...props} />
      </div>
    </div>
  );
}

function StepFrameBody({
  title,
  intro,
  icon,
  steps,
  onClose,
  onSubmit,
  submitting = false,
  submitLabel = 'Guardar',
  error,
  success,
  inline = false,
  hideCancel = false,
}: StepFrameProps) {
  const [index, setIndex] = useState(0);
  const [stepError, setStepError] = useState<string | null>(null);

  const current = steps[Math.min(index, steps.length - 1)];
  const isLast = index >= steps.length - 1;

  const goNext = () => {
    const err = current.validate?.() ?? null;
    if (err) {
      setStepError(err);
      return;
    }
    setStepError(null);
    if (isLast) {
      void onSubmit();
    } else {
      setIndex((i) => i + 1);
    }
  };

  const goPrev = () => {
    setStepError(null);
    setIndex((i) => Math.max(0, i - 1));
  };

  const jumpTo = (i: number) => {
    if (i > index) return; // solo se puede volver a pasos ya vistos
    setStepError(null);
    setIndex(i);
  };

  const Wrapper = inline ? 'section' : 'div';

  return (
    <Wrapper
      role={inline ? undefined : 'dialog'}
      aria-modal={inline ? undefined : 'true'}
      aria-labelledby="stepframe-title"
      className={`app-card w-full overflow-hidden flex flex-col ${inline ? '' : 'max-h-[100dvh] sm:max-h-[92dvh] rounded-b-none sm:rounded-b-[28px]'}`}
    >
      {/* Cabecera */}
      <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b shrink-0" style={{ borderColor: 'var(--app-rule)' }}>
        <div className="flex items-center gap-3 min-w-0">
          {icon && <span className="app-tile-icon shrink-0">{icon}</span>}
          <h2 id="stepframe-title" className="text-base sm:text-lg font-bold text-[var(--app-ink)] truncate">{title}</h2>
        </div>
        {!inline && (
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Cerrar"
            className="p-2 rounded-lg text-[var(--app-ink-2)] hover:bg-[var(--app-hover-bg)] transition-colors disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className={`${inline ? '' : 'overflow-y-auto flex-1'} px-5 sm:px-6 py-5`}>
        {success ? (
          <div className="py-10 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl icon-glass" style={{ color: 'var(--tile-emerald-fg)' }}>
              <Check className="h-7 w-7" />
            </div>
            <p className="text-base font-bold text-[var(--app-ink)]">{success}</p>
          </div>
        ) : (
          <>
            {intro && (
              <div className="flex items-start gap-3 rounded-[18px] px-4 py-3 mb-5 text-sm text-[var(--app-ink)]" style={{ backgroundColor: 'var(--tile-gold-bg)', border: '1px solid color-mix(in oklch, var(--tile-gold-fg) 25%, transparent)' }}>
                <Lightbulb className="h-4 w-4 mt-0.5 shrink-0" style={{ color: 'var(--tile-gold-fg)' }} aria-hidden="true" />
                <p className="leading-relaxed">{intro}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-5 md:gap-8">
              {/* Lista de pasos */}
              <ol className="flex md:flex-col gap-2 overflow-x-auto no-scrollbar md:overflow-visible -mx-1 px-1" aria-label="Pasos">
                {steps.map((s, i) => {
                  const done = i < index;
                  const active = i === index;
                  return (
                    <li key={s.key} className="shrink-0">
                      <button
                        type="button"
                        onClick={() => jumpTo(i)}
                        disabled={i > index}
                        aria-current={active ? 'step' : undefined}
                        className="flex items-center gap-3 w-full rounded-[16px] px-3 py-2.5 text-left text-sm transition-colors disabled:cursor-default"
                        style={{
                          backgroundColor: active ? 'var(--tile-vino-bg)' : 'transparent',
                          color: active ? 'var(--app-ink)' : 'var(--app-ink-2)',
                          fontWeight: active ? 700 : 500,
                        }}
                      >
                        <span
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-bold"
                          style={
                            active
                              ? { background: 'var(--auth-vino)', color: 'var(--auth-white)' }
                              : done
                                ? { background: 'var(--tile-emerald-bg)', color: 'var(--tile-emerald-fg)' }
                                : { background: 'var(--auth-field)', color: 'var(--app-ink-2)' }
                          }
                        >
                          {done ? <Check className="h-3.5 w-3.5" aria-label="Completado" /> : i + 1}
                        </span>
                        <span className="whitespace-nowrap md:whitespace-normal">{s.label}</span>
                      </button>
                    </li>
                  );
                })}
              </ol>

              {/* Contenido del paso */}
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--auth-vino)' }}>
                  Paso {index + 1} de {steps.length}
                </p>
                <h3 className="mt-1 mb-4 text-lg font-bold text-[var(--app-ink)]">{current.question}</h3>
                {(stepError || error) && (
                  <div role="alert" className="mb-4 rounded-[14px] px-4 py-3 text-sm" style={{ backgroundColor: 'var(--tile-vino-bg)', color: 'var(--auth-danger)' }}>
                    {stepError || error}
                  </div>
                )}
                <div key={current.key} className="auth-swap space-y-4">{current.content}</div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Pie */}
      {!success && (
        <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-4 border-t shrink-0" style={{ borderColor: 'var(--app-rule)' }}>
          {index === 0 && hideCancel ? (
            <span />
          ) : (
            <button
              type="button"
              onClick={index === 0 ? onClose : goPrev}
              disabled={submitting}
              className="h-11 px-4 rounded-[14px] border font-semibold text-sm transition-colors hover:bg-[var(--app-hover-bg)] disabled:opacity-50 inline-flex items-center gap-1.5"
              style={{ borderColor: 'var(--app-rule)', color: 'var(--app-ink)' }}
            >
              {index === 0 ? 'Cancelar' : (<><ChevronLeft className="h-4 w-4" aria-hidden="true" /> Anterior</>)}
            </button>
          )}
          <button
            type="button"
            onClick={goNext}
            disabled={submitting}
            data-state={submitting ? 'loading' : 'idle'}
            className="auth-submit !w-auto !h-11 px-5 inline-flex items-center gap-2"
          >
            {submitting ? (
              <><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Guardando…</>
            ) : isLast ? (
              submitLabel
            ) : (
              <>Siguiente <ChevronRight className="h-4 w-4" aria-hidden="true" /></>
            )}
          </button>
        </div>
      )}
    </Wrapper>
  );
}
