'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Mail, Building2, ShieldCheck, Phone, Briefcase, KeyRound, Loader2 } from 'lucide-react';
import api from '@/lib/api';
import { colorMap } from '@/lib/color-mapper';
import { AlertBox } from '@/components/ui/alert-box';
import TwoFactorSetup from '@/components/auth/TwoFactorSetup';
import PushNotificationsCard from '@/components/pwa/PushNotificationsCard';
import { INSTITUTION } from '@/lib/institution';

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

  const handlePwSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-neutral-dark">Ajustes de Perfil</h1>
        <p className="text-neutral-500 mt-1">{`Información de tu cuenta institucional registrada en ${INSTITUTION.name}.`}</p>
      </div>

      {/* Profile Card */}
      <Card className="border-0 shadow-sm ring-1 ring-neutral-100">
        <CardHeader className="bg-neutral-50 border-b border-neutral-100 pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4 text-primary" /> Mi Perfil
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="ml-2 text-sm text-neutral-500">Cargando perfil...</span>
            </div>
          ) : (
            <>
              {/* Avatar */}
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-primary text-white flex items-center justify-center text-xl font-bold shadow">
                  {initials}
                </div>
                <div>
                  <p className="font-semibold text-neutral-900 text-lg">{profile?.name ?? '—'}</p>
                  <Badge className="bg-primary/10 text-primary border-primary/20 shadow-none mt-1">
                    {profile?.rol?.nombre ?? 'Solicitante Institucional'}
                  </Badge>
                </div>
              </div>

              <div className="space-y-4 text-sm">
                <div className="flex items-center gap-3 p-3 bg-neutral-50 rounded-lg border border-neutral-100">
                  <Mail className="h-4 w-4 text-neutral-400 shrink-0" />
                  <div>
                    <p className="text-xs text-neutral-400 font-medium">Correo Electrónico</p>
                    <p className="font-medium text-neutral-700">{profile?.email ?? '—'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-neutral-50 rounded-lg border border-neutral-100">
                  <Building2 className="h-4 w-4 text-neutral-400 shrink-0" />
                  <div>
                    <p className="text-xs text-neutral-400 font-medium">Institución</p>
                    <p className="font-medium text-neutral-700">
                      {profile?.empresa?.nombre ?? 'Sin institución asignada'}
                    </p>
                  </div>
                </div>

                {profile?.cargo && (
                  <div className="flex items-center gap-3 p-3 bg-neutral-50 rounded-lg border border-neutral-100">
                    <Briefcase className="h-4 w-4 text-neutral-400 shrink-0" />
                    <div>
                      <p className="text-xs text-neutral-400 font-medium">Cargo</p>
                      <p className="font-medium text-neutral-700">{profile.cargo}</p>
                    </div>
                  </div>
                )}

                {profile?.telefono && (
                  <div className="flex items-center gap-3 p-3 bg-neutral-50 rounded-lg border border-neutral-100">
                    <Phone className="h-4 w-4 text-neutral-400 shrink-0" />
                    <div>
                      <p className="text-xs text-neutral-400 font-medium">Teléfono</p>
                      <p className="font-medium text-neutral-700">{profile.telefono}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3 p-3 bg-neutral-50 rounded-lg border border-neutral-100">
                  <ShieldCheck className="h-4 w-4 text-neutral-400 shrink-0" />
                  <div>
                    <p className="text-xs text-neutral-400 font-medium">Rol del Sistema</p>
                    <p className="font-medium text-neutral-700">
                      {profile?.rol?.nombre ?? 'Solicitante'}
                    </p>
                  </div>
                </div>
              </div>

              <div className={`p-4 ${colorMap.states.warning.background} border ${colorMap.states.warning.border} rounded-lg`}>
                <p className={`text-sm ${colorMap.states.warning.text} font-medium`}>ⓘ Nota</p>
                <p className={`text-xs ${colorMap.states.warning.main} mt-1`}>
                  {`La modificación de datos de perfil e institución se realiza directamente a través de la administración ${INSTITUTION.name}. Contacta al encargado del sistema para actualizar tu información.`}
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

      {/* Change Password Card */}
      <Card className="border-0 shadow-sm ring-1 ring-neutral-100">
        <CardHeader className="bg-neutral-50 border-b border-neutral-100 pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-primary" /> Cambiar Contraseña
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handlePwSubmit} className="space-y-4">
            {pwSuccess && (
              <AlertBox type="success" message={pwSuccess} />
            )}
            {pwError && (
              <AlertBox type="error" message={pwError} />
            )}

            <div className="space-y-1">
              <Label htmlFor="current_password" className="text-sm font-medium text-neutral-700">
                Contraseña actual
              </Label>
              <Input
                id="current_password"
                name="current_password"
                type="password"
                autoComplete="current-password"
                value={pwForm.current_password}
                onChange={handlePwChange}
                placeholder="••••••••"
                required
                disabled={pwLoading}
                className="focus:ring-primary focus:border-primary"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="new_password" className="text-sm font-medium text-neutral-700">
                Nueva contraseña
              </Label>
              <Input
                id="new_password"
                name="new_password"
                type="password"
                autoComplete="new-password"
                value={pwForm.new_password}
                onChange={handlePwChange}
                placeholder="Mínimo 8 caracteres"
                required
                disabled={pwLoading}
                className={`focus:ring-primary focus:border-primary ${
                  pwValidationError ? 'border-red-400 focus:border-red-400' : ''
                }`}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="new_password_confirmation" className="text-sm font-medium text-neutral-700">
                Confirmar nueva contraseña
              </Label>
              <Input
                id="new_password_confirmation"
                name="new_password_confirmation"
                type="password"
                autoComplete="new-password"
                value={pwForm.new_password_confirmation}
                onChange={handlePwChange}
                placeholder="Repite la nueva contraseña"
                required
                disabled={pwLoading}
                className={`focus:ring-primary focus:border-primary ${
                  pwValidationError ? 'border-red-400 focus:border-red-400' : ''
                }`}
              />
              {pwValidationError && (
                <p className="text-xs text-red-500 mt-1">{pwValidationError}</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={pwLoading || !pwForm.current_password || !pwForm.new_password || !pwForm.new_password_confirmation}
              className="w-full bg-primary hover:bg-primary/90 text-white"
            >
              {pwLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Actualizando...
                </>
              ) : (
                'Actualizar contraseña'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
