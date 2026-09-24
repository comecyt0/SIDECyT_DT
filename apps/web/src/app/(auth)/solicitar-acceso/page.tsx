'use client';

import { useState, Children, cloneElement, isValidElement, type ReactElement, type InputHTMLAttributes } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { AlertBox } from '@/components/ui/alert-box';
import DualBranding from '@/components/branding/DualBranding';
import LanguageSwitcher from '@/components/ui/LanguageSwitcher';
import {
  Loader2, User, Mail, Lock, Building2, Briefcase,
  Phone, FileText, ArrowLeft, Check, Eye, EyeOff,
  Hash, Users, Scale, FileCheck, Wrench, Shield, ClipboardList
} from 'lucide-react';
import api from '@/lib/api';
import { validarPassword } from '@/lib/password-policy';
import { INSTITUTION, copyrightLine } from '@/lib/institution';
import { useT } from '@/i18n/I18nProvider';

type TipoPersona = '' | 'fisica' | 'moral' | 'asociacion_civil' | 'otro';
type ContactoRol = 'responsable' | 'legal' | 'administrativo' | 'tecnico';

interface ContactoData {
  nombre: string;
  telefono: string;
  correo: string;
}

interface FormData {
  nombre: string;
  email: string;
  password: string;
  password_confirmation: string;
  empresa_nombre: string;
  empresa_rfc: string;
  empresa_tipo_persona: TipoPersona;
  empresa_rol_supervision: string;
  contactos: Record<ContactoRol, ContactoData>;
  cargo: string;
  telefono: string;
  motivo: string;
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

const STEP_BLURB: Record<number, { tag: string; title: string; body: string }> = {
  0: { tag: 'Paso 1 de 5', title: 'Tu cuenta de acceso', body: 'El correo institucional será tu usuario para entrar al sistema una vez aprobada la solicitud.' },
  1: { tag: 'Paso 2 de 5', title: 'Datos de tu institución', body: 'Usamos el RFC y el tipo de persona para vincular correctamente tus proyectos y convenios.' },
  2: { tag: 'Paso 3 de 5', title: 'Contactos por rol', body: 'El Responsable del Proyecto es obligatorio; los demás agilizan trámites administrativos y legales.' },
  3: { tag: 'Paso 4 de 5', title: 'Cuéntanos más', body: 'Un motivo claro ayuda al administrador a revisar y aprobar tu acceso más rápido.' },
  4: { tag: 'Paso 5 de 5', title: 'Último paso', body: 'Revisa tu información antes de enviarla. Un administrador la validará manualmente.' },
};

/** Mismo sistema --auth-* del login. Ver docs/DISENO_UI.md §Login. */
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
      contactos: { ...form.contactos, [rol]: { ...form.contactos[rol], [field]: value } },
    });
  };

  const validateStep = (): string | null => {
    if (step === 0) {
      if (!form.nombre.trim()) return t('request_access.name_required');
      if (!form.email.trim()) return t('request_access.email_required');
      if (!form.email.includes('@')) return t('request_access.email_invalid');
      if (!form.password) return t('request_access.password_required');
      if (validarPassword(form.password)) return validarPassword(form.password);
      if (form.password !== form.password_confirmation) return t('request_access.password_mismatch');
    }
    if (step === 1) {
      if (!form.empresa_nombre.trim()) return t('request_access.institution_required');
    }
    if (step === 2) {
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
        setError(Object.values(errData.errors).flat().join(' · '));
      } else {
        setError(errData?.message || t('request_access.generic_error'));
      }
    } finally {
      setLoading(false);
    }
  };

  const blurb = STEP_BLURB[step];

  return (
    <div className="flex min-h-screen bg-[var(--auth-paper)] font-sans text-[var(--auth-ink)]">
      {/* ── Izquierda: panel institucional (estático, sigue el paso activo) ── */}
      <div className="sticky top-0 hidden h-screen p-4 lg:block lg:w-[42%] xl:w-[38%] xl:p-5">
        <section className="auth-banner h-full w-full">
          <div aria-hidden="true" className="absolute inset-0 -z-10">
            <span className="auth-blob auth-blob-1" style={{ transform: 'translate(-10%, -16%) scale(1)' }} />
            <span className="auth-blob auth-blob-2" style={{ transform: 'translate(42%, 8%) scale(0.95)' }} />
            <span className="auth-blob auth-blob-3" style={{ transform: 'translate(4%, 48%) scale(1.05)' }} />
            <span className="auth-grain" />
          </div>
          <div className="relative flex h-full flex-col p-8 text-white xl:p-10">
            <div className="auth-reveal" style={{ '--i': 0 } as React.CSSProperties}>
              <Image src="/logo.png" alt={INSTITUTION.name} width={401} height={312} priority className="h-20 w-auto object-contain brightness-0 invert xl:h-24" />
            </div>
            <div className="mt-auto">
              <div key={step} className="auth-reveal" style={{ '--i': 1 } as React.CSSProperties}>
                <p className="auth-tag mb-4">
                  <ClipboardList className="h-3.5 w-3.5" aria-hidden="true" /> {blurb.tag}
                </p>
                <div className="auth-glass p-7 xl:p-8">
                  <h2 className="auth-banner-title">{blurb.title}</h2>
                  <p className="mt-3 max-w-[38ch] text-[15px] leading-relaxed text-white/80">{blurb.body}</p>
                </div>
              </div>

              {/* Progreso — 5 segmentos, mismo lenguaje visual que el carrusel del login */}
              <div className="mt-5 flex items-center gap-2">
                {STEPS.map((label, i) => (
                  <div key={label} className="flex-1">
                    <div className="h-[3px] rounded-full overflow-hidden" style={{ background: 'color-mix(in oklch, var(--auth-white) 25%, transparent)' }}>
                      <div
                        className="h-full bg-white transition-all duration-500"
                        style={{ width: i < step ? '100%' : i === step ? '55%' : '0%' }}
                      />
                    </div>
                    <p className="mt-1.5 text-[10px] font-semibold text-white/70 truncate">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* ── Derecha: formulario ── */}
      <main className="flex min-h-screen w-full flex-col lg:w-[58%] xl:w-[62%]">
        <div className="flex justify-end px-6 pt-5">
          <LanguageSwitcher />
        </div>

        <div className="flex flex-1 items-center justify-center px-6 py-10 sm:px-10">
          <div className="w-full max-w-[560px]">
            <div className="mb-8 flex justify-center lg:hidden">
              <DualBranding size="lg" />
            </div>

            {sent ? (
              <div className="auth-swap text-center py-4">
                <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl" style={{ background: 'var(--tile-emerald-bg)' }}>
                  <Check className="h-8 w-8" style={{ color: 'var(--tile-emerald-fg)' }} />
                </div>
                <h2 className="text-xl font-bold text-[var(--auth-ink)] mb-2">{t('request_access.sent_title')}</h2>
                <p className="text-sm text-[var(--auth-ink-2)] mb-5 leading-relaxed">
                  {t('request_access.sent_body', { email: form.email })}
                </p>
                <div className="mb-7 rounded-[var(--auth-radius-field)] border p-3.5 text-left" style={{ borderColor: 'var(--auth-rule)' }}>
                  <p className="text-xs text-[var(--auth-ink-2)] leading-relaxed">
                    {t('request_access.sent_eta', { institution: INSTITUTION.name })}
                  </p>
                </div>
                <Link href="/login" className="auth-submit inline-flex w-auto px-8">
                  {t('request_access.back_to_login')}
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="text-center mb-2">
                  <h1 className="text-[clamp(1.5rem,2.6vw,1.875rem)] font-bold tracking-[-0.03em]">{t('request_access.title')}</h1>
                  <p className="mt-2 text-sm text-[var(--auth-ink-2)]">{t('request_access.subtitle')}</p>
                </div>

                {/* Stepper compacto (móvil / referencia rápida) */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                  {STEPS.map((s, i) => (
                    <div key={s} className="flex items-center gap-1.5 shrink-0">
                      <div
                        className="flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold transition-colors duration-300"
                        style={
                          i < step
                            ? { background: 'var(--auth-vino)', color: 'var(--auth-white)' }
                            : i === step
                              ? { background: 'var(--auth-vino)', color: 'var(--auth-white)', boxShadow: '0 0 0 4px var(--auth-vino-soft)' }
                              : { background: 'var(--auth-field)', color: 'var(--auth-ink-2)' }
                        }
                      >
                        {i < step ? <Check className="w-3 h-3" aria-label="Completado" /> : i + 1}
                      </div>
                      <span className="text-[11px] font-semibold whitespace-nowrap" style={{ color: i === step ? 'var(--auth-vino)' : 'var(--auth-ink-2)' }}>
                        {s}
                      </span>
                      {i < STEPS.length - 1 && <div className="h-px w-4" style={{ background: i < step ? 'var(--auth-vino)' : 'var(--auth-rule)' }} />}
                    </div>
                  ))}
                </div>

                {error && (
                  <div id="request-error">
                    <AlertBox type="error" message={error} onClose={() => setError('')} />
                  </div>
                )}

                {/* Step 0: Cuenta */}
                {step === 0 && (
                  <div className="space-y-3 auth-swap">
                    <FField id="nombre" icon={User} label="Nombre Completo *">
                      <input value={form.nombre} onChange={(e) => f('nombre', e.target.value)} placeholder=" " className="auth-input" />
                    </FField>
                    <FField id="email-solicitud" icon={Mail} label="Correo Electrónico Institucional *">
                      <input type="email" value={form.email} onChange={(e) => f('email', e.target.value)} placeholder=" " className="auth-input" />
                    </FField>
                    <FField id="password-solicitud" icon={Lock} label="Contraseña *">
                      <input
                        type={showPass ? 'text' : 'password'}
                        value={form.password}
                        onChange={(e) => f('password', e.target.value)}
                        autoComplete="off"
                        placeholder=" "
                        className="auth-input pr-12"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPass(!showPass)}
                        aria-label={showPass ? t('auth.hide_password') : t('auth.show_password')}
                        aria-pressed={showPass}
                        className="auth-eye"
                        tabIndex={-1}
                      >
                        {showPass ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                      </button>
                    </FField>
                    <FField id="password-confirm" icon={Lock} label="Confirmar Contraseña *">
                      <input
                        type={showPass ? 'text' : 'password'}
                        value={form.password_confirmation}
                        onChange={(e) => f('password_confirmation', e.target.value)}
                        autoComplete="off"
                        placeholder=" "
                        className="auth-input"
                      />
                    </FField>
                  </div>
                )}

                {/* Step 1: Empresa */}
                {step === 1 && (
                  <div className="space-y-3 auth-swap">
                    <FField id="empresa-nombre" icon={Building2} label="Nombre Completo de la Empresa *">
                      <input value={form.empresa_nombre} onChange={(e) => f('empresa_nombre', e.target.value)} placeholder=" " className="auth-input" />
                    </FField>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <FField id="empresa-rfc" icon={Hash} label="RFC">
                        <input value={form.empresa_rfc} onChange={(e) => f('empresa_rfc', e.target.value.toUpperCase())} maxLength={13} placeholder=" " className="auth-input" />
                      </FField>
                      <StaticField id="empresa-tipo-persona" icon={Users} label="Tipo de Persona">
                        <select
                          value={form.empresa_tipo_persona}
                          onChange={(e) => f('empresa_tipo_persona', e.target.value as TipoPersona)}
                          className="auth-input auth-input-static pl-10 appearance-none cursor-pointer"
                        >
                          <option value="">Selecciona…</option>
                          <option value="fisica">Persona Física</option>
                          <option value="moral">Persona Moral</option>
                          <option value="asociacion_civil">Asociación Civil</option>
                          <option value="otro">Otra</option>
                        </select>
                      </StaticField>
                    </div>
                    <FField id="empresa-rol-supervision" icon={Shield} label="Rol de Supervisión">
                      <input value={form.empresa_rol_supervision} onChange={(e) => f('empresa_rol_supervision', e.target.value)} placeholder=" " className="auth-input" />
                    </FField>
                  </div>
                )}

                {/* Step 2: Contactos por rol */}
                {step === 2 && (
                  <div className="space-y-3 auth-swap">
                    <p className="text-xs text-[var(--auth-ink-2)] leading-relaxed">
                      Registra los contactos relevantes de tu empresa. <strong className="text-[var(--auth-vino)]">Responsable del Proyecto</strong> es obligatorio; los demás puedes dejarlos en blanco si <em>no aplica</em>.
                    </p>
                    {(Object.keys(ROLES_LABELS) as ContactoRol[]).map((rol) => {
                      const meta = ROLES_LABELS[rol];
                      const Icon = meta.icon;
                      const isRequired = rol === 'responsable';
                      return (
                        <div key={rol} className="rounded-[var(--auth-radius-field)] border p-4 space-y-2.5" style={{ borderColor: 'var(--auth-rule)', background: 'var(--auth-field)' }}>
                          <div className="flex items-center gap-2">
                            <span className="app-tile-icon !w-8 !h-8 !rounded-lg" style={{ color: 'var(--auth-vino)' }}>
                              <Icon className="w-3.5 h-3.5" />
                            </span>
                            <div>
                              <p className="text-sm font-bold text-[var(--auth-ink)]">
                                {meta.label} {isRequired && <span style={{ color: 'var(--auth-danger)' }}>*</span>}
                              </p>
                              <p className="text-[11px] text-[var(--auth-ink-2)]">{meta.hint}</p>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <input value={form.contactos[rol].nombre} onChange={(e) => setContacto(rol, 'nombre', e.target.value)} placeholder="Nombre" aria-label={`${meta.label} — nombre`} className="auth-input pl-4 h-11 bg-[var(--auth-white)]" />
                            <input value={form.contactos[rol].telefono} onChange={(e) => setContacto(rol, 'telefono', e.target.value)} placeholder="Teléfono" aria-label={`${meta.label} — teléfono`} className="auth-input pl-4 h-11 bg-[var(--auth-white)]" />
                            <input value={form.contactos[rol].correo} type="email" onChange={(e) => setContacto(rol, 'correo', e.target.value)} placeholder="Correo" aria-label={`${meta.label} — correo`} className="auth-input pl-4 h-11 bg-[var(--auth-white)]" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Step 3: Detalles + motivo */}
                {step === 3 && (
                  <div className="space-y-3 auth-swap">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <FField id="cargo" icon={Briefcase} label="Tu Cargo / Puesto">
                        <input value={form.cargo} onChange={(e) => f('cargo', e.target.value)} placeholder=" " className="auth-input" />
                      </FField>
                      <FField id="telefono" icon={Phone} label="Teléfono de Contacto">
                        <input value={form.telefono} onChange={(e) => f('telefono', e.target.value)} placeholder=" " className="auth-input" />
                      </FField>
                    </div>
                    <StaticField id="motivo" icon={FileText} label="Motivo de la Solicitud">
                      <textarea
                        value={form.motivo}
                        onChange={(e) => f('motivo', e.target.value)}
                        maxLength={500}
                        placeholder="Describe brevemente para qué necesitas acceso al sistema y los proyectos que planeas gestionar…"
                        className="w-full pl-10 pr-4 py-3 rounded-[var(--auth-radius-field)] border-1.5 text-sm resize-none h-28 outline-none transition-colors"
                        style={{ borderColor: 'var(--auth-rule)', background: 'var(--auth-field)', color: 'var(--auth-ink)' }}
                      />
                    </StaticField>
                    <p className="text-xs text-[var(--auth-ink-2)] text-right">{form.motivo.length}/500 caracteres</p>
                  </div>
                )}

                {/* Step 4: Resumen + términos */}
                {step === 4 && (
                  <div className="space-y-4 auth-swap">
                    <div className="rounded-[var(--auth-radius-field)] border p-4 space-y-2" style={{ borderColor: 'var(--auth-rule)', background: 'var(--auth-field)' }}>
                      <p className="text-xs font-bold text-[var(--auth-ink-2)] uppercase tracking-wider mb-1">Resumen de tu solicitud</p>
                      <SummaryRow label="Nombre" value={form.nombre} />
                      <SummaryRow label="Correo" value={form.email} />
                      <SummaryRow label="Empresa" value={form.empresa_nombre} />
                      {form.empresa_rfc && <SummaryRow label="RFC" value={form.empresa_rfc} />}
                      {form.empresa_tipo_persona && <SummaryRow label="Tipo persona" value={tipoPersonaLabel(form.empresa_tipo_persona)} />}
                      <SummaryRow label="Responsable" value={form.contactos.responsable.nombre || '—'} />
                      {form.cargo && <SummaryRow label="Tu cargo" value={form.cargo} />}
                    </div>

                    <label
                      className="flex items-start gap-3 p-4 rounded-[var(--auth-radius-field)] border cursor-pointer transition-colors"
                      style={{ borderColor: 'var(--auth-rule)', background: form.terminos_aceptados ? 'var(--auth-vino-soft)' : 'var(--auth-field)' }}
                    >
                      <input
                        type="checkbox"
                        checked={form.terminos_aceptados}
                        onChange={(e) => f('terminos_aceptados', e.target.checked)}
                        className="mt-0.5 w-4 h-4 rounded cursor-pointer accent-[var(--auth-vino)]"
                      />
                      <span className="text-xs text-[var(--auth-ink)] leading-relaxed">
                        He leído y acepto los{' '}
                        <a href={TERMS_URL} target="_blank" rel="noopener noreferrer" className="auth-link">
                          términos y condiciones
                        </a>{' '}
                        del programa de apoyo empresarial de {INSTITUTION.name}, así como el aviso de privacidad y el uso de los datos para fines de evaluación y seguimiento.
                      </span>
                    </label>
                  </div>
                )}

                {/* Navigation */}
                <div className="flex gap-3 pt-2">
                  {step > 0 && (
                    <button type="button" onClick={prevStep} className="flex-1 h-12 rounded-[var(--auth-radius-field)] border font-bold text-sm transition-colors hover:bg-[var(--auth-field)]" style={{ borderColor: 'var(--auth-rule)', color: 'var(--auth-ink)' }}>
                      <span className="flex items-center justify-center gap-1.5">
                        <ArrowLeft className="w-4 h-4" /> Anterior
                      </span>
                    </button>
                  )}
                  {step < STEPS.length - 1 ? (
                    <button type="button" onClick={nextStep} className="auth-submit flex-1">
                      Siguiente
                    </button>
                  ) : (
                    <button type="submit" disabled={loading || !form.terminos_aceptados} data-state={loading ? 'loading' : 'idle'} className="auth-submit flex-1">
                      <span key={loading ? 'loading' : 'idle'} className="auth-swap flex items-center gap-2.5">
                        {loading ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" /> {t('request_access.sending')}
                          </>
                        ) : (
                          t('request_access.submit')
                        )}
                      </span>
                    </button>
                  )}
                </div>
              </form>
            )}

            <div className="mt-8 pt-6 border-t text-center" style={{ borderColor: 'var(--auth-rule)' }}>
              <Link href="/login" className="auth-link inline-flex items-center gap-1.5 text-sm">
                <ArrowLeft className="w-4 h-4" />
                {t('request_access.already_have_account')}
              </Link>
            </div>
          </div>
        </div>

        <footer className="px-6 pb-6 text-center text-xs text-[var(--auth-ink-2)]">{copyrightLine()}</footer>
      </main>
    </div>
  );
}

function tipoPersonaLabel(t: string): string {
  switch (t) {
    case 'fisica': return 'Persona Física';
    case 'moral': return 'Persona Moral';
    case 'asociacion_civil': return 'Asociación Civil';
    case 'otro': return 'Otra';
    default: return '—';
  }
}

/** Campo con etiqueta flotante — mismo patrón que el login (auth-field/auth-input/auth-label).
 * Clona el <input> hijo para inyectarle `id` — así el label queda asociado (WCAG 1.3.1 /
 * axe "label"), sin repetir id={} y htmlFor={} iguales en cada punto de uso. */
function FField({
  id,
  icon: Icon,
  label,
  children,
}: {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  const kids = Children.map(children, (child) =>
    isValidElement(child) && child.type === 'input'
      ? cloneElement(child as ReactElement<InputHTMLAttributes<HTMLInputElement>>, { id })
      : child
  );
  return (
    <div className="auth-field">
      {kids}
      <label htmlFor={id} className="auth-label">
        {label}
      </label>
      <Icon className="auth-field-icon" aria-hidden="true" />
    </div>
  );
}

/** Campo con etiqueta estática arriba — para select / textarea, donde flotar no aplica. */
function StaticField({
  id,
  icon: Icon,
  label,
  children,
}: {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  const kids = Children.map(children, (child) =>
    isValidElement(child) && (child.type === 'select' || child.type === 'textarea')
      ? cloneElement(child as ReactElement<{ id?: string }>, { id })
      : child
  );
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-xs font-bold text-[var(--auth-ink-2)] uppercase tracking-widest flex items-center gap-1.5">
        <Icon className="w-3.5 h-3.5" /> {label}
      </label>
      <div className="relative">
        <Icon className="absolute left-3.5 top-[18px] w-4 h-4 text-[var(--auth-ink-2)] pointer-events-none" aria-hidden="true" />
        {kids}
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-[var(--auth-ink-2)] w-28 shrink-0">{label}:</span>
      <span className="text-[var(--auth-ink)] font-medium truncate">{value}</span>
    </div>
  );
}
