'use client';

import { useEffect, useState } from 'react';
import Cookies from 'js-cookie';
import api from '@/lib/api';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Check, Eye, EyeOff, Loader2, Lock, Mail, ShieldCheck, TriangleAlert } from 'lucide-react';
import { AlertBox } from '@/components/ui/alert-box';
import { LoginCarousel } from '@/components/ui/login-carousel';
import DualBranding from '@/components/branding/DualBranding';
import LanguageSwitcher from '@/components/ui/LanguageSwitcher';
import { useT } from '@/i18n/I18nProvider';
import { INSTITUTION, copyrightLine } from '@/lib/institution';
import { useGlobalLoader } from '@/components/ui/GlobalLoader';

/** Estilos: clases .auth-* en globals.css. Diseño documentado en docs/DISENO_UI.md. */
export default function LoginPage() {
  const { t } = useT();
  const { setIsLoading: setRouteLoading, setMessage: setRouteMessage } = useGlobalLoader();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  // 2FA challenge state
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState('');

  // La landing (/sigac) manda el correo que escribió el usuario como ?email=. Se lee tras montar
  // (no useSearchParams, para no exigir un Suspense) y solo si parece un correo.
  useEffect(() => {
    const fromLanding = new URLSearchParams(window.location.search).get('email');
    if (fromLanding && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(fromLanding) && fromLanding.length <= 254) {
      setEmail(fromLanding);
      document.getElementById('password')?.focus();
    }
  }, []);

  const completeLogin = (user: { rol?: { slug?: string }; name?: string }) => {
    const roleSlug = user.rol?.slug || 'solicitante';
    // Cookies de interfaz (no dan acceso: proxy.ts y el backend solo confían en el JWT HttpOnly). `secure` fuera de
    // desarrollo y SameSite=Strict para que no viajen a otros sitios (24/09/2026).
    const opts = { expires: 1, path: '/', sameSite: 'strict' as const, secure: window.location.protocol === 'https:' };
    Cookies.set('userRole', roleSlug, opts);
    Cookies.set('userName', user.name ?? '', opts);
    const dashboardMap: Record<string, string> = {
      admin: '/admin/dashboard',
      revisor: '/revisor/solicitudes',
      evaluador: '/evaluador/evaluaciones',
      solicitante: '/solicitante/dashboard',
    };
    // El botón pasa a "Acceso concedido" y, medio segundo después, entra la pantalla de carga
    // del sistema — cubre el hueco de la recarga completa (window.location.href) con la misma
    // marca en vez de dejar la pantalla en blanco. Ver docs/DISENO_UI.md §Pantalla de carga.
    setSuccess(true);
    setLoading(false);
    const destino = dashboardMap[roleSlug] ?? '/solicitante/dashboard';
    setTimeout(() => {
      setRouteMessage('Ingresando…');
      setRouteLoading(true);
      // Un tick aparte para que React pinte la pantalla de carga antes de descargar el documento;
      // la pantalla sigue visible mientras el navegador espera el HTML del panel.
      setTimeout(() => { window.location.href = destino; }, 350);
    }, 450);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setLoginError(null);

    try {
      const response = await api.post('/auth/login', { email, password });
      // Si el backend pidió 2FA, no emite JWT — guardamos el challenge_id y mostramos pantalla
      if (response.data?.requires_2fa) {
        setChallengeId(response.data.challenge_id);
        setLoading(false);
        return;
      }
      completeLogin(response.data.user);
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { error?: string; message?: string } }; message?: string };
      const errorMsg =
        axiosError.response?.data?.error ||
        axiosError.response?.data?.message ||
        axiosError.message ||
        t('auth.invalid_credentials');
      setLoginError(errorMsg);
      setLoading(false);
    }
  };

  const handleTwoFactor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!challengeId) return;
    setLoading(true);
    setLoginError(null);
    try {
      const { data } = await api.post('/auth/2fa/challenge', {
        challenge_id: challengeId,
        code: twoFactorCode,
      });
      completeLogin(data.user);
    } catch (error: unknown) {
      const msg = (error as { response?: { data?: { error?: string } } })?.response?.data?.error ?? t('auth.invalid_credentials');
      setLoginError(msg);
      setLoading(false);
    }
  };

  const cancelChallenge = () => {
    setChallengeId(null);
    setTwoFactorCode('');
    setLoginError(null);
  };

  const detectCapsLock = (e: React.KeyboardEvent<HTMLInputElement>) => {
    setCapsLock(e.getModifierState('CapsLock'));
  };

  const submitState = success ? 'success' : loading ? 'loading' : 'idle';

  const submitContent = (idleLabel: string) => (
    <span key={submitState} className="auth-swap flex items-center gap-2.5">
      {submitState === 'success' && (
        <>
          <Check className="h-4 w-4" aria-hidden="true" />
          {t('auth.login_success')}
        </>
      )}
      {submitState === 'loading' && (
        <>
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          {t('auth.authenticating')}
        </>
      )}
      {submitState === 'idle' && (
        <>
          {idleLabel}
          <ArrowRight className="auth-submit-arrow h-4 w-4" aria-hidden="true" />
        </>
      )}
    </span>
  );

  return (
    <div className="flex min-h-screen bg-[var(--auth-paper)] font-sans text-[var(--auth-ink)]">
      {/* ── Izquierda: banner (solo escritorio) ── */}
      <div className="sticky top-0 hidden h-screen p-4 lg:block lg:w-[55%] xl:w-[58%] xl:p-5">
        <LoginCarousel />
      </div>

      {/* ── Derecha: formulario ── */}
      <main className="flex min-h-screen w-full flex-col lg:w-[45%] xl:w-[42%]">
        <div className="flex items-center justify-between gap-3 px-6 pt-5">
          {/* Regreso a la landing pública (/sigac), pedido del usuario el 23/09/2026. */}
          <Link
            href="/sigac"
            className="group inline-flex min-h-[44px] items-center gap-2 rounded-full border border-[var(--auth-rule)] bg-[var(--auth-white)] px-4 text-sm font-semibold text-[var(--auth-vino)] transition-[transform,background-color] duration-150 ease-out hover:bg-[var(--auth-vino-soft)] active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--auth-vino)]"
          >
            <ArrowLeft className="h-4 w-4 transition-transform duration-200 ease-out group-hover:-translate-x-0.5" aria-hidden="true" />
            Ir al sitio
          </Link>
          <LanguageSwitcher />
        </div>

        <div className="flex flex-1 items-center justify-center px-6 py-10 sm:px-10">
          <div className="w-full max-w-[400px]">
            {/* Logo institucional (COMECYT + Edomex si está habilitado) */}
            <div className="auth-reveal mb-8 flex justify-center" style={{ '--i': 1 } as React.CSSProperties}>
              <DualBranding size="xl" />
            </div>

            <div className="auth-reveal mb-9 text-center" style={{ '--i': 2 } as React.CSSProperties}>
              <h1 className="text-[clamp(2rem,3.2vw,2.5rem)] font-bold leading-[1.05] tracking-[-0.035em] [text-wrap:balance]">
                {t('auth.login_title')}
              </h1>
              <p className="mt-3 text-[15px] text-[var(--auth-ink-2)]">{t('auth.login_subtitle')}</p>
            </div>

            {/* 2FA Challenge — segunda pantalla después del login si user tiene 2FA */}
            {challengeId && (
              <form onSubmit={handleTwoFactor} className="auth-swap space-y-4">
                <div className="rounded-[var(--auth-radius-field)] border border-[var(--auth-rule)] bg-[var(--auth-white)] p-4">
                  <p className="flex items-center gap-2 text-sm font-semibold text-[var(--auth-vino)]">
                    <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                    {t('auth.two_factor_title')}
                  </p>
                  <p className="mt-1 text-[13px] text-[var(--auth-ink-2)]">{t('auth.two_factor_prompt')}</p>
                  <p className="mt-1 text-xs text-[var(--auth-ink-2)]">{t('auth.two_factor_recovery_hint')}</p>
                </div>

                {loginError && <AlertBox type="error" message={loginError} onClose={() => setLoginError(null)} />}

                <div className="auth-field">
                  <input
                    id="totp"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={21}
                    value={twoFactorCode}
                    onChange={(e) => setTwoFactorCode(e.target.value)}
                    placeholder="123456"
                    className="auth-input pl-4 font-mono text-lg tracking-[0.3em]"
                    aria-invalid={loginError ? true : undefined}
                    autoFocus
                  />
                  <label htmlFor="totp" className="auth-label left-4">
                    {t('auth.two_factor_code_label')}
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={loading || success || twoFactorCode.length < 6}
                  data-state={submitState}
                  className="auth-submit"
                >
                  {submitContent(t('auth.two_factor_submit'))}
                </button>

                <button type="button" onClick={cancelChallenge} className="auth-link mx-auto block text-sm">
                  {t('auth.back_to_login')}
                </button>
              </form>
            )}

            {/* Form principal — solo si no hay challenge activo */}
            {!challengeId && (
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="auth-reveal space-y-3" style={{ '--i': 3 } as React.CSSProperties}>
                  {/* Email — etiqueta flotante: sube al enfocar o al tener texto */}
                  <div className="auth-field">
                    <input
                      id="email"
                      type="email"
                      placeholder={INSTITUTION.emailHint}
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="auth-input"
                      aria-invalid={loginError ? true : undefined}
                      aria-describedby={loginError ? 'login-error' : undefined}
                    />
                    <label htmlFor="email" className="auth-label">
                      {t('auth.email')}
                    </label>
                    <Mail className="auth-field-icon" aria-hidden="true" />
                  </div>

                  {/* Password */}
                  <div className="auth-field">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••••••"
                      required
                      autoComplete="off"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onKeyDown={detectCapsLock}
                      onKeyUp={detectCapsLock}
                      onBlur={() => setCapsLock(false)}
                      className="auth-input pr-14"
                      aria-invalid={loginError ? true : undefined}
                      aria-describedby={capsLock ? 'caps-lock-hint' : loginError ? 'login-error' : undefined}
                    />
                    <label htmlFor="password" className="auth-label">
                      {t('auth.password')}
                    </label>
                    <Lock className="auth-field-icon" aria-hidden="true" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? t('auth.hide_password') : t('auth.show_password')}
                      aria-pressed={showPassword}
                      className="auth-eye"
                      tabIndex={-1}
                    >
                      <span key={showPassword ? 'ocultar' : 'mostrar'} className="auth-swap">
                        {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                      </span>
                    </button>
                  </div>

                  {capsLock && (
                    <p id="caps-lock-hint" role="status" className="auth-swap flex items-center gap-2 text-[13px] text-[var(--auth-ink-2)]">
                      <TriangleAlert className="h-4 w-4 text-[var(--auth-danger)]" aria-hidden="true" />
                      {t('auth.caps_lock_on')}
                    </p>
                  )}

                  {/* DOM después de los campos para que Tab vaya email → password → link → submit
                      (WCAG 2.4.3 — focus order). Visualmente alineado a la derecha. */}
                  <div className="flex justify-end">
                    <Link href="/forgot-password" className="auth-link text-[13px]">
                      {t('auth.forgot')}
                    </Link>
                  </div>
                </div>

                {loginError && (
                  <div id="login-error">
                    <AlertBox type="error" message={loginError} onClose={() => setLoginError(null)} />
                  </div>
                )}

                <div className="auth-reveal" style={{ '--i': 4 } as React.CSSProperties}>
                  <button type="submit" disabled={loading || success} data-state={submitState} className="auth-submit">
                    {submitContent(t('auth.submit'))}
                  </button>
                </div>

                <p
                  className="auth-reveal pt-2 text-center text-sm text-[var(--auth-ink-2)]"
                  style={{ '--i': 5 } as React.CSSProperties}
                >
                  {t('auth.request_access_question')}{' '}
                  <Link href="/solicitar-acceso" className="auth-link">
                    {t('auth.request_access')}
                  </Link>
                </p>
              </form>
            )}
          </div>
        </div>

        <footer className="px-6 pb-6 text-center text-xs text-[var(--auth-ink-2)]">{copyrightLine()}</footer>
      </main>
    </div>
  );
}
