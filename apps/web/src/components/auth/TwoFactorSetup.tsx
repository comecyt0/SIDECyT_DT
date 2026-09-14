'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertBox } from '@/components/ui/alert-box';
import { Shield, ShieldCheck, ShieldOff, Loader2, Copy, KeyRound } from 'lucide-react';
import api from '@/lib/api';

interface SetupResponse {
  secret: string;
  qr_svg: string;
  otp_uri: string;
}

interface RecoveryCodesResponse {
  message: string;
  recovery_codes: string[];
}

type Mode = 'idle' | 'setup' | 'confirm' | 'manage';

export default function TwoFactorSetup() {
  const [twoFactorEnabled, setTwoFactorEnabled] = useState<boolean | null>(null);
  const [mode, setMode] = useState<Mode>('idle');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [qrSvg, setQrSvg] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);

  // Cargar estado inicial
  useEffect(() => {
    api.get('/auth/me').then(({ data }) => {
      setTwoFactorEnabled(Boolean(data?.two_factor_enabled));
      if (data?.two_factor_enabled) setMode('manage');
    }).catch(() => {});
  }, []);

  const startSetup = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.post<SetupResponse>('/auth/2fa/setup');
      setQrSvg(data.qr_svg);
      setSecret(data.secret);
      setMode('confirm');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg ?? 'No se pudo iniciar el setup de 2FA.');
    } finally {
      setLoading(false);
    }
  };

  const confirmSetup = async () => {
    if (code.length !== 6) {
      setError('El código debe tener 6 dígitos.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.post<RecoveryCodesResponse>('/auth/2fa/confirm', { code });
      setRecoveryCodes(data.recovery_codes);
      setSuccess('2FA activado correctamente. Guarda los códigos de recuperación.');
      setTwoFactorEnabled(true);
      setQrSvg(null);
      setSecret(null);
      setCode('');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg ?? 'Código inválido.');
    } finally {
      setLoading(false);
    }
  };

  const disable2FA = async () => {
    if (!password || code.length !== 6) {
      setError('Necesitas tu contraseña y un código vigente.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await api.post('/auth/2fa/disable', { password, code });
      setTwoFactorEnabled(false);
      setSuccess('2FA desactivado.');
      setMode('idle');
      setCode('');
      setPassword('');
      setRecoveryCodes(null);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg ?? 'No se pudo desactivar.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setSuccess('Copiado al portapapeles.');
      setTimeout(() => setSuccess(null), 2500);
    }
  };

  if (twoFactorEnabled === null) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="py-6 flex justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-neutral-400" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-md">
      <CardHeader className="border-b border-neutral-100 dark:border-neutral-700">
        <CardTitle className="text-lg flex items-center gap-2">
          {twoFactorEnabled ? (
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
          ) : (
            <Shield className="w-5 h-5 text-neutral-400" />
          )}
          Autenticación en dos pasos (2FA)
        </CardTitle>
        <CardDescription>
          {twoFactorEnabled
            ? 'Tu cuenta está protegida con un código de tu app autenticadora.'
            : 'Añade una capa extra de seguridad usando Google Authenticator, Authy o 1Password.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6 space-y-4">
        {error && <AlertBox type="error" message={error} onClose={() => setError(null)} />}
        {success && <AlertBox type="success" message={success} onClose={() => setSuccess(null)} />}

        {/* Caso 1: 2FA inactivo, mostrar botón para iniciar setup */}
        {mode === 'idle' && !twoFactorEnabled && (
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-neutral-600 dark:text-neutral-300">
              El 2FA está <strong>desactivado</strong>. Te recomendamos activarlo para reforzar la seguridad de tu cuenta.
            </p>
            <Button onClick={startSetup} disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Shield className="w-4 h-4 mr-2" />}
              Activar 2FA
            </Button>
          </div>
        )}

        {/* Caso 2: setup iniciado, mostrar QR y campo de código */}
        {mode === 'confirm' && qrSvg && (
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row gap-6 items-start">
              <div className="bg-white p-3 rounded-xl border border-neutral-200" dangerouslySetInnerHTML={{ __html: qrSvg }} />
              <div className="flex-1 space-y-3">
                <div>
                  <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1">1. Escanea con tu app</p>
                  <p className="text-xs text-neutral-500">Google Authenticator / Authy / 1Password.</p>
                </div>
                {secret && (
                  <div>
                    <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1">O ingrésalo a mano</p>
                    <div className="flex items-center gap-2">
                      <code className="text-xs font-mono bg-neutral-100 dark:bg-neutral-800 px-2 py-1 rounded">{secret}</code>
                      <Button size="sm" variant="ghost" type="button" onClick={() => copyToClipboard(secret)}>
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                )}
                <div className="space-y-1.5 pt-2">
                  <Label htmlFor="2fa-code">2. Confirma con el primer código (6 dígitos)</Label>
                  <Input
                    id="2fa-code"
                    inputMode="numeric"
                    pattern="\d{6}"
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    className="font-mono text-lg tracking-widest text-center"
                  />
                </div>
                <Button onClick={confirmSetup} disabled={loading || code.length !== 6} className="w-full">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ShieldCheck className="w-4 h-4 mr-2" />}
                  Confirmar y activar
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Caso 3: códigos de recuperación recién generados */}
        {recoveryCodes && (
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
            <p className="text-sm font-bold text-amber-900 dark:text-amber-200 flex items-center gap-2 mb-2">
              <KeyRound className="w-4 h-4" />
              Códigos de recuperación
            </p>
            <p className="text-xs text-amber-800 dark:text-amber-300 mb-3">
              Guárdalos en un lugar seguro. Cada uno es de <strong>un solo uso</strong> y sirve para entrar si pierdes tu dispositivo.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {recoveryCodes.map((rc) => (
                <code key={rc} className="text-xs font-mono bg-white dark:bg-neutral-900 px-2 py-1 rounded text-center">
                  {rc}
                </code>
              ))}
            </div>
            <Button size="sm" variant="outline" className="mt-3" onClick={() => copyToClipboard(recoveryCodes.join('\n'))}>
              <Copy className="w-3 h-3 mr-2" /> Copiar todos
            </Button>
          </div>
        )}

        {/* Caso 4: 2FA activo, mostrar opción de desactivar */}
        {mode === 'manage' && twoFactorEnabled && !recoveryCodes && (
          <div className="space-y-3 border-t border-neutral-100 dark:border-neutral-700 pt-4">
            <p className="text-xs font-bold text-red-700 dark:text-red-400 uppercase tracking-wider flex items-center gap-2">
              <ShieldOff className="w-3.5 h-3.5" /> Desactivar 2FA
            </p>
            <p className="text-xs text-neutral-500">Requiere tu contraseña actual y un código vigente.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Contraseña actual"
                autoComplete="current-password"
              />
              <Input
                inputMode="numeric"
                pattern="\d{6}"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder="Código (6 dígitos)"
                className="font-mono tracking-widest text-center"
              />
            </div>
            <Button variant="destructive" onClick={disable2FA} disabled={loading || !password || code.length !== 6}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ShieldOff className="w-4 h-4 mr-2" />}
              Desactivar 2FA
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
