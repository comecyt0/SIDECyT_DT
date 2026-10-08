'use client';

import { useState } from 'react';
import { CalendarPlus } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Asterisco } from '@/components/ui/obligatorio';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertBox } from '@/components/ui/alert-box';
import api from '@/lib/api';
import { formatDate } from '@/lib/format';
import type { Convocatoria } from '@/types/api';

interface Props {
  convocatoria: Convocatoria;
  open: boolean;
  onClose: () => void;
  onDone: (actualizada: Convocatoria) => void;
}

/** 'YYYY-MM-DD' de hoy en la zona del navegador (el backend valida con la hora de Toluca). */
const hoyISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const diaSiguiente = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  const n = new Date(y, m - 1, d + 1);
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
};

/**
 * Dar prórroga a una convocatoria (E40). Solo admin: el endpoint vive en el grupo `admin` del backend,
 * que además repite todas las reglas (validación en 2 capas, regla 9).
 * La fecha nueva debe ser posterior a la fecha límite vigente y a hoy; el motivo es obligatorio.
 */
export default function ProrrogaDialog({ convocatoria, open, onClose, onDone }: Props) {
  const limite = convocatoria.fecha_cierre_efectiva ?? convocatoria.fecha_cierre ?? hoyISO();
  const minimo = diaSiguiente(limite > hoyISO() ? limite : hoyISO());
  const [fecha, setFecha] = useState('');
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const cerrar = () => {
    if (saving) return;
    setFecha('');
    setMotivo('');
    setError(null);
    onClose();
  };

  const guardar = async () => {
    if (!fecha) return setError('Elige la nueva fecha límite.');
    if (fecha < minimo) return setError(`La nueva fecha debe ser a partir del ${formatDate(minimo)}.`);
    if (motivo.trim().length < 10) return setError('Explica el motivo de la prórroga (al menos 10 caracteres).');
    setSaving(true);
    setError(null);
    try {
      const { data } = await api.post(`/admin/convocatorias/${convocatoria.id}/prorroga`, {
        fecha_prorroga: fecha,
        motivo: motivo.trim(),
      });
      onDone(data.convocatoria as Convocatoria);
      setFecha('');
      setMotivo('');
    } catch (e: unknown) {
      const r = (e as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } }).response?.data;
      setError(r?.errors ? Object.values(r.errors).flat()[0] : (r?.message ?? 'No se pudo registrar la prórroga.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) cerrar(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarPlus className="h-5 w-5" style={{ color: 'var(--auth-vino)' }} aria-hidden="true" />
            Dar prórroga
          </DialogTitle>
          <DialogDescription>
            {convocatoria.nombre}. Hoy recibe solicitudes hasta el <strong>{formatDate(limite)}</strong>
            {convocatoria.fecha_prorroga ? ' (ya tiene una prórroga)' : ''}. La nueva fecha amplía el plazo y
            la landing la mostrará como «Con prórroga».
            {convocatoria.estado === 'cerrada' && ' Como está cerrada, la prórroga la vuelve a abrir.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && <AlertBox type="error" message={error} onClose={() => setError(null)} />}
          <div className="space-y-1.5">
            <Label htmlFor="prorroga-fecha">Nueva fecha límite <Asterisco /></Label>
            <input
              id="prorroga-fecha"
              type="date"
              min={minimo}
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="auth-input auth-input-static pl-4"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="prorroga-motivo">Motivo <Asterisco /></Label>
            <Textarea
              id="prorroga-motivo"
              value={motivo}
              maxLength={500}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Por ejemplo: ampliación acordada por el comité para recibir más propuestas."
              className="min-h-[96px]"
              required
            />
            <p className="text-xs text-[var(--app-ink-2)]">{motivo.length}/500 · Queda en la bitácora de auditoría.</p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={cerrar} disabled={saving}>Cancelar</Button>
          <Button onClick={guardar} isLoading={saving}>
            <CalendarPlus className="h-4 w-4" aria-hidden="true" /> Dar prórroga
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
