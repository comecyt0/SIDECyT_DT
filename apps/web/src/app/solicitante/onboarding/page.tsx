'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Label } from '@/components/ui/label';
import { Building, Phone, Briefcase, CheckCircle2 } from 'lucide-react';
import api from '@/lib/api';
import { INSTITUTION } from '@/lib/institution';
import StepFrame from '@/components/ui/step-frame';

interface EmpresaOption {
  id: number;
  nombre: string;
  acronimo?: string;
}

const labelCls = 'text-xs font-bold text-[var(--app-ink-2)] uppercase tracking-widest';
const inputCls = 'auth-input auth-input-static pl-4';

export default function SolicitanteOnboardingPage() {
  const router = useRouter();
  const [empresas, setEmpresas] = useState<EmpresaOption[]>([]);
  const [loadingCat, setLoadingCat] = useState(true);
  const [form, setForm] = useState({
    empresa_id: '',
    telefono: '',
    cargo: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        // Cargar lista de empresas autorizadas
        const { data } = await api.get('/catalogos');
        const list: EmpresaOption[] = Array.isArray(data?.empresas) ? data.empresas : [];
        setEmpresas(list);
        // También leer el perfil actual para precargar lo que ya esté
        const me = await api.get('/auth/me');
        const u = me.data?.user;
        if (u) {
          // Precarga sin pisar lo que la persona ya haya escrito mientras cargaba
          setForm((prev) => ({
            empresa_id: prev.empresa_id || (u.empresa_id ? String(u.empresa_id) : ''),
            telefono: prev.telefono || (u.telefono ?? ''),
            cargo: prev.cargo || (u.cargo ?? ''),
          }));
          // Si ya tiene institución, redirige al dashboard — onboarding no aplica
          if (u.empresa_id) {
            router.replace('/solicitante/dashboard');
            return;
          }
        }
      } catch {
        setEmpresas([]);
      } finally {
        setLoadingCat(false);
      }
    };
    init();
  }, [router]);

  const handleSubmit = async () => {
    if (!form.empresa_id) {
      setError('Selecciona la institución a la que perteneces.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await api.put('/auth/profile', {
        empresa_id: Number(form.empresa_id),
        telefono: form.telefono || null,
        cargo: form.cargo || null,
      });
      router.replace('/solicitante/dashboard');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'No se pudo guardar tu perfil.';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6" style={{ background: 'var(--app-bg)' }}>
      <StepFrame
        inline
        hideCancel
        size="md"
        title={`Bienvenido a ${INSTITUTION.name}`}
        icon={<CheckCircle2 className="h-5 w-5" />}
        intro={<>Antes de tu primera solicitud necesitamos saber <strong>desde qué institución participas</strong> y cómo contactarte. Toma un minuto.</>}
        onClose={() => undefined}
        onSubmit={handleSubmit}
        submitting={saving}
        submitLabel="Continuar al sistema"
        error={error}
        steps={[
          {
            key: 'institucion',
            label: 'Tu institución',
            question: '¿Desde qué institución participas?',
            validate: () => (!form.empresa_id ? 'Elige tu institución para continuar.' : null),
            content: (
              <div className="space-y-1.5">
                <Label htmlFor="ob-inst" className={`${labelCls} flex items-center gap-1`}>
                  <Building className="w-3.5 h-3.5" aria-hidden="true" /> Institución *
                </Label>
                {loadingCat ? (
                  <div className="skeleton h-12 rounded-[var(--auth-radius-field)]" />
                ) : (
                  <select
                    id="ob-inst"
                    value={form.empresa_id}
                    onChange={(e) => setForm({ ...form, empresa_id: e.target.value })}
                    className={inputCls}
                    required
                  >
                    <option value="">Selecciona una institución…</option>
                    {empresas.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.acronimo ? `${i.acronimo} — ${i.nombre}` : i.nombre}
                      </option>
                    ))}
                  </select>
                )}
                <p className="text-xs text-[var(--app-ink-2)]">
                  Si tu institución no está en la lista, escribe a {INSTITUTION.contactEmail}.
                </p>
              </div>
            ),
          },
          {
            key: 'contacto',
            label: 'Cómo contactarte',
            question: '¿Cuál es tu cargo y teléfono?',
            content: (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="ob-cargo" className={`${labelCls} flex items-center gap-1`}>
                    <Briefcase className="w-3.5 h-3.5" aria-hidden="true" /> Cargo
                  </Label>
                  <input id="ob-cargo" placeholder="Investigador, Coordinador…" value={form.cargo} onChange={(e) => setForm({ ...form, cargo: e.target.value })} className={inputCls} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ob-tel" className={`${labelCls} flex items-center gap-1`}>
                    <Phone className="w-3.5 h-3.5" aria-hidden="true" /> Teléfono
                  </Label>
                  <input id="ob-tel" type="tel" placeholder="722 123 4567" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} className={inputCls} />
                </div>
                <p className="sm:col-span-2 text-xs text-[var(--app-ink-2)]">Ambos son opcionales; sirven para que {INSTITUTION.name} pueda localizarte si hay dudas con una solicitud.</p>
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
