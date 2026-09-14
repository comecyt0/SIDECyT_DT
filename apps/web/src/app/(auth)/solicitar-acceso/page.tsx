'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertBox } from '@/components/ui/alert-box';
import {
  Loader2, User, Mail, Lock, Building2, Briefcase,
  Phone, FileText, ArrowLeft, CheckCircle, Eye, EyeOff,
  Hash, Users, Scale, FileCheck, Wrench, Shield
} from 'lucide-react';
import api from '@/lib/api';
import { INSTITUTION } from '@/lib/institution';
import { useT } from '@/i18n/I18nProvider';

type TipoPersona = '' | 'fisica' | 'moral' | 'asociacion_civil' | 'otro';
type ContactoRol = 'responsable' | 'legal' | 'administrativo' | 'tecnico';

interface ContactoData {
  nombre: string;
  telefono: string;
  correo: string;
}

interface FormData {
  // Cuenta
  nombre: string;
  email: string;
  password: string;
  password_confirmation: string;
  // Datos empresa
  empresa_nombre: string;
  empresa_rfc: string;
  empresa_tipo_persona: TipoPersona;
  empresa_rol_supervision: string;
  // Contactos por rol
  contactos: Record<ContactoRol, ContactoData>;
  // Resto
  cargo: string;
  telefono: string;
  motivo: string;
  // Términos
  terminos_aceptados: boolean;
}

const emptyContacto = (): ContactoData => ({ nombre: '', telefono: '', correo: '' });

const emptyForm = (): FormData => ({
  nombre: '',
  email: '',
  password: '',
  password_confirmation: '',
  empresa_nombre: '',
  empresa_rfc: '',
  empresa_tipo_persona: '',
  empresa_rol_supervision: '',
  contactos: {
    responsable: emptyContacto(),
    legal: emptyContacto(),
    administrativo: emptyContacto(),
    tecnico: emptyContacto(),
  },
  cargo: '',
  telefono: '',
  motivo: '',
  terminos_aceptados: false,
});

const ROLES_LABELS: Record<ContactoRol, { label: string; icon: typeof User; hint: string }> = {
  responsable:    { label: 'Responsable del Proyecto', icon: User,      hint: 'Principal contacto técnico-académico del proyecto' },
  legal:          { label: 'Representante Legal',      icon: Scale,     hint: 'Firma convenios y documentos oficiales' },
  administrativo: { label: 'Administrativo',           icon: FileCheck, hint: 'Maneja facturas, ministraciones y trámites' },
  tecnico:        { label: 'Contacto Técnico',         icon: Wrench,    hint: 'Soporte operativo / sistemas / TI' },
};

const TERMS_URL = 'https://apoyoempresarial_comecyt.edomex.gob.mx';

