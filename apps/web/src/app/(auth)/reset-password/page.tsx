'use client';

import { useState, Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertBox } from '@/components/ui/alert-box';
import { Loader2, Lock, Eye, EyeOff, ArrowLeft, CheckCircle } from 'lucide-react';
import api from '@/lib/api';
import { INSTITUTION } from '@/lib/institution';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token') || '';
  const emailParam = searchParams.get('email') || '';

  const [form, setForm] = useState({
    email: emailParam,
    password: '',
    password_confirmation: '',
  });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.password_confirmation) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    if (form.password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/reset-password', { token, ...form });
      setDone(true);
      setTimeout(() => router.push('/login'), 3000);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(axiosErr.response?.data?.message || 'Token inválido o expirado. Solicita un nuevo enlace.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <AlertBox
        type="error"
        message="Enlace de recuperación inválido. Solicita uno nuevo desde la pantalla de inicio de sesión."
      />
    );
  }

  return (
    <>
      {!done ? (
        <>
          <div className="text-center mb-7">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/10 text-primary mb-4">
              <Lock className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-extrabold text-neutral-900 mb-1.5">Nueva Contraseña</h1>
            <p className="text-sm text-neutral-500">Elige una contraseña segura de al menos 8 caracteres.</p>
          </div>

          {error && <AlertBox type="error" message={error} onClose={() => setError('')} />}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-neutral-600 uppercase tracking-widest">
                Nueva Contraseña
              </Label>
              <div className="relative group">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 group-focus-within:text-primary transition-colors" />
                <Input
                  type={showPass ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Mínimo 8 caracteres"
                  required
                  className="pl-10 pr-10 h-12 rounded-xl bg-neutral-50 border-neutral-200 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-primary transition-colors"
                  tabIndex={-1}
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {form.password && (
                <div className="flex gap-1 mt-1">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                        form.password.length >= i * 2
                          ? i <= 2 ? 'bg-amber-400' : 'bg-emerald-500'
                          : 'bg-neutral-200'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-neutral-600 uppercase tracking-widest">
                Confirmar Contraseña
              </Label>
              <div className="relative group">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 group-focus-within:text-primary transition-colors" />
                <Input
                  type={showPass ? 'text' : 'password'}
                  value={form.password_confirmation}
                  onChange={(e) => setForm({ ...form, password_confirmation: e.target.value })}
                  placeholder="Repite la contraseña"
                  required
                  className={`pl-10 h-12 rounded-xl bg-neutral-50 border-neutral-200 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all ${
                    form.password_confirmation && form.password !== form.password_confirmation ? 'border-red-300 focus:border-red-400' : ''
                  }`}
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl bg-gradient-to-r from-primary to-[var(--brand-vino-700)] hover:from-[var(--brand-vino-700)] hover:to-[var(--brand-vino-600)] text-white font-bold shadow-lg shadow-primary/25 hover:-translate-y-0.5 transition-all duration-200 overflow-hidden relative group"
            >
              <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              {loading ? (
                <span className="flex items-center gap-2 relative z-10">
                  <Loader2 className="h-4 w-4 animate-spin" /> Actualizando...
                </span>
              ) : (
                <span className="relative z-10">Establecer Nueva Contraseña</span>
              )}
            </Button>
          </form>
        </>
      ) : (
        <div className="text-center py-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mb-5">
            <CheckCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-extrabold text-neutral-900 mb-2">¡Contraseña actualizada!</h2>
          <p className="text-sm text-neutral-500 mb-4">
            Tu contraseña ha sido restablecida exitosamente. Serás redirigido en un momento...
          </p>
          <Link href="/login">
            <Button className="bg-gradient-to-r from-primary to-[var(--brand-vino-700)] text-white rounded-xl">
              Ir al inicio de sesión
            </Button>
          </Link>
        </div>
      )}
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[var(--brand-vino-50)] via-white to-[var(--brand-gold-50)] dark:from-neutral-950 dark:via-neutral-900 dark:to-neutral-950 flex items-center justify-center p-4">
      <div className="absolute top-0 left-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-accent/8 rounded-full blur-3xl translate-x-1/4 translate-y-1/4 pointer-events-none" />

      <div className="w-full max-w-md relative animate-in fade-in slide-in-from-bottom-6 duration-600">
        <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-xl shadow-primary/[8%] border border-neutral-100 dark:border-neutral-700 overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-primary via-accent to-primary" />
          <div className="p-8">
            <div className="flex justify-center mb-6">
              <Image src="/logo.png" alt={INSTITUTION.name} width={72} height={56} priority className="h-14 w-auto object-contain" />
            </div>
            <Suspense fallback={<div className="text-center py-8 text-neutral-500 text-sm">Cargando...</div>}>
              <ResetPasswordForm />
            </Suspense>
            <div className="mt-6 pt-5 border-t border-neutral-100 text-center">
              <Link href="/login" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-[var(--brand-vino-700)] transition-colors group">
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                Volver al inicio de sesión
              </Link>
            </div>
          </div>
        </div>
        <p className="text-center text-xs text-neutral-400 mt-4">© {new Date().getFullYear()} {INSTITUTION.name} · {INSTITUTION.state}</p>
      </div>
    </div>
  );
}
