'use client';

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Briefcase, Building2, Check, ClipboardList, Eye, EyeOff, FileText, FlaskConical, GraduationCap, Hash, Loader2,
  Lock, Mail, MapPin, Phone, School, Shield, User, Users, CircleAlert, IdCard, House,
} from 'lucide-react';
import api from '@/lib/api';
import { AlertBox } from '@/components/ui/alert-box';
import DualBranding from '@/components/branding/DualBranding';
import LanguageSwitcher from '@/components/ui/LanguageSwitcher';
import PieAuth from '@/components/branding/PieAuth';
import { BandaInstitucional, LogoComecyt } from '@/components/branding/Logos';
import { FField, StaticField, SummaryRow } from '@/components/registro/CamposAuth';
import { validarPassword } from '@/lib/password-policy';
import { ROLES_AUTOSERVICIO, type RolAutoservicio } from '@/lib/roles';
import {
  GRADO_ETIQUETA, PATRON_CORREO, PATRON_CURP, PATRON_RFC, PATRON_TELEFONO, ROL_REGISTRO, erroresServidor, useCodigoPostal,
} from '@/lib/registro';

/**
 * E52 · Fase 5 — Registro general de SIDECyT (reemplaza "Solicitar acceso"; /solicitar-acceso redirige aquí).
 * Pasos: rol → datos personales → domicilio (CP del Estado de México) → datos del rol → contraseña → confirmar.
 * Un administrador aprueba la cuenta con el rol elegido (decisión del usuario). Validación en dos capas (regla 9).
 */

type TipoPersona = '' | 'fisica' | 'moral' | 'asociacion_civil' | 'otro';
type Paso = 'rol' | 'persona' | 'domicilio' | 'empresa' | 'evaluador' | 'club' | 'seguridad' | 'confirmar';

const TERMS_URL = '/terminos';
const CV_MAX_MB = 5;

const ICONO_ROL: Record<RolAutoservicio, ReactNode> = {
  solicitante: <Building2 aria-hidden="true" />,
  lider_club: <School aria-hidden="true" />,
  evaluador: <FlaskConical aria-hidden="true" />,
};

const BLURB: Record<Paso, { titulo: string; texto: string }> = {
  rol: { titulo: '¿Cómo participarás?', texto: 'Elige tu rol. Un administrador del COMECYT revisa y aprueba tu cuenta con ese rol. Después podrás pedir otro rol desde tu panel.' },
  persona: { titulo: 'Tus datos', texto: 'Tu correo será tu usuario para entrar. La CURP evita cuentas duplicadas: una persona, una cuenta.' },
  domicilio: { titulo: 'Tu domicilio', texto: 'Escribe tu código postal y llenamos el municipio. El registro es para el Estado de México.' },
  empresa: { titulo: 'Tu empresa', texto: 'Estos datos vinculan tus proyectos y convenios con tu empresa o institución.' },
  evaluador: { titulo: 'Tu perfil de evaluación', texto: 'Tu área y tu CV ayudan al administrador a asignarte proyectos de tu especialidad.' },
  club: { titulo: 'Tu club', texto: 'Cuando aprueben tu cuenta, desde tu panel registrarás a tu club, su escuela y sus integrantes.' },
  seguridad: { titulo: 'Protege tu cuenta', texto: 'Usa una contraseña de al menos 10 caracteres con mayúsculas, minúsculas y números.' },
  confirmar: { titulo: 'Último paso', texto: 'Revisa tu información antes de enviarla. Te avisaremos por correo cuando tu cuenta esté aprobada.' },
};

const ETIQUETA_PASO: Record<Paso, string> = {
  rol: 'Rol', persona: 'Datos', domicilio: 'Domicilio', empresa: 'Empresa', evaluador: 'Perfil', club: 'Club', seguridad: 'Contraseña', confirmar: 'Confirmar',
};

