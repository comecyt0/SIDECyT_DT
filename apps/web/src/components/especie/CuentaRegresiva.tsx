'use client';

import { useEffect, useState } from 'react';
import { Timer } from 'lucide-react';
import { fechaHora } from '@/lib/especie';

/** Texto "3 h 20 min" / "45 min" de los milisegundos que faltan. */
export function restante(ms: number): string {
  const min = Math.max(0, Math.floor(ms / 60000));
  const d = Math.floor(min / 1440);
  const h = Math.floor((min % 1440) / 60);
  const m = min % 60;
  if (d > 0) return `${d} d ${h} h`;
  if (h > 0) return `${h} h ${m} min`;
  return `${m} min`;
}

/**
 * E52 · F2 — Cuenta regresiva del plazo para corregir (horas naturales, hora del centro). Se actualiza cada 30 s; al
 * vencer avisa con `onVence` (la página recarga para mostrar "vencido"). El lector de pantalla no la anuncia cada vez.
 */
export default function CuentaRegresiva({ vence, onVence }: { vence: string; onVence?: () => void }) {
  const fin = new Date(vence).getTime();
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setAhora(Date.now()), 30000);
    return () => window.clearInterval(t);
  }, []);
  const falta = fin - ahora;
  useEffect(() => {
    if (falta > 0 || !onVence) return;
    onVence();
  }, [falta <= 0]); // eslint-disable-line react-hooks/exhaustive-deps -- solo al cruzar el vencimiento
  if (Number.isNaN(fin)) return null;
  const urgente = falta > 0 && falta < 3 * 3600000;
  return (
    <p className="inline-flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm font-semibold" style={{ color: falta <= 0 || urgente ? 'var(--auth-danger)' : 'var(--app-ink)' }}>
      <Timer className="h-4 w-4 shrink-0" aria-hidden="true" />
      {falta > 0 ? <>Te quedan {restante(falta)}</> : <>El plazo venció</>}
      <span className="font-normal text-[var(--app-ink-2)]">· hasta el {fechaHora(vence)}</span>
    </p>
  );
}
