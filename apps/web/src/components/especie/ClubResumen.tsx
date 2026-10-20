'use client';

import { useState } from 'react';
import { Shapes, School, User, FileText, Download, Crown, CheckCircle2, CircleDashed, Package, Eye, Loader2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import FotoClub from '@/components/especie/FotoClub';
import {
  CAMPOS_INTEGRANTE, ESTADO_CLUB, ESTADO_DOCUMENTO, NIVEL_ESCUELA, SEXO, SISTEMA_ESCUELA, valorCampo,
  type CampoApi, type ClubApi, type DocumentoClub, type IntegranteApi, type Predef,
} from '@/lib/especie';
import { formatDate } from '@/lib/format';
import Folio from '@/components/ui/folio';
import { useVistaPrevia } from '@/components/ui/VistaPreviaProvider';
import { archivoDocumentoClub } from '@/lib/especie-api';
import EtiquetaEscuela from '@/components/especie/EtiquetaEscuela';

/**
 * E52 · F1 — Vista de solo lectura de un club: datos, escuela, líder, integrantes con foto, respuestas adicionales y
 * documentos. La usan el personal (/admin/clubes/[id]) y el líder cuando su club ya se envió.
 */
export default function ClubResumen({ club, integrantes, documentos, campos, camposIntegrante, kit, onDescargar, descargando, onRevisar }: {
  club: ClubApi;
  integrantes: IntegranteApi[];
  documentos: DocumentoClub[];
  campos: CampoApi[];
  camposIntegrante: Record<string, Predef>;
  kit?: string | null;
  onDescargar?: (clave: string, nombre: string) => void;
  descargando?: string | null;
  /** E79: revisión por documento (solo personal con permiso). Devuelve si se guardó. */
  onRevisar?: (clave: string, decision: 'aprobar' | 'rechazar', motivo?: string) => Promise<boolean>;
}) {
  const { ver } = useVistaPrevia();
  const est = ESTADO_CLUB[club.estado] ?? { etiqueta: club.estado, tono: 'neutral' };
  const camposClub = campos.filter((c) => c.ambito === 'club');
  const camposInt = campos.filter((c) => c.ambito === 'integrante');
  const visibles = (Object.keys(CAMPOS_INTEGRANTE) as (keyof typeof CAMPOS_INTEGRANTE)[])
    .filter((k) => k !== 'foto' && camposIntegrante[k]?.pedir);
  const descripcion = typeof club.datos?.descripcion === 'string' ? club.datos.descripcion : '';

  const valorPredef = (i: IntegranteApi, k: string): string => {
    const v = (i as unknown as Record<string, unknown>)[k];
    if (v === null || v === undefined || v === '') return '—';
    if (k === 'sexo') return SEXO[String(v)] ?? String(v);
    if (k === 'fecha_nacimiento') return formatDate(String(v));
    return String(v);
  };

  return (
    <div className="space-y-6">
      <section className="app-card flex flex-wrap items-center gap-4 p-5">
        <FotoClub src={club.logo_url} alt={`Logo de ${club.nombre}`} className="h-20 w-20 rounded-[20px]"
          fallback={<Shapes className="h-8 w-8 text-[var(--app-ink-2)]" aria-hidden="true" />} />
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="break-words text-xl font-bold text-[var(--app-ink)]">{club.nombre}</h2>
            <span className="pill" data-tone={est.tono} data-dot="on">{est.etiqueta}</span>
          </div>
          <p className="text-sm text-[var(--app-ink-2)]">
            Folio <Folio folio={club.folio} corto={club.convocatoria_corto} className="font-mono font-semibold text-[var(--app-ink)]" />
            {club.enviado_at ? ` · enviado el ${formatDate(club.enviado_at)}` : ''}
          </p>
          {kit && <p className="flex items-center gap-1.5 text-sm text-[var(--app-ink-2)]"><Package className="h-4 w-4" aria-hidden="true" />Kit: {kit}</p>}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <section className="app-card space-y-2 p-5" aria-labelledby="cr-escuela">
          <h3 id="cr-escuela" className="flex items-center gap-2 text-sm font-bold text-[var(--app-ink)]"><School className="h-4 w-4" aria-hidden="true" />Escuela</h3>
          {club.escuela ? (
            <>
              <p className="flex flex-wrap items-center gap-2 break-words font-semibold text-[var(--app-ink)]">{club.escuela.nombre}
                <EtiquetaEscuela participo={(club.escuela as { participo_antes?: boolean }).participo_antes} /></p>
              <p className="text-sm text-[var(--app-ink-2)]">
                <span className="font-mono">{club.escuela.cct}</span> · {club.escuela.municipio} · {NIVEL_ESCUELA[club.escuela.nivel] ?? club.escuela.nivel} · {SISTEMA_ESCUELA[club.escuela.sistema] ?? club.escuela.sistema}
              </p>
            </>
          ) : <p className="text-sm text-[var(--app-ink-2)]">Sin escuela.</p>}
        </section>
        {club.lider && (
          <section className="app-card space-y-2 p-5" aria-labelledby="cr-lider">
            <h3 id="cr-lider" className="flex items-center gap-2 text-sm font-bold text-[var(--app-ink)]"><User className="h-4 w-4" aria-hidden="true" />Líder del club</h3>
            <p className="break-words font-semibold text-[var(--app-ink)]">{club.lider.name}</p>
            <p className="break-words text-sm text-[var(--app-ink-2)]">
              {club.lider.email}{club.lider.telefono ? ` · ${club.lider.telefono}` : ''}{club.lider.cargo ? ` · ${club.lider.cargo}` : ''}
            </p>
          </section>
        )}
      </div>

      {(descripcion || camposClub.length > 0) && (
        <section className="app-card space-y-3 p-5" aria-labelledby="cr-datos">
          <h3 id="cr-datos" className="text-sm font-bold text-[var(--app-ink)]">Datos del club</h3>
          {descripcion && <p className="whitespace-pre-wrap break-words text-sm text-[var(--app-ink)]">{descripcion}</p>}
          {camposClub.length > 0 && (
            <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
              {camposClub.map((c) => (
                <div key={c.nombre_campo} className="min-w-0">
                  <dt className="text-xs text-[var(--app-ink-2)]">{c.etiqueta}</dt>
                  <dd className="break-words font-medium text-[var(--app-ink)]">{valorCampo(c, club.datos?.[c.nombre_campo])}</dd>
                </div>
              ))}
            </dl>
          )}
        </section>
      )}

      <section className="space-y-3" aria-labelledby="cr-integrantes">
        <h3 id="cr-integrantes" className="text-sm font-bold text-[var(--app-ink)]">Integrantes ({integrantes.length})</h3>
        <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {integrantes.map((i) => (
            <li key={i.id} className="app-card flex gap-3 p-4">
              <FotoClub src={i.foto_url} alt={`Foto de ${i.nombre}`} className="h-16 w-16 rounded-full"
                fallback={<User className="h-6 w-6 text-[var(--app-ink-2)]" aria-hidden="true" />} />
              <div className="min-w-0 flex-1 space-y-1">
                <p className="flex flex-wrap items-center gap-2 font-semibold text-[var(--app-ink)]">
                  <span className="break-words">{i.nombre}</span>
                  {i.es_lider && <span className="pill" data-tone="gold"><Crown className="h-3 w-3" aria-hidden="true" />Líder</span>}
                  {i.es_lider_b && <span className="pill" data-tone="mint"><Crown className="h-3 w-3" aria-hidden="true" />Líder B</span>}
                  {i.menor_de_edad && <span className="pill" data-tone="sky">Menor de edad</span>}
                </p>
                <dl className="grid grid-cols-1 gap-x-4 gap-y-0.5 text-xs sm:grid-cols-2">
                  {visibles.map((k) => (
                    <div key={k} className="min-w-0"><dt className="inline text-[var(--app-ink-2)]">{CAMPOS_INTEGRANTE[k]}: </dt><dd className="inline break-words text-[var(--app-ink)]">{valorPredef(i, k)}</dd></div>
                  ))}
                  {camposInt.map((c) => (
                    <div key={c.nombre_campo} className="min-w-0"><dt className="inline text-[var(--app-ink-2)]">{c.etiqueta}: </dt><dd className="inline break-words text-[var(--app-ink)]">{valorCampo(c, i.datos?.[c.nombre_campo])}</dd></div>
                  ))}
                </dl>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3" aria-labelledby="cr-docs">
        <h3 id="cr-docs" className="text-sm font-bold text-[var(--app-ink)]">Documentos</h3>
        <ul className="divide-y rounded-[16px] border bg-[var(--app-card-bg)]" style={{ borderColor: 'var(--app-rule)' }}>
          {documentos.map((d) => (
            <li key={d.clave} className="flex flex-wrap items-center gap-3 px-4 py-3">
              {d.subido
                ? <CheckCircle2 className="h-5 w-5 shrink-0" style={{ color: 'var(--tile-emerald-fg)' }} aria-label="Subido" />
                : <CircleDashed className="h-5 w-5 shrink-0 text-[var(--app-ink-2)]" aria-label="Sin subir" />}
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2 break-words text-sm font-semibold text-[var(--app-ink)]">
                  {d.nombre}{d.obligatorio ? '' : ' (opcional)'}
                  {d.subido && (() => { const e = ESTADO_DOCUMENTO[d.subido.estado ?? 'pendiente'] ?? ESTADO_DOCUMENTO.pendiente; return <span className="pill" data-tone={e.tono} data-dot="on">{e.etiqueta}</span>; })()}
                </span>
                <span className="block break-words text-xs text-[var(--app-ink-2)]">
                  {d.subido ? `${d.subido.nombre_original}${d.subido.subido_at ? ` · ${formatDate(d.subido.subido_at)}` : ''}` : 'Sin subir'}
                </span>
                {d.subido?.estado === 'rechazado' && d.subido.motivo && <span className="block text-xs font-medium" style={{ color: 'var(--auth-danger)' }}>Motivo: {d.subido.motivo}</span>}
              </span>
              {d.subido && onRevisar && <RevisarDocumento nombre={d.nombre} estado={d.subido.estado ?? 'pendiente'} onRevisar={(dec, m) => onRevisar(d.clave, dec, m)} />}
              {d.subido && (
                // 02/10/2026: «Ver» muestra el archivo dentro de la página (antes solo se podía descargar).
                <Button size="sm" variant="outline" onClick={() => void ver({ nombre: d.subido?.nombre_original ?? d.clave, cargar: () => archivoDocumentoClub(club.id, d.clave) })}
                  aria-label={`Ver ${d.nombre}`}>
                  <Eye className="h-4 w-4" aria-hidden="true" /><span className="max-sm:sr-only">Ver</span>
                </Button>
              )}
              {d.subido && onDescargar && (
                <Button size="sm" variant="soft" onClick={() => onDescargar(d.clave, d.subido?.nombre_original ?? d.clave)} disabled={descargando === d.clave}
                  aria-label={`Descargar ${d.nombre}`}>
                  <Download className="h-4 w-4" aria-hidden="true" /><span className="max-sm:sr-only">Descargar</span>
                </Button>
              )}
            </li>
          ))}
          {documentos.length === 0 && <li className="flex items-center gap-2 px-4 py-3 text-sm text-[var(--app-ink-2)]"><FileText className="h-4 w-4" aria-hidden="true" />Sin documentos.</li>}
        </ul>
      </section>
    </div>
  );
}

/**
 * E79 — Aprobar o rechazar un documento subido. Rechazar pide el motivo (lo ve el líder). No es una acción que se
 * repita cientos de veces: sin animaciones, botones con su estado de carga.
 */
function RevisarDocumento({ nombre, estado, onRevisar }: {
  nombre: string; estado: string;
  onRevisar: (decision: 'aprobar' | 'rechazar', motivo?: string) => Promise<boolean>;
}) {
  const [rechazando, setRechazando] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [enviando, setEnviando] = useState<'aprobar' | 'rechazar' | null>(null);
  const enviar = async (decision: 'aprobar' | 'rechazar') => {
    setEnviando(decision);
    const ok = await onRevisar(decision, decision === 'rechazar' ? motivo.trim() : undefined);
    setEnviando(null);
    if (ok) { setRechazando(false); setMotivo(''); }
  };
  if (rechazando) {
    return (
      <div className="flex w-full flex-wrap items-center gap-2">
        <label className="sr-only" htmlFor={`motivo-${nombre}`}>Motivo del rechazo de {nombre}</label>
        <input id={`motivo-${nombre}`} className="auth-input auth-input-static min-w-[220px] flex-1 pl-3 text-sm" maxLength={1000} autoFocus
          value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="¿Qué debe corregir? (lo verá el líder)" />
        <Button size="sm" variant="destructive" disabled={motivo.trim().length < 5 || enviando !== null} onClick={() => void enviar('rechazar')}>
          {enviando === 'rechazar' ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <XCircle className="h-4 w-4" aria-hidden="true" />}Rechazar
        </Button>
        <Button size="sm" variant="outline" disabled={enviando !== null} onClick={() => { setRechazando(false); setMotivo(''); }}>Cancelar</Button>
      </div>
    );
  }
  return (
    <span className="inline-flex flex-wrap gap-1.5">
      {estado !== 'aprobado' && (
        <Button size="sm" variant="soft" disabled={enviando !== null} onClick={() => void enviar('aprobar')} aria-label={`Marcar ${nombre} como correcto`}>
          {enviando === 'aprobar' ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <CheckCircle2 className="h-4 w-4" aria-hidden="true" />}<span className="max-sm:sr-only">Correcto</span>
        </Button>
      )}
      {estado !== 'rechazado' && (
        <Button size="sm" variant="outline" disabled={enviando !== null} onClick={() => setRechazando(true)} aria-label={`Rechazar ${nombre}`}>
          <XCircle className="h-4 w-4" aria-hidden="true" /><span className="max-sm:sr-only">Rechazar</span>
        </Button>
      )}
    </span>
  );
}
