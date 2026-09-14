'use client';

import React, { useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ProgramaRubro } from '@/hooks/useProgramaCatalog';
import { colorMap } from '@/lib/color-mapper';
import { formatCurrency } from '@/lib/format';

interface RubrosTableProps {
  rubros: ProgramaRubro[];
  values: Record<number, string>;
  montoMaximo: number | null;
  onChange: (rubroId: number, monto: string) => void;
}

/**
 * RubrosTable
 * Editable table of budget line items (rubros presupuestales)
 * Shows total at bottom with green/red color based on budget
 */
export function RubrosTable({
  rubros,
  values,
  montoMaximo,
  onChange,
}: RubrosTableProps) {
  const total = useMemo(() => {
    return rubros.reduce((sum, rubro) => {
      const val = parseFloat(values[rubro.id] || '0');
      return sum + (isNaN(val) ? 0 : val);
    }, 0);
  }, [rubros, values]);

  const exceeds = montoMaximo ? total > montoMaximo : false;

  const getTotalRowColors = (exceeds: boolean) => ({
    bg: exceeds ? colorMap.states.error.background : colorMap.states.success.background,
    text: exceeds ? colorMap.states.error.text : colorMap.states.success.text,
  });

  const totalColors = getTotalRowColors(exceeds);
  const availableColors = exceeds ? colorMap.states.error : colorMap.states.success;

  return (
    <div className="space-y-4">
      <Label className="text-base font-semibold">Distribución Presupuestaria</Label>

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className={`${colorMap.neutral.lighter} border-b`}>
            <tr>
              <th className={`px-4 py-3 text-left text-sm font-medium ${colorMap.neutral.foreground}`}>
                Rubro
              </th>
              <th className={`px-4 py-3 text-left text-sm font-medium ${colorMap.neutral.foreground}`}>
                Descripción
              </th>
              <th className={`px-4 py-3 text-right text-sm font-medium ${colorMap.neutral.foreground}`}>
                Monto Solicitado
              </th>
            </tr>
          </thead>

          <tbody className="divide-y">
            {rubros.map((rubro) => (
              <tr key={rubro.id} className={`hover:${colorMap.neutral.lighter}`}>
                <td className={`px-4 py-3 text-sm font-medium ${colorMap.neutral.foreground}`}>
                  {rubro.nombre}
                </td>
                <td className={`px-4 py-3 text-sm ${colorMap.neutral.muted}`}>
                  {rubro.descripcion || '—'}
                </td>
                <td className="px-4 py-3 text-right">
                  <Input
                    type="number"
                    min="0"
                    step="100"
                    value={values[rubro.id] || ''}
                    onChange={(e) => onChange(rubro.id, e.target.value)}
                    className="w-32 text-right"
                    placeholder="0"
                  />
                </td>
              </tr>
            ))}

            {/* Total Row */}
            <tr className={totalColors.bg}>
              <td colSpan={2} className={`px-4 py-3 font-semibold ${colorMap.neutral.foreground}`}>
                Total Solicitado
              </td>
              <td className={`px-4 py-3 text-right font-semibold ${totalColors.text}`}>
                {formatCurrency(total)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {montoMaximo && (
        <div className="flex justify-between text-sm">
          <span className={colorMap.neutral.muted}>
            Límite presupuestario: {formatCurrency(montoMaximo)}
          </span>
          <span className={`${availableColors.text} font-semibold`}>
            {exceeds
              ? `Excede por: ${formatCurrency(total - montoMaximo)}`
              : `Disponible: ${formatCurrency(montoMaximo - total)}`}
          </span>
        </div>
      )}
    </div>
  );
}
