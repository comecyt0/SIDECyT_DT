'use client';

import { useEffect, useState } from 'react';
import { QrCode, FileDown, Loader2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { descargarCredencial, urlImagenQr } from '@/lib/especie-api';
import type { LogisticaEstado } from '@/lib/especie';

/**
 * E52 · F4 — QR del club, del lado del líder. Con el QR habilitado muestra la imagen (se pide con sesión y se pinta desde
 * una URL de objeto, nunca un enlace directo) y la credencial en PDF; si no, dice qué falta para tenerlo.
 */
export default function QrLider({ clubId, folio, qr, onAviso }: {
  clubId: number; folio: string; qr: LogisticaEstado['qr']; onAviso: (ok: boolean, texto: string) => void;
}) {
  const [img, setImg] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [bajando, setBajando] = useState(false);

  useEffect(() => {
    if (!qr.habilitado) { setImg(null); return; }
    let url: string | null = null;
    let vivo = true;
    setCargando(true);
    urlImagenQr(clubId)
      .then((u) => { url = u; if (vivo) setImg(u); else URL.revokeObjectURL(u); })
      .catch(() => { if (vivo) setImg(null); })
      .finally(() => { if (vivo) setCargando(false); });
    return () => { vivo = false; if (url) URL.revokeObjectURL(url); };
  }, [clubId, qr.habilitado, qr.habilitado_at]);

  const credencial = async () => {
    setBajando(true);
    try { await descargarCredencial(clubId, folio); } catch { onAviso(false, 'No se pudo descargar la credencial.'); } finally { setBajando(false); }
  };

  if (!qr.habilitado) {
    return (
      <div className="app-card flex items-start gap-3 p-5">
        <span className="tone-chip" data-tone="neutral"><Lock aria-hidden="true" /></span>
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-[var(--app-ink)]">QR del club</h3>
          <p className="text-sm text-[var(--app-ink-2)]">
            El COMECYT habilita tu QR cuando tu club está aceptado y tu carta de resguardo está aprobada
            {qr.falta ? `. Por ahora: ${qr.falta}.` : '.'} Te avisaremos por correo.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-card grid gap-5 p-5 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center">
      <div className="mx-auto grid h-44 w-44 place-items-center rounded-[18px] border-2 bg-white p-2" style={{ borderColor: 'var(--auth-vino)' }}>
        {img
          ? <img src={img} alt={`Código QR del club ${folio}`} className="h-full w-full [image-rendering:pixelated]" />
          : cargando ? <Loader2 className="h-6 w-6 animate-spin text-[var(--app-ink-2)]" aria-label="Cargando el QR" /> : <QrCode className="h-10 w-10 text-[var(--app-ink-2)]" aria-hidden="true" />}
      </div>
      <div className="space-y-3">
        <h3 className="flex items-center gap-2 text-sm font-bold text-[var(--app-ink)]"><QrCode className="h-4 w-4" aria-hidden="true" />Tu QR del club está listo</h3>
        <p className="text-sm text-[var(--app-ink-2)]">
          Muéstralo al personal del COMECYT en cada evento: con él registran tu asistencia, tu box lunch y la entrega de tu kit.
          Descarga la credencial con los datos y las fotos de tu club, e imprímela o guárdala en tu celular. No la compartas en redes.
        </p>
        <Button size="sm" disabled={bajando} onClick={() => void credencial()}>
          {bajando ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <FileDown className="h-4 w-4" aria-hidden="true" />}Descargar credencial
        </Button>
      </div>
    </div>
  );
}
