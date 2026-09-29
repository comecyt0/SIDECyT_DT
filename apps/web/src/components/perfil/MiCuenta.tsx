'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AtSign, Briefcase, Building2, CalendarDays, CalendarRange, Clock, Layers, Loader2, Phone, ShieldCheck, User as UserIcon, UserCog } from 'lucide-react';
import api from '@/lib/api';
import { AlertBox } from '@/components/ui/alert-box';
import PerfilHero from '@/components/perfil/PerfilHero';
import { avisarPerfilActualizado, useMiPerfil } from '@/hooks/useMiPerfil';
import { formatDate } from '@/lib/format';
import { ROL_ETIQUETA, type RolSlug } from '@/lib/roles';
import MisRoles from '@/components/perfil/MisRoles';

const MAX_MB = 5;
const TIPOS = ['image/jpeg', 'image/png', 'image/webp'];

/** Mensaje legible de un error de la API (validación de Laravel o error propio). */
function mensajeError(e: unknown, porDefecto: string): string {
  const d = (e as { response?: { data?: { message?: string; error?: string; errors?: Record<string, string[]> } } })?.response?.data;
  const primero = d?.errors ? Object.values(d.errors).flat()[0] : undefined;
  return primero || d?.message || d?.error || porDefecto;
}

/**
 * "Mi cuenta" (E45, punto 3) — la misma pantalla para los 6 roles. Foto y portada (se convierten a WebP en el
 * servidor), datos editables (nombre, teléfono, cargo) y datos de la cuenta. La seguridad (contraseña, 2FA) sigue en
 * su propia pantalla (`seguridadHref`).
 */
