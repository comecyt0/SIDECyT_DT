'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building, Phone, Briefcase, Loader2, CheckCircle2, ArrowRight } from 'lucide-react';
import api from '@/lib/api';
import { AlertBox } from '@/components/ui/alert-box';
import { INSTITUTION } from '@/lib/institution';

interface EmpresaOption {
  id: number;
  nombre: string;
  acronimo?: string;
}

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
          setForm({
            empresa_id: u.empresa_id ? String(u.empresa_id) : '',
            telefono: u.telefono ?? '',
            cargo: u.cargo ?? '',
          });
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-primary/5 dark:from-neutral-950 dark:to-primary/10 flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="w-full max-w-xl"
      >
        <Card className="border-0 shadow-2xl rounded-3xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-primary to-[var(--brand-vino-700)] text-white pb-6">
            <CardTitle className="text-2xl font-extrabold flex items-center gap-2">
              <CheckCircle2 className="w-6 h-6" />
              Bienvenido a {INSTITUTION.name}
            </CardTitle>
            <CardDescription className="text-white/80">
              Antes de crear tu primera solicitud necesitamos tres datos de tu institución.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-8 space-y-6">
            {error && <AlertBox type="error" message={error} onClose={() => setError(null)} />}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="ob-inst" className="flex items-center gap-1 text-sm font-semibold">
                  <Building className="w-3.5 h-3.5 text-primary" />
                  Institución <span className="text-red-500">*</span>
                </Label>
                {loadingCat ? (
                  <div className="skeleton h-10 rounded-md" />
                ) : (
                  <select
                    id="ob-inst"
                    value={form.empresa_id}
                    onChange={(e) => setForm({ ...form, empresa_id: e.target.value })}
                    className="w-full h-10 px-3 rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
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
                <p className="text-[10px] text-neutral-500 dark:text-neutral-300">
                  Si tu institución no está en la lista, contacta a {INSTITUTION.contactEmail}.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="ob-cargo" className="flex items-center gap-1 text-sm font-semibold">
                    <Briefcase className="w-3.5 h-3.5 text-primary" />
                    Cargo
                  </Label>
                  <Input
                    id="ob-cargo"
                    placeholder="Investigador, Coordinador…"
                    value={form.cargo}
                    onChange={(e) => setForm({ ...form, cargo: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ob-tel" className="flex items-center gap-1 text-sm font-semibold">
                    <Phone className="w-3.5 h-3.5 text-primary" />
                    Teléfono
                  </Label>
                  <Input
                    id="ob-tel"
                    type="tel"
                    placeholder="722 123 4567"
                    value={form.telefono}
                    onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                  />
                </div>
              </div>

              <Button type="submit" disabled={saving} className="w-full bg-primary hover:bg-[var(--brand-vino-700)] text-white font-bold py-2.5">
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ArrowRight className="w-4 h-4 mr-2" />}
                Continuar al sistema
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
