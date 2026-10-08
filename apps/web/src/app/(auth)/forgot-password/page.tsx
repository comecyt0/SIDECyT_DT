'use client';

import { useState } from 'react';
import Link from 'next/link';
import { LogoComecyt, BandaInstitucional } from '@/components/branding/Logos';
import { Check, Loader2, Mail, ArrowLeft, ShieldCheck, Clock } from 'lucide-react';
import { AlertBox } from '@/components/ui/alert-box';
import DualBranding from '@/components/branding/DualBranding';
import LanguageSwitcher from '@/components/ui/LanguageSwitcher';
import api from '@/lib/api';
import { useT } from '@/i18n/I18nProvider';
import { INSTITUTION } from '@/lib/institution';
import PieAuth from '@/components/branding/PieAuth';

/** Mismo sistema --auth-* del login. Ver docs/DISENO_UI.md §Login. */
export default function ForgotPasswordPage() {
  const { t } = useT();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(axiosErr.response?.data?.message || t('auth.invalid_credentials'));
    } finally {
      setLoading(false);
    }
  };

  const submitState = sent ? 'success' : loading ? 'loading' : 'idle';

  return (
    <div className="auth-pantalla flex h-dvh flex-col overflow-hidden bg-[var(--auth-paper)] font-sans text-[var(--auth-ink)]">
      {/* Convivencia oficial de logos en el encabezado (E50, regla del usuario): fila completa arriba */}
      <BandaInstitucional className="flex-none" />
      <div className="flex min-h-0 flex-1">
      {/* ── Izquierda: panel institucional (estático) ── */}
      <div className="hidden h-full min-h-0 p-4 lg:block lg:w-[48%] xl:w-[45%] xl:p-5">
        <section className="auth-banner h-full w-full">
          <div aria-hidden="true" className="absolute inset-0 -z-10">
            <span className="auth-blob auth-blob-1" style={{ transform: 'translate(-8%, -14%) scale(1)' }} />
            <span className="auth-blob auth-blob-2" style={{ transform: 'translate(44%, 10%) scale(0.95)' }} />
            <span className="auth-blob auth-blob-3" style={{ transform: 'translate(6%, 50%) scale(1.05)' }} />
            <span className="auth-grain" />
          </div>
          <div className="relative flex h-full flex-col p-8 text-white xl:p-10">
            <div className="auth-reveal" style={{ '--i': 0 } as React.CSSProperties}>
              <LogoComecyt variante="negativo" className="h-24 xl:h-28" />
            </div>
            <div className="auth-reveal mt-auto" style={{ '--i': 1 } as React.CSSProperties}>
              <p className="auth-tag mb-4">
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" /> Recuperación de acceso
              </p>
              <div className="auth-glass p-7 xl:p-8">
                <h2 className="auth-banner-title">Recupera tu acceso en minutos</h2>
                <p className="mt-3 max-w-[42ch] text-[15px] leading-relaxed text-white/80">
                  El enlace llega solo a tu correo, vence en 60 minutos y sirve una vez. Al usarlo se cierran
                  las sesiones abiertas con tu contraseña anterior.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* ── Derecha: formulario ── */}
      <main className="auth-columna flex min-h-0 w-full flex-col overflow-y-auto lg:w-[52%] xl:w-[55%]">
        <div className="flex justify-end px-6 pt-5">
          <LanguageSwitcher />
        </div>

        <div className="flex flex-1 items-center justify-center px-6 py-10 sm:px-10">
          <div className="w-full max-w-[400px]">
            <div className="auth-reveal mb-8 flex justify-center lg:hidden" style={{ '--i': 0 } as React.CSSProperties}>
              <DualBranding size="lg" />
            </div>

            {!sent ? (
              <>
                <div className="auth-reveal mb-9 text-center" style={{ '--i': 1 } as React.CSSProperties}>
                  <h1 className="text-[clamp(1.75rem,3vw,2.25rem)] font-bold leading-[1.08] tracking-[-0.03em] [text-wrap:balance]">
                    {t('auth.forgot_title')}
                  </h1>
                  <p className="mt-3 text-[15px] text-[var(--auth-ink-2)] leading-relaxed">{t('auth.forgot_subtitle')}</p>
                </div>

                {error && (
                  <div className="mb-5">
                    <AlertBox type="error" message={error} onClose={() => setError('')} />
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="auth-reveal auth-field" style={{ '--i': 2 } as React.CSSProperties}>
                    <input
                      id="email"
                      type="email"
                      placeholder={INSTITUTION.emailHint}
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="auth-input"
                      aria-invalid={error ? true : undefined}
                    />
                    <label htmlFor="email" className="auth-label">
                      {t('auth.email')}
                    </label>
                    <Mail className="auth-field-icon" aria-hidden="true" />
                  </div>

                  <div className="auth-reveal" style={{ '--i': 3 } as React.CSSProperties}>
                    <button type="submit" disabled={loading || !email} data-state={submitState} className="auth-submit">
                      <span key={submitState} className="auth-swap flex items-center gap-2.5">
                        {loading ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                            {t('common.loading')}
                          </>
                        ) : (
                          t('auth.forgot_submit')
                        )}
                      </span>
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="auth-swap text-center">
                <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl" style={{ background: 'var(--tile-emerald-bg)' }}>
                  <Check className="h-8 w-8" style={{ color: 'var(--tile-emerald-fg)' }} />
                </div>
                <h2 className="text-xl font-bold text-[var(--auth-ink)] mb-2">{t('auth.forgot_sent_title')}</h2>
                <p className="text-sm text-[var(--auth-ink-2)] mb-6 leading-relaxed">
                  {t('auth.forgot_sent_body')} <strong className="text-[var(--auth-ink)]">{email}</strong>.
                </p>
                <div className="space-y-2.5 text-left">
                  <div className="flex items-start gap-3 rounded-[var(--auth-radius-field)] border p-3.5" style={{ borderColor: 'var(--auth-rule)' }}>
                    <Mail className="h-4 w-4 mt-0.5 shrink-0" style={{ color: 'var(--tile-sky-fg)' }} aria-hidden="true" />
                    <p className="text-xs text-[var(--auth-ink-2)] leading-relaxed">
                      Abre el correo «Recupera tu contraseña» y pulsa «Crear contraseña nueva». Si no llega, revisa spam o pídelo otra vez en un minuto.
                    </p>
                  </div>
                  <div className="flex items-start gap-3 rounded-[var(--auth-radius-field)] border p-3.5" style={{ borderColor: 'var(--auth-rule)' }}>
                    <Clock className="h-4 w-4 mt-0.5 shrink-0" style={{ color: 'var(--tile-gold-fg)' }} aria-hidden="true" />
                    <p className="text-xs text-[var(--auth-ink-2)] leading-relaxed">
                      Tienes <strong>60 minutos</strong> para usar el enlace. Si no pediste el cambio, ignora el correo: tu contraseña sigue igual.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-8 pt-6 border-t text-center" style={{ borderColor: 'var(--auth-rule)' }}>
              <Link href="/login" className="auth-link inline-flex items-center gap-1.5 text-sm">
                <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                {t('auth.back_to_login')}
              </Link>
            </div>
          </div>
        </div>

        <PieAuth />
      </main>
      </div>
    </div>
  );
}
