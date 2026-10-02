/**
 * E58 — Folio con el nombre corto de su convocatoria para el seguimiento. Los folios nuevos ya lo llevan dentro
 * (CLUB-LEGO26-F0BMIW, COMECYT-LEGO26-…); a los anteriores (con el año) se les pone el nombre corto al lado.
 */
export function folioIncluyeCorto(folio: string, corto?: string | null): boolean {
  return !corto || folio.toUpperCase().includes(`-${corto.toUpperCase()}-`);
}

export default function Folio({ folio, corto, className = 'font-mono', chipClassName = '' }: {
  folio: string; corto?: string | null; className?: string; chipClassName?: string;
}) {
  return (
    <>
      <span className={className}>{folio}</span>
      {!folioIncluyeCorto(folio, corto) && (
        <span className={`ml-1.5 inline-flex items-center rounded-full px-2 py-0.5 align-middle font-sans text-[11px] font-bold ${chipClassName}`}
          style={{ backgroundColor: 'var(--tile-vino-bg, rgba(122,39,72,0.1))', color: 'var(--auth-vino)' }} title="Nombre corto de la convocatoria">
          {corto}
        </span>
      )}
    </>
  );
}
