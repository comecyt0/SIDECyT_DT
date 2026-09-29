'use client';

import { useEffect, useRef, useState } from 'react';
import { mensajeCamara } from '@/lib/escaneo';

type Detector = { detect: (v: HTMLVideoElement) => Promise<{ rawValue?: string }[]> };
type DetectorCtor = (new (o: { formats: string[] }) => Detector) & { getSupportedFormats?: () => Promise<string[]> };

/**
 * E52 · F4 — Lector de QR con la cámara trasera. Usa `BarcodeDetector` si el navegador lo trae y, si no (Safari, Firefox),
 * `jsqr` cargado bajo demanda. Lee ~5 veces por segundo sobre una copia reducida del cuadro (máx. 640 px) y se detiene al
 * primer código que `onLeido` acepta (si devuelve `false`, lo ignora y sigue leyendo). La cámara se apaga al desactivar
 * o desmontar.
 * Requiere `Permissions-Policy: camera=(self)` (next.config.ts) y HTTPS.
 */
export function useLectorQr(activo: boolean, onLeido: (texto: string) => boolean | void) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const cb = useRef(onLeido);
  const [error, setError] = useState<string | null>(null);
  const [listo, setListo] = useState(false);

  useEffect(() => { cb.current = onLeido; }, [onLeido]);

  useEffect(() => {
    if (!activo) return;
    let vivo = true;
    let raf = 0;
    let ultimo = 0;
    let stream: MediaStream | null = null;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw Object.assign(new Error('sin cámara'), { name: 'NotFoundError' });
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
        const v = video;
        if (!vivo || !v) { stream.getTracks().forEach((t) => t.stop()); return; }
        v.srcObject = stream;
        v.muted = true;
        v.setAttribute('playsinline', 'true');
        await v.play();
        if (!vivo) return;
        setError(null);
        setListo(true);

        const Ctor = (window as unknown as { BarcodeDetector?: DetectorCtor }).BarcodeDetector;
        let detector: Detector | null = null;
        if (Ctor) {
          try {
            const formatos = await Ctor.getSupportedFormats?.();
            if (!formatos || formatos.includes('qr_code')) detector = new Ctor({ formats: ['qr_code'] });
          } catch { detector = null; }
        }
        const jsQR = detector ? null : (await import('jsqr')).default;

        const tick = async (ts: number) => {
          if (!vivo) return;
          if (ts - ultimo > 200 && v.readyState >= 2 && v.videoWidth > 0) {
            ultimo = ts;
            try {
              let texto: string | null = null;
              if (detector) {
                texto = (await detector.detect(v))[0]?.rawValue ?? null;
              } else if (jsQR && ctx) {
                const w = Math.min(640, v.videoWidth);
                const h = Math.round((v.videoHeight * w) / v.videoWidth);
                canvas.width = w; canvas.height = h;
                ctx.drawImage(v, 0, 0, w, h);
                texto = jsQR(ctx.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: 'dontInvert' })?.data ?? null;
              }
              if (texto && vivo && cb.current(texto.slice(0, 200)) !== false) return;
            } catch { /* cuadro ilegible: se intenta con el siguiente */ }
          }
          raf = requestAnimationFrame((t) => void tick(t));
        };
        raf = requestAnimationFrame((t) => void tick(t));
      } catch (e) {
        if (vivo) setError(mensajeCamara(e));
      }
    })();

    return () => {
      vivo = false;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
      if (video) video.srcObject = null;
      setListo(false);
    };
  }, [activo]);

  return { videoRef, error, listo, limpiarError: () => setError(null) };
}