interface Contacto { nombre: string; telefono: string; correo: string }
const CONTACTOS = ['responsable', 'legal', 'administrativo', 'tecnico'] as const;
const CONTACTO_ETIQUETA: Record<(typeof CONTACTOS)[number], string> = {
  responsable: 'Responsable del proyecto', legal: 'Representante legal', administrativo: 'Contacto administrativo', tecnico: 'Contacto técnico',
};

export default function RegistroPage() {
  const [rol, setRol] = useState<RolAutoservicio | ''>('');
  const [paso, setPaso] = useState<Paso>('rol');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [verPass, setVerPass] = useState(false);

  const [p, setP] = useState({ nombre: '', email: '', telefono: '', curp: '', cargo: '', cp: '', colonia: '', password: '', password2: '', terminos: false });
  const [emp, setEmp] = useState({ nombre: '', rfc: '', tipo: '' as TipoPersona, supervision: '' });
  const [contactos, setContactos] = useState<Record<(typeof CONTACTOS)[number], Contacto>>({
    responsable: { nombre: '', telefono: '', correo: '' }, legal: { nombre: '', telefono: '', correo: '' },
    administrativo: { nombre: '', telefono: '', correo: '' }, tecnico: { nombre: '', telefono: '', correo: '' },
  });
  const [ev, setEv] = useState({ area: '', institucion: '', grado: '' });
  const [cv, setCv] = useState<File | null>(null);
  const [opciones, setOpciones] = useState<{ areas: { id: number; nombre: string }[]; grados: string[] }>({ areas: [], grados: [] });

  const { estado: estadoCp, datos: cpDatos } = useCodigoPostal(p.cp);

  // Opciones públicas del evaluador (áreas y grados), validadas antes de usarse.
  useEffect(() => {
    if (rol !== 'evaluador' || opciones.areas.length) return;
    fetch('/api/registro/opciones', { credentials: 'omit', headers: { Accept: 'application/json' } })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) return;
        setOpciones({
          areas: Array.isArray(d.areas) ? d.areas.filter((a: { id?: unknown; nombre?: unknown }) => typeof a?.id === 'number' && typeof a?.nombre === 'string') : [],
          grados: Array.isArray(d.grados) ? d.grados.filter((g: unknown) => typeof g === 'string') : [],
        });
      })
      .catch(() => {});
  }, [rol, opciones.areas.length]);

  // Si cambia el código postal, la colonia elegida deja de valer.
  useEffect(() => { setP((a) => (a.colonia && !cpDatos?.colonias.some((c) => c.nombre === a.colonia) ? { ...a, colonia: '' } : a)); }, [cpDatos]);

  const pasos: Paso[] = useMemo(() => {
    const especifico: Paso = rol === 'solicitante' ? 'empresa' : rol === 'evaluador' ? 'evaluador' : 'club';
    return ['rol', 'persona', 'domicilio', especifico, 'seguridad', 'confirmar'];
  }, [rol]);
  const idx = pasos.indexOf(paso);

  const validar = (x: Paso): string | null => {
    switch (x) {
      case 'rol':
        return rol ? null : 'Elige cómo participarás.';
      case 'persona':
        if (p.nombre.trim().length < 5) return 'Escribe tu nombre completo.';
        if (!PATRON_CORREO.test(p.email.trim())) return 'Escribe un correo válido.';
        if (!PATRON_TELEFONO.test(p.telefono)) return 'El teléfono debe tener 10 dígitos.';
        if (!PATRON_CURP.test(p.curp)) return 'La CURP no tiene un formato válido (18 caracteres).';
        if (!p.cargo.trim()) return 'Escribe tu cargo u ocupación.';
        return null;
      case 'domicilio':
        if (!/^\d{5}$/.test(p.cp)) return 'Escribe tu código postal de 5 dígitos.';
        if (estadoCp === 'fuera') return 'Ese código postal no pertenece al Estado de México. El registro es solo para el Estado de México.';
        if (estadoCp === 'error') return 'No pudimos consultar el código postal. Revisa tu conexión e intenta de nuevo.';
        if (estadoCp !== 'ok') return 'Espera a que carguemos tu código postal.';
        if (!p.colonia) return 'Elige tu colonia.';
        return null;
      case 'empresa':
        if (!emp.nombre.trim()) return 'Escribe el nombre de tu empresa o institución.';
        if (emp.rfc && !PATRON_RFC.test(emp.rfc)) return 'El RFC no tiene un formato válido.';
        if (!contactos.responsable.nombre.trim() || !PATRON_CORREO.test(contactos.responsable.correo.trim())) return 'Registra el nombre y el correo del Responsable del proyecto.';
        return null;
      case 'evaluador':
        if (!ev.area) return 'Elige tu área de conocimiento.';
        if (!ev.institucion.trim()) return 'Escribe la institución donde laboras.';
        if (!ev.grado) return 'Elige tu grado académico.';
        if (!cv) return 'Adjunta tu CV en PDF.';
        if (cv.type !== 'application/pdf' && !cv.name.toLowerCase().endsWith('.pdf')) return 'El CV debe ser un archivo PDF.';
        if (cv.size > CV_MAX_MB * 1024 * 1024) return `El CV no puede pesar más de ${CV_MAX_MB} MB.`;
        return null;
      case 'club':
        return null;
      case 'seguridad': {
        const e = validarPassword(p.password);
        if (e) return e;
        return p.password === p.password2 ? null : 'Las contraseñas no coinciden.';
      }
      case 'confirmar':
        return p.terminos ? null : 'Debes aceptar los términos y el aviso de privacidad.';
    }
  };

  const siguiente = () => {
    const e = validar(paso);
    if (e) { setError(e); return; }
    setError('');
    setPaso(pasos[Math.min(idx + 1, pasos.length - 1)]);
  };
  const anterior = () => { setError(''); setPaso(pasos[Math.max(idx - 1, 0)]); };

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    for (const x of pasos) {
      const err = validar(x);
      if (err) { setError(err); setPaso(x); return; }
    }
    setEnviando(true);
    setError('');
    const fd = new FormData();
    const add = (k: string, v: string) => fd.append(k, v);
    add('rol_solicitado', rol);
    add('nombre', p.nombre.trim()); add('email', p.email.trim()); add('telefono', p.telefono); add('curp', p.curp);
    add('cargo', p.cargo.trim()); add('codigo_postal', p.cp); add('colonia', p.colonia);
    add('password', p.password); add('password_confirmation', p.password2); add('terminos_aceptados', '1');
    if (rol === 'solicitante') {
      add('empresa_nombre', emp.nombre.trim());
      if (emp.rfc) add('empresa_datos[rfc]', emp.rfc.toUpperCase());
      if (emp.tipo) add('empresa_datos[tipo_persona]', emp.tipo);
      if (emp.supervision) add('empresa_datos[rol_supervision]', emp.supervision);
      for (const c of CONTACTOS) {
        for (const campo of ['nombre', 'telefono', 'correo'] as const) {
          const v = contactos[c][campo].trim();
          if (v) add(`contactos[${c}][${campo}]`, v);
        }
      }
    }
    if (rol === 'evaluador' && cv) {
      add('area_conocimiento_id', ev.area); add('institucion', ev.institucion.trim()); add('grado_academico', ev.grado);
      fd.append('cv', cv);
    }
    try {
      // Content-Type sin fijar: el navegador pone multipart con su boundary (E32: con application/json se pierde el archivo).
      await api.post('/auth/registro', fd, { headers: { 'Content-Type': undefined } });
      setEnviado(true);
    } catch (err) {
      setError(erroresServidor(err));
    } finally {
      setEnviando(false);
    }
  };

  const blurb = BLURB[paso];

  return (
    <div className="auth-pantalla flex h-dvh flex-col overflow-hidden bg-[var(--auth-paper)] font-sans text-[var(--auth-ink)]">
      <BandaInstitucional className="flex-none" />
      <div className="flex min-h-0 flex-1">
        {/* Izquierda: panel institucional que acompaña el paso */}
        <div className="hidden h-full min-h-0 p-4 lg:block lg:w-[40%] xl:w-[36%] xl:p-5">
          <section className="auth-banner h-full w-full">
            <div aria-hidden="true" className="absolute inset-0 -z-10">
              <span className="auth-blob auth-blob-1" style={{ transform: 'translate(-10%, -16%) scale(1)' }} />
              <span className="auth-blob auth-blob-2" style={{ transform: 'translate(42%, 8%) scale(0.95)' }} />
              <span className="auth-blob auth-blob-3" style={{ transform: 'translate(4%, 48%) scale(1.05)' }} />
              <span className="auth-grain" />
            </div>
            <div className="relative flex h-full flex-col p-8 text-white xl:p-10">
              <LogoComecyt variante="negativo" className="h-24 xl:h-28" />
              <div className="mt-auto">
                <div key={paso} className="auth-reveal" style={{ '--i': 1 } as React.CSSProperties}>
                  <p className="auth-tag mb-4"><ClipboardList className="h-3.5 w-3.5" aria-hidden="true" /> Paso {idx + 1} de {pasos.length}</p>
                  <div className="auth-glass p-7 xl:p-8">
                    <h2 className="auth-banner-title">{blurb.titulo}</h2>
                    <p className="mt-3 max-w-[38ch] text-[15px] leading-relaxed text-white/80">{blurb.texto}</p>
                  </div>
                </div>
                <div className="mt-5 flex items-center gap-2">
                  {pasos.map((x, i) => (
                    <div key={x} className="flex-1">
                      <div className="h-[3px] overflow-hidden rounded-full" style={{ background: 'color-mix(in oklch, var(--auth-white) 25%, transparent)' }}>
                        <div className="h-full bg-white transition-all duration-500" style={{ width: i < idx ? '100%' : i === idx ? '55%' : '0%' }} />
                      </div>
                      <p className="mt-1.5 truncate text-[10px] font-semibold text-white/70">{ETIQUETA_PASO[x]}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Derecha: formulario */}
        <main className="auth-columna flex min-h-0 w-full flex-col overflow-y-auto lg:w-[60%] xl:w-[64%]">
          <div className="flex justify-end px-6 pt-5"><LanguageSwitcher /></div>
          <div className="flex flex-1 items-center justify-center px-5 py-8 sm:px-10">
            <div className="w-full max-w-[580px]">
              <div className="mb-6 flex justify-center lg:hidden"><DualBranding size="lg" /></div>

              {enviado ? (
                <div className="auth-swap py-4 text-center" role="status">
                  <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl" style={{ background: 'var(--tile-emerald-bg)' }}>
                    <Check className="h-8 w-8" style={{ color: 'var(--tile-emerald-fg)' }} aria-hidden="true" />
                  </div>
                  <h1 className="mb-2 text-xl font-bold">Recibimos tu registro</h1>
                  <p className="mb-6 text-sm leading-relaxed text-[var(--auth-ink-2)]">
                    Un administrador del COMECYT revisará tu cuenta como <strong>{rol ? ROL_REGISTRO[rol].titulo : ''}</strong>.
                    Te avisaremos a <strong>{p.email}</strong> cuando esté aprobada.
                  </p>
                  <Link href="/login" className="auth-submit inline-flex w-auto px-8">Ir a iniciar sesión</Link>
                </div>
              ) : (
                <form onSubmit={enviar} noValidate className="space-y-5">
                  <div className="text-center">
                    <h1 className="text-[clamp(1.5rem,2.6vw,1.875rem)] font-bold tracking-[-0.03em]">Crea tu cuenta</h1>
                    <p className="mt-2 text-sm text-[var(--auth-ink-2)]">Paso {idx + 1} de {pasos.length} · {ETIQUETA_PASO[paso]}</p>
                  </div>

                  {/* Indicador compacto (móvil) */}
                  <ol className="flex items-center justify-center gap-1.5 lg:hidden" aria-label="Progreso del registro">
                    {pasos.map((x, i) => (
                      <li key={x} aria-current={i === idx ? 'step' : undefined}
                        className="h-1.5 rounded-full transition-all duration-300"
                        style={{ width: i === idx ? 28 : 10, background: i <= idx ? 'var(--auth-vino)' : 'var(--auth-rule)' }} />
                    ))}
                  </ol>

                  {error && <div id="registro-error"><AlertBox type="error" message={error} onClose={() => setError('')} /></div>}

                  {paso === 'rol' && (
                    <fieldset className="auth-swap space-y-3">
                      <legend className="sr-only">¿Cómo participarás?</legend>
                      {ROLES_AUTOSERVICIO.map((r) => {
                        const info = ROL_REGISTRO[r];
                        const activo = rol === r;
                        return (
                          <label key={r} className="registro-rol" data-activo={activo || undefined}>
                            <input type="radio" name="rol" value={r} checked={activo} onChange={() => setRol(r)} className="sr-only" />
                            <span className="registro-rol-icono">{ICONO_ROL[r]}</span>
                            <span className="min-w-0 flex-1">
                              <span className="registro-rol-titulo">{info.titulo}</span>
                              <span className="registro-rol-para">{info.para}</span>
                              <span className="registro-rol-detalle">{info.detalle}</span>
                            </span>
                            <span className="registro-rol-check" aria-hidden="true"><Check className="h-4 w-4" /></span>
                          </label>
                        );
                      })}
                    </fieldset>
                  )}

                  {paso === 'persona' && (
                    <div className="auth-swap space-y-3">
                      <FField id="r-nombre" icon={User} label="Nombre completo *">
                        <input value={p.nombre} onChange={(e) => setP({ ...p, nombre: e.target.value })} maxLength={255} autoComplete="name" placeholder=" " className="auth-input" />
                      </FField>
                      <FField id="r-email" icon={Mail} label="Correo electrónico *" ayuda="Será tu usuario para entrar al sistema.">
                        <input type="email" value={p.email} onChange={(e) => setP({ ...p, email: e.target.value })} maxLength={255} autoComplete="email" placeholder=" " className="auth-input" />
                      </FField>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <FField id="r-telefono" icon={Phone} label="Teléfono (10 dígitos) *">
                          <input inputMode="numeric" value={p.telefono} onChange={(e) => setP({ ...p, telefono: e.target.value.replace(/\D/g, '').slice(0, 10) })} autoComplete="tel-national" placeholder=" " className="auth-input" />
                        </FField>
                        <FField id="r-curp" icon={IdCard} label="CURP *">
                          <input value={p.curp} onChange={(e) => setP({ ...p, curp: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 18) })} autoComplete="off" spellCheck={false} placeholder=" " className="auth-input" />
                        </FField>
                      </div>
                      <FField id="r-cargo" icon={Briefcase} label="Cargo u ocupación *">
                        <input value={p.cargo} onChange={(e) => setP({ ...p, cargo: e.target.value })} maxLength={150} autoComplete="organization-title" placeholder=" " className="auth-input" />
                      </FField>
                    </div>
                  )}

                  {paso === 'domicilio' && (
                    <div className="auth-swap space-y-3">
                      <FField id="r-cp" icon={MapPin} label="Código postal *" ayuda="Solo códigos postales del Estado de México.">
                        <input inputMode="numeric" value={p.cp} onChange={(e) => setP({ ...p, cp: e.target.value.replace(/\D/g, '').slice(0, 5) })} autoComplete="postal-code" placeholder=" " className="auth-input" />
                      </FField>
                      <div aria-live="polite" className="min-h-[1.25rem] px-1 text-[13px]">
                        {estadoCp === 'cargando' && <span className="inline-flex items-center gap-2 text-[var(--auth-ink-2)]"><Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> Buscando tu código postal…</span>}
                        {estadoCp === 'fuera' && <span className="inline-flex items-center gap-2 text-[var(--auth-danger)]"><CircleAlert className="h-3.5 w-3.5" aria-hidden="true" /> Ese código postal no pertenece al Estado de México.</span>}
                        {estadoCp === 'error' && <span className="inline-flex items-center gap-2 text-[var(--auth-danger)]"><CircleAlert className="h-3.5 w-3.5" aria-hidden="true" /> No pudimos consultar el código postal.</span>}
                      </div>
                      {estadoCp === 'ok' && cpDatos && (
                        <div className="registro-cp auth-swap">
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div className="registro-cp-dato"><span>Estado</span><strong>{cpDatos.estado}</strong></div>
                            <div className="registro-cp-dato"><span>Municipio</span><strong>{cpDatos.municipio}</strong></div>
                          </div>
                          <StaticField id="r-colonia" icon={House} label="Colonia *">
                            <select value={p.colonia} onChange={(e) => setP({ ...p, colonia: e.target.value })} className="auth-input auth-input-static cursor-pointer pl-4">
                              <option value="">Elige tu colonia…</option>
                              {cpDatos.colonias.map((c) => <option key={c.nombre} value={c.nombre}>{c.nombre}{c.tipo ? ` (${c.tipo})` : ''}</option>)}
                            </select>
                          </StaticField>
                        </div>
                      )}
                    </div>
                  )}

                  {paso === 'empresa' && (
                    <div className="auth-swap space-y-3">
                      <FField id="r-empresa" icon={Building2} label="Nombre de la empresa o institución *">
                        <input value={emp.nombre} onChange={(e) => setEmp({ ...emp, nombre: e.target.value })} maxLength={255} autoComplete="organization" placeholder=" " className="auth-input" />
                      </FField>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <FField id="r-rfc" icon={Hash} label="RFC">
                          <input value={emp.rfc} onChange={(e) => setEmp({ ...emp, rfc: e.target.value.toUpperCase().slice(0, 13) })} placeholder=" " className="auth-input" />
                        </FField>
                        <StaticField id="r-tipo" icon={Users} label="Tipo de persona">
                          <select value={emp.tipo} onChange={(e) => setEmp({ ...emp, tipo: e.target.value as TipoPersona })} className="auth-input auth-input-static cursor-pointer pl-4">
                            <option value="">Selecciona…</option>
                            <option value="fisica">Persona física</option>
                            <option value="moral">Persona moral</option>
                            <option value="asociacion_civil">Asociación civil</option>
                            <option value="otro">Otra</option>
                          </select>
                        </StaticField>
                      </div>
                      <FField id="r-supervision" icon={Shield} label="Rol de supervisión">
                        <input value={emp.supervision} onChange={(e) => setEmp({ ...emp, supervision: e.target.value })} maxLength={255} placeholder=" " className="auth-input" />
                      </FField>
                      <p className="pt-1 text-xs leading-relaxed text-[var(--auth-ink-2)]">
                        Contactos de tu empresa. El <strong className="text-[var(--auth-vino)]">Responsable del proyecto</strong> es obligatorio; los demás, si aplican.
                      </p>
                      {CONTACTOS.map((c) => (
                        <div key={c} className="space-y-2 rounded-[var(--auth-radius-field)] border p-3.5" style={{ borderColor: 'var(--auth-rule)', background: 'var(--auth-field)' }}>
                          <p className="text-sm font-bold">{CONTACTO_ETIQUETA[c]} {c === 'responsable' && <span style={{ color: 'var(--auth-danger)' }}>*</span>}</p>
                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                            {(['nombre', 'telefono', 'correo'] as const).map((campo) => (
                              <input key={campo} type={campo === 'correo' ? 'email' : 'text'} value={contactos[c][campo]}
                                onChange={(e) => setContactos({ ...contactos, [c]: { ...contactos[c], [campo]: e.target.value } })}
                                placeholder={campo === 'nombre' ? 'Nombre' : campo === 'telefono' ? 'Teléfono' : 'Correo'}
                                aria-label={`${CONTACTO_ETIQUETA[c]} — ${campo}`} maxLength={campo === 'telefono' ? 20 : 255}
                                className="auth-input h-11 bg-[var(--auth-white)] pl-4" />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {paso === 'evaluador' && (
                    <div className="auth-swap space-y-3">
                      <StaticField id="r-area" icon={FlaskConical} label="Área de conocimiento *">
                        <select value={ev.area} onChange={(e) => setEv({ ...ev, area: e.target.value })} className="auth-input auth-input-static cursor-pointer pl-4">
                          <option value="">{opciones.areas.length ? 'Elige tu área…' : 'Cargando áreas…'}</option>
                          {opciones.areas.map((a) => <option key={a.id} value={String(a.id)}>{a.nombre}</option>)}
                        </select>
                      </StaticField>
                      <FField id="r-institucion" icon={Building2} label="Institución donde laboras *">
                        <input value={ev.institucion} onChange={(e) => setEv({ ...ev, institucion: e.target.value })} maxLength={255} placeholder=" " className="auth-input" />
                      </FField>
                      <StaticField id="r-grado" icon={GraduationCap} label="Grado académico *">
                        <select value={ev.grado} onChange={(e) => setEv({ ...ev, grado: e.target.value })} className="auth-input auth-input-static cursor-pointer pl-4">
                          <option value="">Selecciona…</option>
                          {(opciones.grados.length ? opciones.grados : Object.keys(GRADO_ETIQUETA)).map((g) => <option key={g} value={g}>{GRADO_ETIQUETA[g] ?? g}</option>)}
                        </select>
                      </StaticField>
                      <StaticField id="r-cv" icon={FileText} label={`CV en PDF (máx. ${CV_MAX_MB} MB) *`}>
                        <input type="file" accept="application/pdf,.pdf" onChange={(e) => setCv(e.target.files?.[0] ?? null)} className="registro-archivo" />
                      </StaticField>
                      {cv && <p className="px-1 text-xs text-[var(--auth-ink-2)]">Seleccionado: <strong>{cv.name}</strong> ({(cv.size / 1024 / 1024).toFixed(1)} MB)</p>}
                    </div>
                  )}

                  {paso === 'club' && (
                    <div className="registro-aviso auth-swap">
                      <School className="h-5 w-5 flex-none text-[var(--auth-vino)]" aria-hidden="true" />
                      <div className="space-y-2 text-sm leading-relaxed">
                        <p><strong>Tu club se registra después.</strong> Cuando un administrador apruebe tu cuenta, entra a tu panel «Mi club» para:</p>
                        <ul className="list-disc space-y-1 pl-5 text-[var(--auth-ink-2)]">
                          <li>elegir tu escuela (estatal o federal) del catálogo,</li>
                          <li>registrar el nombre y el logo de tu club,</li>
                          <li>capturar a los integrantes con su foto y la carta de consentimiento de la escuela.</li>
                        </ul>
                      </div>
                    </div>
                  )}

                  {paso === 'seguridad' && (
                    <div className="auth-swap space-y-3">
                      <FField id="r-pass" icon={Lock} label="Contraseña *" ayuda="Mínimo 10 caracteres, con mayúsculas, minúsculas y un número.">
                        <input type={verPass ? 'text' : 'password'} value={p.password} onChange={(e) => setP({ ...p, password: e.target.value })} autoComplete="new-password" placeholder=" " className="auth-input pr-12" />
                      </FField>
                      <FField id="r-pass2" icon={Lock} label="Confirma tu contraseña *">
                        <input type={verPass ? 'text' : 'password'} value={p.password2} onChange={(e) => setP({ ...p, password2: e.target.value })} autoComplete="new-password" placeholder=" " className="auth-input" />
                      </FField>
                      <button type="button" onClick={() => setVerPass(!verPass)} aria-pressed={verPass} className="auth-link inline-flex items-center gap-1.5 text-[13px]">
                        {verPass ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />} {verPass ? 'Ocultar contraseñas' : 'Mostrar contraseñas'}
                      </button>
                    </div>
                  )}

                  {paso === 'confirmar' && (
                    <div className="auth-swap space-y-4">
                      <div className="space-y-2 rounded-[var(--auth-radius-field)] border p-4" style={{ borderColor: 'var(--auth-rule)', background: 'var(--auth-field)' }}>
                        <p className="mb-1 text-xs font-bold text-[var(--auth-ink-2)]">Resumen de tu registro</p>
                        <SummaryRow label="Rol" value={rol ? ROL_REGISTRO[rol].titulo : ''} />
                        <SummaryRow label="Nombre" value={p.nombre} />
                        <SummaryRow label="Correo" value={p.email} />
                        <SummaryRow label="Teléfono" value={p.telefono} />
                        <SummaryRow label="CURP" value={p.curp} />
                        <SummaryRow label="Domicilio" value={`${p.colonia}, ${cpDatos?.municipio ?? ''}, C.P. ${p.cp}`} />
                        <SummaryRow label="Cargo" value={p.cargo} />
                        {rol === 'solicitante' && <SummaryRow label="Empresa" value={emp.nombre} />}
                        {rol === 'solicitante' && <SummaryRow label="Responsable" value={contactos.responsable.nombre} />}
                        {rol === 'evaluador' && <SummaryRow label="Área" value={opciones.areas.find((a) => String(a.id) === ev.area)?.nombre ?? ''} />}
                        {rol === 'evaluador' && <SummaryRow label="Grado" value={GRADO_ETIQUETA[ev.grado] ?? ev.grado} />}
                        {rol === 'evaluador' && <SummaryRow label="CV" value={cv?.name ?? ''} />}
                      </div>
                      <label className="flex cursor-pointer items-start gap-3 rounded-[var(--auth-radius-field)] border p-4 transition-colors"
                        style={{ borderColor: 'var(--auth-rule)', background: p.terminos ? 'var(--auth-vino-soft)' : 'var(--auth-field)' }}>
                        <input type="checkbox" checked={p.terminos} onChange={(e) => setP({ ...p, terminos: e.target.checked })} className="mt-0.5 h-4 w-4 cursor-pointer rounded accent-[var(--auth-vino)]" />
                        <span className="text-xs leading-relaxed">
                          He leído y acepto los <a href={TERMS_URL} target="_blank" rel="noopener noreferrer" className="auth-link">términos de uso</a> y
                          el <a href="/privacidad" target="_blank" rel="noopener noreferrer" className="auth-link">aviso de privacidad</a> del COMECYT, y autorizo el uso de mis datos para revisar mi cuenta.
                        </span>
                      </label>
                    </div>
                  )}

                  <div className="flex gap-3 pt-1">
                    {idx > 0 && (
                      <button type="button" onClick={anterior} className="h-12 flex-1 rounded-[var(--auth-radius-field)] border text-sm font-bold transition-colors hover:bg-[var(--auth-field)]" style={{ borderColor: 'var(--auth-rule)' }}>
                        <span className="flex items-center justify-center gap-1.5"><ArrowLeft className="h-4 w-4" aria-hidden="true" /> Anterior</span>
                      </button>
                    )}
                    {paso !== 'confirmar' ? (
                      <button type="button" onClick={siguiente} className="auth-submit flex-1">Siguiente</button>
                    ) : (
                      <button type="submit" disabled={enviando || !p.terminos} data-state={enviando ? 'loading' : 'idle'} className="auth-submit flex-1">
                        <span key={enviando ? 'l' : 'i'} className="auth-swap flex items-center gap-2.5">
                          {enviando ? <><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Enviando…</> : 'Enviar registro'}
                        </span>
                      </button>
                    )}
                  </div>
                </form>
              )}

              <div className="mt-8 border-t pt-6 text-center" style={{ borderColor: 'var(--auth-rule)' }}>
                <Link href="/login" className="auth-link inline-flex items-center gap-1.5 text-sm"><ArrowLeft className="h-4 w-4" aria-hidden="true" /> Ya tengo cuenta · Iniciar sesión</Link>
              </div>
            </div>
          </div>
          <PieAuth />
        </main>
      </div>
    </div>
  );
}
