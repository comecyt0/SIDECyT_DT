'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertBox } from '@/components/ui/alert-box';
import { Loader2, Mail, ArrowLeft, ShieldCheck, CheckCircle } from 'lucide-react';
import api from '@/lib/api';
import { useT } from '@/i18n/I18nProvider';
import { INSTITUTION } from '@/lib/institution';

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-[var(--brand-vino-50)] via-white to-[var(--brand-gold-50)] dark:from-neutral-950 dark:via-neutral-900 dark:to-neutral-950 flex items-center justify-center p-4">
      {/* Background decorations */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-accent/8 rounded-full blur-3xl translate-x-1/4 translate-y-1/4 pointer-events-none" />

      <div className="w-full max-w-md relative animate-in fade-in slide-in-from-bottom-6 duration-600">
        {/* Card */}
        <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-xl shadow-primary/[8%] border border-neutral-100 dark:border-neutral-700 overflow-hidden">
          {/* Top accent */}
          <div className="h-1 bg-gradient-to-r from-primary via-accent to-primary" />

          <div className="p-8">
            {/* Logo */}
            <div className="flex justify-center mb-6">
              <div className="relative">
                <Image src="/logo.png" alt={INSTITUTION.name} width={82} height={64} priority className="h-16 w-auto object-contain" />
              </div>
            </div>

            {!sent ? (
              <>
                <div className="text-center mb-7">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/10 text-primary mb-4">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <h1 className="text-2xl font-extrabold text-neutral-900 mb-1.5">{t('auth.forgot_title')}</h1>
                  <p className="text-sm text-neutral-500 leading-relaxed">
                    {t('auth.forgot_subtitle')}
                  </p>
                </div>

                {error && <AlertBox type="error" message={error} onClose={() => setError('')} />}

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-xs font-bold text-neutral-600 uppercase tracking-widest">
                      {t('auth.email_label_caps')}
                    </Label>
                    <div className="relative group">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 group-focus-within:text-primary transition-colors" />
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder={INSTITUTION.emailHint}
                        required
                        className="pl-10 h-12 rounded-xl bg-neutral-50 border-neutral-200 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading || !email}
                    className="w-full h-12 rounded-xl bg-gradient-to-r from-primary to-[var(--brand-vino-700)] hover:from-[var(--brand-vino-700)] hover:to-[var(--brand-vino-600)] text-white font-bold shadow-lg shadow-primary/25 hover:-translate-y-0.5 transition-all duration-200 overflow-hidden relative group"
                  >
                    <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                    {loading ? (
                      <span className="flex items-center gap-2 relative z-10">
                        <Loader2 className="h-4 w-4 animate-spin" /> {t('common.loading')}
                      </span>
                    ) : (
                      <span className="relative z-10">{t('auth.forgot_submit')}</span>
                    )}
                  </Button>
                </form>
              </>
            ) : (
              <div className="text-center py-4">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mb-5">
                  <CheckCircle className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-extrabold text-neutral-900 mb-2">{t('auth.forgot_sent_title')}</h2>
                <p className="text-sm text-neutral-500 mb-4 leading-relaxed">
                  {t('auth.forgot_sent_body')}{' '}
                  <strong className="text-neutral-700">{email}</strong>.
                </p>
                <div className="space-y-2">
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-left">
                    <p className="text-xs text-blue-700 font-medium">
                      📋 El administrador revisará tu solicitud y te enviará el enlace. Este proceso puede tomar unos minutos.
                    </p>
                  </div>
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-left">
                    <p className="text-xs text-amber-700 font-medium">
                      ⏱️ Una vez que recibas el enlace, tendrás <strong>60 minutos</strong> para usarlo. Revisa también tu carpeta de spam.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-6 pt-5 border-t border-neutral-100 text-center">
              <Link href="/login" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-[var(--brand-vino-700)] transition-colors group">
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform duration-200" />
                {t('auth.back_to_login')}
              </Link>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-neutral-400 mt-4">
          © {new Date().getFullYear()} {INSTITUTION.name} · {INSTITUTION.state}
        </p>
      </div>
    </div>
  );
}
