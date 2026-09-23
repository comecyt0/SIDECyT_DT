'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { User, Mail, Building2, ShieldCheck, Phone, Briefcase, KeyRound, Loader2, Info, UserCog } from 'lucide-react';
import api from '@/lib/api';
import { AlertBox } from '@/components/ui/alert-box';
import PageHeader from '@/components/ui/page-header';
import TwoFactorSetup from '@/components/auth/TwoFactorSetup';
import PushNotificationsCard from '@/components/pwa/PushNotificationsCard';
import { INSTITUTION } from '@/lib/institution';
import StepFrame from '@/components/ui/step-frame';

const pwLabelCls = 'text-xs font-bold text-[var(--app-ink-2)] uppercase tracking-widest';
const pwInputCls = 'auth-input auth-input-static pl-4';

interface UserProfile {
  id: number;
  name: string;
  email: string;
  cargo?: string;
  telefono?: string;
  rol?: { nombre: string };
  empresa?: { nombre: string };
}

export default function SolicitanteSettingsPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const [pwForm, setPwForm] = useState({
    current_password: '',
    new_password: '',
    new_password_confirmation: '',
  });
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState<string | null>(null);
  const [pwValidationError, setPwValidationError] = useState<string | null>(null);
  const [pwFrameKey, setPwFrameKey] = useState(0);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data } = await api.get('/auth/me');
        setProfile(data.user ?? data);
      } catch {
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handlePwChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPwForm((prev) => ({ ...prev, [name]: value }));
    setPwValidationError(null);
  };

  const handlePwSubmit = async () => {
    setPwError(null);
    setPwSuccess(null);
    setPwValidationError(null);

    if (pwForm.new_password !== pwForm.new_password_confirmation) {
      setPwValidationError('La nueva contraseña y su confirmación no coinciden.');
      return;
    }

    if (pwForm.new_password.length < 8) {
      setPwValidationError('La nueva contraseña debe tener al menos 8 caracteres.');
      return;
    }

    setPwLoading(true);
    try {
      const { data } = await api.put('/auth/change-password', {
        current_password: pwForm.current_password,
        new_password: pwForm.new_password,
        new_password_confirmation: pwForm.new_password_confirmation,
      });
      setPwSuccess(data.message || 'Contraseña actualizada correctamente.');
      setPwForm({ current_password: '', new_password: '', new_password_confirmation: '' });
      setPwFrameKey((k) => k + 1);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string; message?: string } } };
      setPwError(
        error.response?.data?.error ||
        error.response?.data?.message ||
        'Ocurrió un error al cambiar la contraseña.'
      );
    } finally {
      setPwLoading(false);
    }
  };

  const initials = profile?.name
    ? profile.name.substring(0, 2).toUpperCase()
    : '??';

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-500">
      <PageHeader
        title="Mi cuenta"
        description={`Consulta los datos de tu cuenta en ${INSTITUTION.name} y cambia tu contraseña cuando lo necesites.`}
        icon={<UserCog className="h-5 w-5" />}
      />

      <Card>
        <CardHeader>
          <CardTitle>
            <User className="h-4 w-4" style={{ color: 'var(--auth-vino)' }} /> Mi perfil
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" style={{ color: 'var(--auth-vino)' }} />
              <span className="ml-2 text-sm text-[var(--app-ink-2)]">Cargando tu perfil...</span>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full text-white flex items-center justify-center text-xl font-bold shrink-0" style={{ backgroundColor: 'var(--auth-vino)' }}>
                  {initials}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-[var(--app-ink)] text-lg truncate">{profile?.name ?? '—'}</p>
                  <span className="pill mt-1" data-tone="vino">
                    {profile?.rol?.nombre ?? 'Solicitante institucional'}
                  </span>
                </div>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-3 p-3 bg-[var(--auth-field)] rounded-[14px] border border-[var(--app-rule)]">
                  <Mail className="h-4 w-4 text-[var(--app-ink-2)] shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-[var(--app-ink-2)] font-medium">Correo electrónico</p>
                    <p className="font-medium text-[var(--app-ink)] break-all">{profile?.email ?? '—'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-[var(--auth-field)] rounded-[14px] border border-[var(--app-rule)]">
                  <Building2 className="h-4 w-4 text-[var(--app-ink-2)] shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-[var(--app-ink-2)] font-medium">Institución</p>
                    <p className="font-medium text-[var(--app-ink)]">
                      {profile?.empresa?.nombre ?? 'Sin institución asignada'}
                    </p>
                  </div>
                </div>

                {profile?.cargo && (
                  <div className="flex items-center gap-3 p-3 bg-[var(--auth-field)] rounded-[14px] border border-[var(--app-rule)]">
                    <Briefcase className="h-4 w-4 text-[var(--app-ink-2)] shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs text-[var(--app-ink-2)] font-medium">Cargo</p>
                      <p className="font-medium text-[var(--app-ink)]">{profile.cargo}</p>
                    </div>
                  </div>
                )}

                {profile?.telefono && (
                  <div className="flex items-center gap-3 p-3 bg-[var(--auth-field)] rounded-[14px] border border-[var(--app-rule)]">
                    <Phone className="h-4 w-4 text-[var(--app-ink-2)] shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs text-[var(--app-ink-2)] font-medium">Teléfono</p>
                      <p className="font-medium text-[var(--app-ink)]">{profile.telefono}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3 p-3 bg-[var(--auth-field)] rounded-[14px] border border-[var(--app-rule)]">
                  <ShieldCheck className="h-4 w-4 text-[var(--app-ink-2)] shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-[var(--app-ink-2)] font-medium">Tipo de cuenta</p>
                    <p className="font-medium text-[var(--app-ink)]">
                      {profile?.rol?.nombre ?? 'Solicitante'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-[16px]" style={{ backgroundColor: 'var(--tile-gold-bg)' }}>
                <p className="text-sm text-[var(--app-ink)] font-semibold inline-flex items-center gap-1.5"><Info className="h-4 w-4" aria-hidden="true" style={{ color: 'var(--tile-gold-fg)' }} /> ¿Necesitas cambiar algún dato?</p>
                <p className="text-sm text-[var(--app-ink-2)] mt-1">
                  {`Los datos de tu perfil y de tu institución los actualiza el equipo de ${INSTITUTION.name}. Si algo cambió, escríbele a la persona encargada del sistema.`}
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Two-factor authentication */}
      <TwoFactorSetup />

      {/* Web Push notifications */}
      <PushNotificationsCard />

      {/* Cambio de contraseña, por pasos */}
      {pwSuccess && <AlertBox type="success" message={pwSuccess} onClose={() => setPwSuccess(null)} />}
      <StepFrame
        key={pwFrameKey}
        inline
        title="Cambiar contraseña"
        icon={<KeyRound className="h-5 w-5" />}
        intro={<>Primero confirmamos que eres tú con tu contraseña de hoy; después eliges la nueva. Mínimo <strong>8 caracteres</strong>; mezcla letras, números y símbolos.</>}
        onClose={() => { setPwForm({ current_password: '', new_password: '', new_password_confirmation: '' }); setPwError(null); setPwValidationError(null); }}
        onSubmit={handlePwSubmit}
        submitting={pwLoading}
        submitLabel="Actualizar contraseña"
        error={pwError || pwValidationError}
        steps={[
          {
            key: 'actual',
            label: 'Tu clave de hoy',
            question: '¿Cuál es tu contraseña actual?',
            validate: () => (!pwForm.current_password ? 'Escribe tu contraseña actual para continuar.' : null),
            content: (
              <div className="space-y-1.5">
                <Label htmlFor="current_password" className={pwLabelCls}>Contraseña actual</Label>
                <input
                  id="current_password"
                  name="current_password"
                  type="password"
                  autoComplete="current-password"
                  value={pwForm.current_password}
                  onChange={handlePwChange}
                  placeholder="••••••••"
                  disabled={pwLoading}
                  className={pwInputCls}
                />
              </div>
            ),
          },
          {
            key: 'nueva',
            label: 'La nueva',
            question: '¿Cuál será tu nueva contraseña?',
            validate: () => {
              if (pwForm.new_password.length < 8) return 'La nueva contraseña debe tener al menos 8 caracteres.';
              if (pwForm.new_password !== pwForm.new_password_confirmation) return 'La nueva contraseña y su confirmación no coinciden.';
              return null;
            },
            content: (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="new_password" className={pwLabelCls}>Nueva contraseña</Label>
                  <input
                    id="new_password"
                    name="new_password"
                    type="password"
                    autoComplete="new-password"
                    value={pwForm.new_password}
                    onChange={handlePwChange}
                    placeholder="Mínimo 8 caracteres"
                    disabled={pwLoading}
                    className={pwInputCls}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="new_password_confirmation" className={pwLabelCls}>Repítela</Label>
                  <input
                    id="new_password_confirmation"
                    name="new_password_confirmation"
                    type="password"
                    autoComplete="new-password"
                    value={pwForm.new_password_confirmation}
                    onChange={handlePwChange}
                    placeholder="Escríbela otra vez"
                    disabled={pwLoading}
                    className={pwInputCls}
                  />
                </div>
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
