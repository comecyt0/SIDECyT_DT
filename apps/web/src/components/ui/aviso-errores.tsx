import type { ErroresFormulario } from '@/lib/errores-formulario';

/** Contenido del aviso de error de un formulario (título + qué corregir). Se pasa como `error` a `StepFrame`. */
export default function AvisoErrores({ errores }: { errores: ErroresFormulario }) {
  return (
    <div>
      <p className="font-semibold">No se guardó. {errores.titulo}</p>
      {errores.lineas.length > 0 && (
        <ul className="mt-1.5 list-disc space-y-0.5 pl-5">
          {errores.lineas.map((l) => <li key={l}>{l}</li>)}
        </ul>
      )}
    </div>
  );
}
