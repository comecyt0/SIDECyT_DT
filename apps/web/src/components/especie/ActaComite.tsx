'use client';

import { useEffect, useRef, useState } from 'react';
import { Gavel, Upload, Eye, Loader2, CheckCircle2 } from 'lucide-react';
import { useVistaPrevia } from '@/components/ui/VistaPreviaProvider';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { mensajeError } from '@/lib/errores-formulario';
import { fechaHora } from '@/lib/especie';

/**
 * E52 · F2 — Acta del comité de una convocatoria (una por convocatoria, decisión del usuario). La suben el admin y el
 * admin de convocatoria (PDF ≤ 10 MB, validado por contenido en el servidor); la ven también revisor y consulta. Con el
 * acta cargada se habilita la decisión del comité (sí / no) en la ficha de cada club con visto bueno.
 */
export default function ActaComite({ convocatoriaId, puedeSubir }: { convocatoriaId: number; puedeSubir: boolean }) {
  const [acta, setActa] = useState<{ nombre: string; subida_at: string } | null>(null);
  const [cargando, setCargando] = useState(true);
  const [subiendo, setSubiendo] = useState(false);
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCargando(true);
    api.get(`/admin/convocatorias/${convocatoriaId}/especie`)
      .then(({ data }) => setActa(data?.acta_comite && typeof data.acta_comite.nombre === 'string' ? data.acta_comite : null))
      .catch(() => setActa(null))
      .finally(() => setCargando(false));
  }, [convocatoriaId]);

  const subir = async (f: File | undefined) => {
    if (!f) return;
    if (f.type && f.type !== 'application/pdf') { setAviso({ ok: false, texto: 'El acta debe ser un PDF.' }); return; }
    if (f.size > 10 * 1024 * 1024) { setAviso({ ok: false, texto: 'El acta no puede pesar más de 10 MB.' }); return; }
    setSubiendo(true);
    setAviso(null);
    try {
      const fd = new FormData();
      fd.append('archivo', f);
      // E32: sin Content-Type propio, el navegador arma el multipart con su boundary.
      const { data } = await api.post(`/revision/convocatorias/${convocatoriaId}/acta`, fd, { headers: { 'Content-Type': undefined } });
      setActa(data?.acta_comite ?? null);
      setAviso({ ok: true, texto: 'Acta cargada. Ya puedes registrar la decisión del comité en cada club con visto bueno.' });
    } catch (e) {
      setAviso({ ok: false, texto: mensajeError(e, 'No se pudo subir el acta.') });
    } finally {
      setSubiendo(false);
      if (ref.current) ref.current.value = '';
    }
  };

  // 02/10/2026: el acta se ve dentro de la página (antes abría otra pestaña) y se revisa antes de subirla.
  const { ver: verDoc, confirmarSubida } = useVistaPrevia();
  const ver = () => void verDoc({ nombre: acta?.nombre ?? 'Acta del comité.pdf', cargar: async () => {
    const r = await api.get(`/revision/convocatorias/${convocatoriaId}/acta`, { responseType: 'blob' });
    return { data: r.data as BlobPart, tipo: 'application/pdf' };
  } });
  const elegir = async (f: File | undefined) => {
    if (ref.current) ref.current.value = '';
    if (!f) return;
    const r = await confirmarSubida(f);
    if (r === 'subir') void subir(f); else if (r === 'otro') ref.current?.click();
  };

  return (
    <section className="app-card flex flex-wrap items-center gap-4 p-5" aria-labelledby="acta-comite">
      <span className="tone-chip shrink-0" data-tone="violet" aria-hidden="true"><Gavel /></span>
      <div className="min-w-0 flex-1">
        <h2 id="acta-comite" className="text-sm font-bold text-[var(--app-ink)]">Acta del comité</h2>
        {cargando ? <p className="text-sm text-[var(--app-ink-2)]">Cargando…</p>
          : acta ? <p className="flex flex-wrap items-center gap-1.5 text-sm text-[var(--app-ink)]"><CheckCircle2 className="h-4 w-4" style={{ color: 'var(--tile-emerald-fg)' }} aria-hidden="true" /><span className="break-all">{acta.nombre}</span><span className="text-xs text-[var(--app-ink-2)]">· {fechaHora(acta.subida_at)}</span></p>
          : <p className="text-sm text-[var(--app-ink-2)]">Aún no se sube. Es necesaria para registrar la decisión del comité (sí / no por club).</p>}
        {aviso && <p className="mt-1 text-sm" role="status" style={{ color: aviso.ok ? 'var(--tile-emerald-fg)' : 'var(--auth-danger)' }}>{aviso.texto}</p>}
      </div>
      <div className="flex flex-wrap gap-2">
        {acta && <Button variant="outline" size="sm" onClick={ver}><Eye className="h-4 w-4" aria-hidden="true" />Ver acta</Button>}
        {puedeSubir && (
          <>
            <Button size="sm" onClick={() => ref.current?.click()} disabled={subiendo}>
              {subiendo ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Upload className="h-4 w-4" aria-hidden="true" />}{acta ? 'Reemplazar acta' : 'Subir acta (PDF)'}
            </Button>
            <input ref={ref} type="file" accept="application/pdf,.pdf" className="sr-only" aria-label="Archivo PDF del acta del comité" onChange={(e) => void elegir(e.target.files?.[0])} />
          </>
        )}
      </div>
    </section>
  );
}