export default function SolicitarAccesoPage() {
  const { t } = useT();
  const STEPS = ['Cuenta', 'Empresa', 'Contactos', 'Detalles', 'Términos'];
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>(emptyForm());
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const f = <K extends keyof FormData>(k: K, v: FormData[K]) => setForm({ ...form, [k]: v });

  const setContacto = (rol: ContactoRol, field: keyof ContactoData, value: string) => {
    setForm({
      ...form,
      contactos: {
        ...form.contactos,
        [rol]: { ...form.contactos[rol], [field]: value },
      },
    });
  };

  const validateStep = (): string | null => {
    if (step === 0) {
      if (!form.nombre.trim()) return t('request_access.name_required');
      if (!form.email.trim()) return t('request_access.email_required');
      if (!form.email.includes('@')) return t('request_access.email_invalid');
      if (!form.password) return t('request_access.password_required');
      if (form.password.length < 8) return t('request_access.password_min');
      if (form.password !== form.password_confirmation) return t('request_access.password_mismatch');
    }
    if (step === 1) {
      if (!form.empresa_nombre.trim()) return t('request_access.institution_required');
    }
    if (step === 2) {
      // Al menos responsable obligatorio
      const r = form.contactos.responsable;
      if (!r.nombre.trim() || !r.correo.trim()) {
        return 'Los datos del Responsable del Proyecto son requeridos (nombre + correo).';
      }
    }
    if (step === 4 && !form.terminos_aceptados) {
      return 'Debes aceptar los términos y condiciones para continuar.';
    }
    return null;
  };

  const nextStep = () => {
    const err = validateStep();
    if (err) { setError(err); return; }
    setError('');
    setStep((s) => s + 1);
  };

  const prevStep = () => { setError(''); setStep((s) => s - 1); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validateStep();
    if (err) { setError(err); return; }

    setLoading(true);
    setError('');
    try {
      await api.post('/auth/solicitar-acceso', {
        nombre: form.nombre,
        email: form.email,
        password: form.password,
        password_confirmation: form.password_confirmation,
        empresa_nombre: form.empresa_nombre,
        cargo: form.cargo,
        telefono: form.telefono,
        motivo: form.motivo,
        empresa_datos: {
          rfc: form.empresa_rfc,
          tipo_persona: form.empresa_tipo_persona || null,
          rol_supervision: form.empresa_rol_supervision,
        },
        contactos: form.contactos,
        terminos_aceptados: form.terminos_aceptados,
      });
      setSent(true);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } };
      const errData = axiosErr.response?.data;
      if (errData?.errors) {
        const msgs = Object.values(errData.errors).flat().join(' · ');
        setError(msgs);
      } else {
        setError(errData?.message || t('request_access.generic_error'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[var(--brand-vino-50)] via-white to-[var(--brand-gold-50)] dark:from-neutral-950 dark:via-neutral-900 dark:to-neutral-950 flex items-center justify-center p-4">
      <div className="absolute top-0 left-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-accent/6 rounded-full blur-3xl translate-x-1/4 translate-y-1/4 pointer-events-none" />

      <div className="w-full max-w-2xl relative animate-in fade-in slide-in-from-bottom-6 duration-600">
        <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-xl shadow-primary/[8%] border border-neutral-100 dark:border-neutral-700 overflow-hidden">
          {/* Top accent */}
          <div className="h-1 bg-gradient-to-r from-primary via-accent to-primary" />

          {/* Header */}
          <div className="px-8 pt-8 pb-6 text-center border-b border-neutral-50 dark:border-neutral-800">
            <Image src="/logo.png" alt={INSTITUTION.name} width={72} height={56} priority className="h-14 w-auto object-contain mx-auto mb-4" />
            <h1 className="text-2xl font-extrabold text-neutral-900 dark:text-neutral-50 mb-1">{t('request_access.title')}</h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-300">
              {t('request_access.subtitle')}
            </p>
          </div>

          {/* Step indicator */}
          {!sent && (
            <div className="px-6 py-4 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {STEPS.map((s, i) => (
                <div key={s} className="flex items-center gap-1.5 shrink-0">
                  <div className={`flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold transition-colors duration-300 ${
                    i < step ? 'bg-primary text-white' :
                    i === step ? 'bg-primary text-white ring-4 ring-primary/20' :
                    'bg-neutral-100 dark:bg-neutral-800 text-neutral-400'
                  }`}>
                    {i < step ? '✓' : i + 1}
                  </div>
                  <span className={`text-[11px] font-semibold transition-colors whitespace-nowrap ${i === step ? 'text-primary' : 'text-neutral-400'}`}>
                    {s}
                  </span>
                  {i < STEPS.length - 1 && (
                    <div className={`h-px w-4 transition-colors duration-500 ${i < step ? 'bg-primary' : 'bg-neutral-200 dark:bg-neutral-700'}`} />
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="px-8 pb-8">
            {sent ? (
              <div className="text-center py-6">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mb-5">
                  <CheckCircle className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-extrabold text-neutral-900 dark:text-neutral-50 mb-2">{t('request_access.sent_title')}</h2>
                <p className="text-sm text-neutral-500 dark:text-neutral-300 mb-4 leading-relaxed">
                  {t('request_access.sent_body', { email: form.email })}
                </p>
                <div className="p-4 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-xl text-left mb-6">
                  <p className="text-xs text-blue-700 dark:text-blue-300 font-medium">
                    {t('request_access.sent_eta', { institution: INSTITUTION.name })}
                  </p>
                </div>
                <Link href="/login">
                  <Button className="bg-gradient-to-r from-primary to-[var(--brand-vino-700)] text-white rounded-xl px-8">
                    {t('request_access.back_to_login')}
                  </Button>
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5 mt-4">
                {error && <AlertBox type="error" message={error} onClose={() => setError('')} />}

                {/* Step 0: Cuenta */}
                {step === 0 && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                    <Field icon={User} label="Nombre Completo *">
                      <Input value={form.nombre} onChange={(e) => f('nombre', e.target.value)} placeholder="Ej: Juan Pérez García" className={inputCls} />
                    </Field>
                    <Field icon={Mail} label="Correo Electrónico Institucional *">
                      <Input type="email" value={form.email} onChange={(e) => f('email', e.target.value)} placeholder={INSTITUTION.emailHint} className={inputCls} />
                    </Field>
                    <Field icon={Lock} label="Contraseña *" rightAction={
                      <button type="button" onClick={() => setShowPass(!showPass)}
                        aria-label={showPass ? t('auth.hide_password') : t('auth.show_password')}
                        aria-pressed={showPass}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-primary transition-colors" tabIndex={-1}>
                        {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    }>
                      <Input type={showPass ? 'text' : 'password'} value={form.password}
                        onChange={(e) => f('password', e.target.value)}
                        autoComplete="off"
                        placeholder="Mínimo 8 caracteres" className={`${inputCls} pr-10`} />
                    </Field>
                    <Field icon={Lock} label="Confirmar Contraseña *">
                      <Input type={showPass ? 'text' : 'password'} value={form.password_confirmation}
                        onChange={(e) => f('password_confirmation', e.target.value)}
                        autoComplete="off"
                        placeholder="Repite la contraseña" className={inputCls} />
                    </Field>
                  </div>
                )}

                {/* Step 1: Datos de la empresa */}
                {step === 1 && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                    <Field icon={Building2} label="Nombre Completo de la Empresa *">
                      <Input value={form.empresa_nombre} onChange={(e) => f('empresa_nombre', e.target.value)}
                        placeholder="Ej: Tecnología e Innovación S.A. de C.V." className={inputCls} />
                    </Field>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Field icon={Hash} label="RFC">
                        <Input value={form.empresa_rfc} onChange={(e) => f('empresa_rfc', e.target.value.toUpperCase())}
                          maxLength={13} placeholder="Ej: XAXX010101000" className={inputCls} />
                      </Field>
                      <Field icon={Users} label="Tipo de Persona">
                        <select value={form.empresa_tipo_persona}
                          onChange={(e) => f('empresa_tipo_persona', e.target.value as TipoPersona)}
                          className={`${inputCls} appearance-none cursor-pointer`}>
                          <option value="">Selecciona...</option>
                          <option value="fisica">Persona Física</option>
                          <option value="moral">Persona Moral</option>
                          <option value="asociacion_civil">Asociación Civil</option>
                          <option value="otro">Otra</option>
                        </select>
                      </Field>
                    </div>
                    <Field icon={Shield} label="Rol de Supervisión">
                      <Input value={form.empresa_rol_supervision} onChange={(e) => f('empresa_rol_supervision', e.target.value)}
                        placeholder="Ej: Director General, Gerente de Proyectos" className={inputCls} />
                    </Field>
                  </div>
                )}

                {/* Step 2: Contactos por rol */}
                {step === 2 && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                    <p className="text-xs text-neutral-500 dark:text-neutral-300 leading-relaxed">
                      Registra los contactos relevantes de tu empresa. <strong className="text-primary">Responsable del Proyecto</strong> es obligatorio; los demás puedes dejarlos en blanco si <em>no aplica</em>.
                    </p>
                    {(Object.keys(ROLES_LABELS) as ContactoRol[]).map((rol) => {
                      const meta = ROLES_LABELS[rol];
                      const Icon = meta.icon;
                      const isRequired = rol === 'responsable';
                      return (
                        <div key={rol} className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50/40 dark:bg-neutral-800/30 p-4 space-y-3">
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                              <Icon className="w-3.5 h-3.5" />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-neutral-800 dark:text-neutral-100">
                                {meta.label} {isRequired && <span className="text-red-500">*</span>}
                              </p>
                              <p className="text-[11px] text-neutral-400 dark:text-neutral-500">{meta.hint}</p>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <Input value={form.contactos[rol].nombre}
                              onChange={(e) => setContacto(rol, 'nombre', e.target.value)}
                              placeholder="Nombre" className="h-10 text-sm rounded-lg bg-white dark:bg-neutral-900" />
                            <Input value={form.contactos[rol].telefono}
                              onChange={(e) => setContacto(rol, 'telefono', e.target.value)}
                              placeholder="Teléfono" className="h-10 text-sm rounded-lg bg-white dark:bg-neutral-900" />
                            <Input value={form.contactos[rol].correo} type="email"
                              onChange={(e) => setContacto(rol, 'correo', e.target.value)}
                              placeholder="Correo" className="h-10 text-sm rounded-lg bg-white dark:bg-neutral-900" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Step 3: Detalles personales + motivo */}
                {step === 3 && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Field icon={Briefcase} label="Tu Cargo / Puesto">
                        <Input value={form.cargo} onChange={(e) => f('cargo', e.target.value)}
                          placeholder="Ej: Investigador Titular A" className={inputCls} />
                      </Field>
                      <Field icon={Phone} label="Teléfono de Contacto">
                        <Input value={form.telefono} onChange={(e) => f('telefono', e.target.value)}
                          placeholder="Ej: 722 123 4567" className={inputCls} />
                      </Field>
                    </div>
                    <div>
                      <Label className="text-xs font-bold text-neutral-600 dark:text-neutral-300 uppercase tracking-widest flex items-center gap-1.5 mb-2">
                        <FileText className="w-3.5 h-3.5" /> Motivo de la Solicitud
                      </Label>
                      <textarea value={form.motivo} onChange={(e) => f('motivo', e.target.value)} maxLength={500}
                        placeholder="Describe brevemente para qué necesitas acceso al sistema y los proyectos que planeas gestionar..."
                        className="w-full px-4 py-3 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm resize-none h-28 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-neutral-50 dark:bg-neutral-800 transition-all" />
                      <p className="text-xs text-neutral-400 mt-1">{form.motivo.length}/500 caracteres</p>
                    </div>
                  </div>
                )}

                {/* Step 4: Resumen + términos */}
                {step === 4 && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="p-4 bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-700 rounded-xl space-y-2">
                      <p className="text-xs font-bold text-neutral-600 dark:text-neutral-300 uppercase tracking-wider mb-2">Resumen de tu solicitud</p>
                      <SummaryRow label="Nombre" value={form.nombre} />
                      <SummaryRow label="Correo" value={form.email} />
                      <SummaryRow label="Empresa" value={form.empresa_nombre} />
                      {form.empresa_rfc && <SummaryRow label="RFC" value={form.empresa_rfc} />}
                      {form.empresa_tipo_persona && <SummaryRow label="Tipo persona" value={tipoPersonaLabel(form.empresa_tipo_persona)} />}
                      <SummaryRow label="Responsable" value={form.contactos.responsable.nombre || '—'} />
                      {form.cargo && <SummaryRow label="Tu cargo" value={form.cargo} />}
                    </div>

                    <label className="flex items-start gap-3 p-4 bg-primary/5 border border-primary/20 rounded-xl cursor-pointer hover:bg-primary/10 transition-colors">
                      <input type="checkbox" checked={form.terminos_aceptados}
                        onChange={(e) => f('terminos_aceptados', e.target.checked)}
                        className="mt-0.5 w-4 h-4 rounded border-primary/30 text-primary focus:ring-primary/20 cursor-pointer" />
                      <div className="text-xs text-neutral-700 dark:text-neutral-200 leading-relaxed">
                        He leído y acepto los{' '}
                        <a href={TERMS_URL} target="_blank" rel="noopener noreferrer"
                          className="font-bold text-primary hover:text-[var(--brand-vino-700)] underline underline-offset-2">
                          términos y condiciones
                        </a>{' '}
                        del programa de apoyo empresarial de {INSTITUTION.name}, así como el aviso de privacidad y el uso de los datos para fines de evaluación y seguimiento.
                      </div>
                    </label>
                  </div>
                )}

                {/* Navigation buttons */}
                <div className="flex gap-3 pt-2">
                  {step > 0 && (
                    <Button type="button" variant="outline" onClick={prevStep} className="flex-1 h-12 rounded-xl">
                      <ArrowLeft className="w-4 h-4 mr-1.5" /> Anterior
                    </Button>
                  )}
                  {step < STEPS.length - 1 ? (
                    <Button type="button" onClick={nextStep} className="flex-1 h-12 rounded-xl bg-gradient-to-r from-primary to-[var(--brand-vino-700)] hover:from-[var(--brand-vino-700)] hover:to-[var(--brand-vino-600)] text-white font-bold transition-all duration-200 hover:-translate-y-0.5">
                      Siguiente →
                    </Button>
                  ) : (
                    <Button type="submit" disabled={loading || !form.terminos_aceptados}
                      className="btn-shimmer overflow-hidden flex-1 h-12 rounded-xl bg-gradient-to-r from-primary to-[var(--brand-vino-700)] hover:from-[var(--brand-vino-700)] hover:to-[var(--brand-vino-600)] text-white font-bold shadow-lg shadow-primary/25 hover:-translate-y-0.5 transition-all duration-200 relative">
                      {loading ? (
                        <span className="flex items-center gap-2 relative z-10">
                          <Loader2 className="h-4 w-4 animate-spin" /> {t('request_access.sending')}
                        </span>
                      ) : (
                        <span className="relative z-10">{t('request_access.submit')}</span>
                      )}
                    </Button>
                  )}
                </div>
              </form>
            )}

            <div className="mt-6 pt-5 border-t border-neutral-100 dark:border-neutral-800 text-center">
              <Link href="/login" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-[var(--brand-vino-700)] transition-colors group">
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                {t('request_access.already_have_account')}
              </Link>
            </div>
          </div>
        </div>
        <p className="text-center text-xs text-neutral-400 mt-4">© {new Date().getFullYear()} {INSTITUTION.name} · {INSTITUTION.state}</p>
      </div>
    </div>
  );
}

const inputCls = "pl-10 h-12 rounded-xl bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 focus:ring-2 focus:ring-primary/20 focus:border-primary";

function tipoPersonaLabel(t: string): string {
  switch (t) {
    case 'fisica': return 'Persona Física';
    case 'moral': return 'Persona Moral';
    case 'asociacion_civil': return 'Asociación Civil';
    case 'otro': return 'Otra';
    default: return '—';
  }
}

function Field({ icon: Icon, label, children, rightAction }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
  rightAction?: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-bold text-neutral-600 dark:text-neutral-300 uppercase tracking-widest">{label}</Label>
      <div className="relative group">
        <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 group-focus-within:text-primary transition-colors z-10" />
        {children}
        {rightAction}
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-neutral-400 dark:text-neutral-500 w-28 shrink-0">{label}:</span>
      <span className="text-neutral-700 dark:text-neutral-200 font-medium truncate">{value}</span>
    </div>
  );
}