export default function MiCuenta({ seguridadHref }: { seguridadHref?: string }) {
  const { perfil, resumen } = useMiPerfil();
  const [form, setForm] = useState({ name: '', telefono: '', cargo: '' });
  const [guardando, setGuardando] = useState(false);
  const [subiendo, setSubiendo] = useState<'avatar' | 'banner' | null>(null);
  const [aviso, setAviso] = useState<{ tipo: 'success' | 'error'; texto: string } | null>(null);

  useEffect(() => {
    if (perfil) setForm({ name: perfil.name ?? '', telefono: perfil.telefono ?? '', cargo: perfil.cargo ?? '' });
  }, [perfil]);

  if (!perfil) {
    return (
      <div className="grid place-items-center py-24 text-[var(--app-ink-2)]">
        <Loader2 className="h-6 w-6 animate-spin" aria-label="Cargando perfil" />
      </div>
    );
  }

  const slug = (perfil.rol?.slug ?? '') as RolSlug;
  const rolTexto = ROL_ETIQUETA[slug] ?? perfil.rol?.nombre ?? '';

  const subir = async (tipo: 'avatar' | 'banner', archivo: File) => {
    setAviso(null);
    if (!TIPOS.includes(archivo.type)) {
      setAviso({ tipo: 'error', texto: 'La imagen debe ser JPG, PNG o WebP.' });
      return;
    }
    if (archivo.size > MAX_MB * 1024 * 1024) {
      setAviso({ tipo: 'error', texto: `La imagen pesa más de ${MAX_MB} MB.` });
      return;
    }
    setSubiendo(tipo);
    try {
      const fd = new FormData();
      fd.append('imagen', archivo);
      // Content-Type undefined: axios arma multipart con boundary (ver E32 en CLAUDE.md).
      await api.post(`/mi-perfil/${tipo}`, fd, { headers: { 'Content-Type': undefined } });
      avisarPerfilActualizado();
      setAviso({ tipo: 'success', texto: tipo === 'avatar' ? 'Foto de perfil actualizada.' : 'Portada actualizada.' });
    } catch (e) {
      setAviso({ tipo: 'error', texto: mensajeError(e, 'No se pudo subir la imagen.') });
    } finally {
      setSubiendo(null);
    }
  };

  const quitar = async (tipo: 'avatar' | 'banner') => {
    setSubiendo(tipo);
    try {
      await api.delete(`/mi-perfil/${tipo}`);
      avisarPerfilActualizado();
    } catch (e) {
      setAviso({ tipo: 'error', texto: mensajeError(e, 'No se pudo quitar la imagen.') });
    } finally {
      setSubiendo(null);
    }
  };

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setAviso(null);
    if (form.name.trim().length < 3) {
      setAviso({ tipo: 'error', texto: 'Escribe tu nombre completo.' });
      return;
    }
    if (form.telefono && !/^[0-9+()\s-]{7,20}$/.test(form.telefono)) {
      setAviso({ tipo: 'error', texto: 'El teléfono solo puede tener números, espacios y + ( ) -.' });
      return;
    }
    setGuardando(true);
    try {
      await api.put('/mi-perfil', { name: form.name.trim(), telefono: form.telefono.trim() || null, cargo: form.cargo.trim() || null });
      avisarPerfilActualizado();
      setAviso({ tipo: 'success', texto: 'Cambios guardados.' });
    } catch (err) {
      setAviso({ tipo: 'error', texto: mensajeError(err, 'No se pudieron guardar los cambios.') });
    } finally {
      setGuardando(false);
    }
  };

  const pildoras = [
    { texto: rolTexto, tono: 'vino' as const },
    ...(perfil.empresa?.nombre ? [{ texto: perfil.empresa.nombre }] : []),
  ].filter((p) => p.texto);

  const datos: { icono: React.ReactNode; etiqueta: string; valor: React.ReactNode }[] = [
    { icono: <ShieldCheck />, etiqueta: 'Rol', valor: rolTexto || '—' },
    { icono: <AtSign />, etiqueta: 'Correo', valor: perfil.email },
    ...(perfil.empresa ? [{ icono: <Building2 />, etiqueta: 'Institución / empresa', valor: perfil.empresa.nombre }] : []),
    ...(perfil.convocatorias_asignadas && perfil.convocatorias_asignadas.length > 0
      ? [{ icono: <Layers />, etiqueta: 'Convocatorias a tu cargo', valor: perfil.convocatorias_asignadas.map((c) => c.nombre).join(', ') }]
      : []),
    ...(perfil.periodos && perfil.periodos.length > 0
      ? [{ icono: <CalendarRange />, etiqueta: 'Periodos visibles', valor: perfil.periodos.map((p) => p.nombre).join(', ') }]
      : []),
    { icono: <CalendarDays />, etiqueta: 'Cuenta creada', valor: perfil.created_at ? formatDate(perfil.created_at) : '—' },
    { icono: <Clock />, etiqueta: 'Último acceso', valor: perfil.ultimo_acceso ? formatDate(perfil.ultimo_acceso) : '—' },
  ];

  return (
    <div className="space-y-6">
      <PerfilHero
        user={perfil}
        pildoras={pildoras}
        estado={{ texto: 'Cuenta activa', activo: true }}
        indicadores={resumen}
        editable
        subiendo={subiendo}
        onSubir={subir}
        onQuitar={quitar}
      />

      {aviso && <AlertBox type={aviso.tipo} message={aviso.texto} onClose={() => setAviso(null)} />}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="perfil-tarjeta" aria-labelledby="perfil-editar">
          <h2 id="perfil-editar" className="perfil-tarjeta-titulo"><UserCog aria-hidden="true" />Editar tu perfil</h2>
          <form onSubmit={guardar} className="space-y-4" noValidate>
            <label className="perfil-campo">
              <span><UserIcon aria-hidden="true" />Nombre completo</span>
              <input className="auth-input auth-input-static pl-4" value={form.name} maxLength={255} autoComplete="name"
                onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </label>
            <label className="perfil-campo">
              <span><Phone aria-hidden="true" />Teléfono</span>
              <input className="auth-input auth-input-static pl-4" value={form.telefono} maxLength={20} inputMode="tel" autoComplete="tel"
                onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
            </label>
            <label className="perfil-campo">
              <span><Briefcase aria-hidden="true" />Cargo</span>
              <input className="auth-input auth-input-static pl-4" value={form.cargo} maxLength={255} autoComplete="organization-title"
                onChange={(e) => setForm({ ...form, cargo: e.target.value })} />
            </label>
            <button type="submit" className="perfil-guardar" disabled={guardando}>
              {guardando ? <><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Guardando…</> : 'Guardar cambios'}
            </button>
            {seguridadHref && (
              <p className="text-xs text-[var(--app-ink-2)]">
                Contraseña y verificación en dos pasos: <Link href={seguridadHref} className="font-semibold text-[var(--sg-vino)] hover:underline">Seguridad de la cuenta</Link>.
              </p>
            )}
          </form>
        </section>

        <section className="perfil-tarjeta" aria-labelledby="perfil-datos">
          <h2 id="perfil-datos" className="perfil-tarjeta-titulo"><Layers aria-hidden="true" />Datos de tu cuenta</h2>
          <ul className="space-y-2.5">
            {datos.map((d) => (
              <li key={d.etiqueta} className="perfil-dato">
                <span className="perfil-dato-icono" aria-hidden="true">{d.icono}</span>
                <span className="min-w-0">
                  <span className="perfil-dato-etiqueta">{d.etiqueta}</span>
                  <span className="perfil-dato-valor">{d.valor}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* E52: varios roles por persona — cambiar de rol activo y pedir otro (con aprobación de admin). */}
      <MisRoles />
    </div>
  );
}
