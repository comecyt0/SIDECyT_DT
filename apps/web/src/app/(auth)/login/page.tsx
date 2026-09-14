'use client';

import { useState } from 'react';
import Cookies from 'js-cookie';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { Loader2, ArrowRight, Eye, EyeOff, Lock, Mail, ShieldCheck } from 'lucide-react';
import { AlertBox } from '@/components/ui/alert-box';
import { LoginCarousel } from '@/components/ui/login-carousel';
import DualBranding from '@/components/branding/DualBranding';
import LanguageSwitcher from '@/components/ui/LanguageSwitcher';
import { useT } from '@/i18n/I18nProvider';
import { INSTITUTION, copyrightLine } from '@/lib/institution';

export default function LoginPage() {
  const { t } = useT();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  // 2FA challenge state
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState('');

  const completeLogin = (user: { rol?: { slug?: string }; name?: string }) => {
    const roleSlug = user.rol?.slug || 'solicitante';
    Cookies.set('userRole', roleSlug, { expires: 1, path: '/' });
    Cookies.set('userName', user.name ?? '', { expires: 1, path: '/' });
    const dashboardMap: Record<string, string> = {
      admin: '/admin/dashboard',
      revisor: '/revisor/solicitudes',
      evaluador: '/evaluador/evaluaciones',
      solicitante: '/solicitante/dashboard',
    };
    window.location.href = dashboardMap[roleSlug] ?? '/solicitante/dashboard';
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

  return (
    <div className="flex min-h-screen bg-neutral-50 dark:bg-neutral-950 overflow-hidden font-sans">
      {/* ── LEFT PANE: Carousel ── */}
      <div className="hidden lg:block lg:w-[55%] xl:w-[60%] relative">
        <LoginCarousel />

        {/* Bottom strip: security badge */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30">
          <div className="flex items-center gap-2.5 bg-black/30 backdrop-blur-md px-5 py-2.5 rounded-full border border-white/20 shadow-lg">
            <ShieldCheck className="w-4 h-4 text-accent" />
            <span className="text-xs font-semibold text-white/90 tracking-wide">
              {INSTITUTION.securityBadge}
            </span>
          </div>
        </div>
      </div>

      {/* ── RIGHT PANE: Auth Form ── */}
      <div className="w-full lg:w-[45%] xl:w-[40%] relative flex flex-col items-center justify-center px-6 md:px-10 xl:px-16 bg-white">
        {/* Subtle top border accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-accent to-primary" />

        {/* Language switcher (top-right) */}
        <div className="absolute top-4 right-4 z-30">
          <LanguageSwitcher />
        </div>

        {/* Ambient glow */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-56 h-56 bg-accent/8 rounded-full blur-3xl pointer-events-none" />

        <div className="w-full max-w-sm relative z-10 animate-in fade-in slide-in-from-right-8 duration-700">

          {/* Logo institucional dual: COMECYT + Gobierno del Estado de México */}
          <div className="flex justify-center mb-8">
            <DualBranding size="lg" />
          </div>

          {/* Heading */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-extrabold text-[#2D1B20] tracking-tight mb-1.5">
              {t('auth.login_title')}
            </h1>
            <p className="text-sm text-neutral-500">
              {t('auth.login_subtitle')}
            </p>
          </div>

          {/* 2FA Challenge — segunda pantalla después del login si user tiene 2FA */}
          {challengeId && (
            <form onSubmit={handleTwoFactor} className="space-y-5">
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
                <p className="text-sm font-bold text-primary mb-1 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" />
                  {t('auth.two_factor_title')}
                </p>
                <p className="text-xs text-neutral-600">
                  {t('auth.two_factor_prompt')}
                </p>
                <p className="text-[10px] text-neutral-400 mt-1">
                  {t('auth.two_factor_recovery_hint')}
                </p>
              </div>
              {loginError && <AlertBox type="error" message={loginError} onClose={() => setLoginError(null)} />}
              <div className="space-y-1.5">
                <Label htmlFor="totp" className="text-xs font-bold text-neutral-600 uppercase tracking-widest">
                  {t('auth.two_factor_code_label')}
                </Label>
                <Input
                  id="totp"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={21}
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value)}
                  placeholder="123456"
                  className="font-mono text-lg tracking-widest text-center"
                  autoFocus
                />
              </div>
              <Button type="submit" disabled={loading || twoFactorCode.length < 6} className="w-full bg-primary hover:bg-[var(--brand-vino-700)] text-white font-bold py-3">
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ArrowRight className="w-4 h-4 mr-2" />}
                {t('auth.two_factor_submit')}
              </Button>
              <button type="button" onClick={cancelChallenge} className="w-full text-xs text-neutral-400 hover:text-primary">
                {t('auth.back_to_login')}
              </button>
            </form>
          )}

          {/* Form principal — solo si no hay challenge activo */}
          {!challengeId && (
          <form onSubmit={handleLogin} className="space-y-5">

            {/* Email */}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-bold text-neutral-600 uppercase tracking-widest">
                {t('auth.email_label_caps')}
              </Label>
              <div className="relative group">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 group-focus-within:text-primary transition-colors duration-200" />
                <Input
                  id="email"
                  type="email"
                  placeholder={INSTITUTION.emailHint}
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-12 bg-neutral-50 border-neutral-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 hover:border-neutral-300"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-bold text-neutral-600 uppercase tracking-widest">
                {t('auth.password')}
              </Label>
              <div className="relative group">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 group-focus-within:text-primary transition-colors duration-200" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••••••"
                  required
                  autoComplete="off"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 h-12 bg-neutral-50 border-neutral-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 hover:border-neutral-300"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? t('auth.hide_password') : t('auth.show_password')}
                  aria-pressed={showPassword}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-primary transition-colors duration-200"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {/* DOM después del input para que Tab vaya email → password → submit → link
                  (WCAG 2.4.3 — focus order). Visualmente alineado a la derecha. */}
              <div className="flex justify-end pt-0.5">
                <Link
                  href="/forgot-password"
                  className="text-xs text-primary hover:text-[var(--brand-vino-700)] font-semibold hover:underline transition-colors"
                >
                  {t('auth.forgot')}
                </Link>
              </div>
            </div>

            {/* Error alert */}
            {loginError && (
              <AlertBox type="error" message={loginError} onClose={() => setLoginError(null)} />
            )}

            {/* Submit */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 text-sm font-bold rounded-xl bg-gradient-to-r from-primary to-[var(--brand-vino-700)] hover:from-[var(--brand-vino-700)] hover:to-[var(--brand-vino-600)] text-white shadow-lg shadow-primary/30 transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 active:shadow-md border-0 overflow-hidden relative group"
            >
              {/* Shimmer */}
              <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/10 to-transparent" />

              {loading ? (
                <span className="flex items-center justify-center gap-2 relative z-10">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('auth.authenticating')}
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2 relative z-10">
                  {t('auth.submit_button')}
                  <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                </span>
              )}
            </Button>

            {/* Divider */}
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-neutral-100" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white px-3 text-neutral-400">{t('auth.first_time')}</span>
              </div>
            </div>

            {/* Register link */}
            <div className="text-center">
              <p className="text-sm text-neutral-500">
                {t('auth.request_access_question')}{' '}
                <Link
                  href="/solicitar-acceso"
                  className="font-bold text-primary hover:text-[var(--brand-vino-700)] hover:underline transition-colors"
                >
                  {t('auth.request_access_link')}
                </Link>
              </p>
            </div>
          </form>
          )}
        </div>

        {/* Footer */}
        <div className="absolute bottom-5 left-0 right-0 text-center">
          <p className="text-[11px] text-neutral-300 tracking-wide">
            {copyrightLine()}
          </p>
        </div>
      </div>
    </div>
  );
}
