'use client';

import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Trash2, Plus } from 'lucide-react';
import { colorMap } from '@/lib/color-mapper';

export interface MiembroEquipo {
  nombre: string;
  edad: number | null;
  rol: string;
  email: string | null;
}

interface MiembrosEquipoProps {
  miembros: MiembroEquipo[];
  minMiembros: number | null;
  maxMiembros: number | null;
  edadMin: number | null;
  edadMax: number | null;
  onChange: (miembros: MiembroEquipo[]) => void;
}

/**
 * MiembrosEquipo
 * Team member management form
 * Renders only if programa.tiene_equipo === true
 */
export function MiembrosEquipo({
  miembros,
  minMiembros,
  maxMiembros,
  edadMin,
  edadMax,
  onChange,
}: MiembrosEquipoProps) {
  const canAdd = !maxMiembros || miembros.length < maxMiembros;

  const handleAdd = () => {
    if (canAdd) {
      onChange([
        ...miembros,
        { nombre: '', edad: null, rol: '', email: null },
      ]);
    }
  };

  const handleRemove = (index: number) => {
    // Solo permitir remover si hay más de minMiembros
    if (!minMiembros || miembros.length > minMiembros) {
      onChange(miembros.filter((_, i) => i !== index));
    }
  };

  const handleChange = (index: number, field: keyof MiembroEquipo, value: any) => {
    const updated = [...miembros];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-semibold">Miembros del Equipo</Label>
        <p className={`text-sm ${colorMap.neutral.muted}`}>
          {miembros.length}
          {maxMiembros ? ` / ${maxMiembros}` : ''} miembros
        </p>
      </div>

      <div className="space-y-3">
        {miembros.map((miembro, index) => (
          <Card key={index} className="p-4">
            <div className="space-y-3">
              {index === 0 && (
                <p className={`text-xs ${colorMap.states.info.background} ${colorMap.states.info.text} px-2 py-1 rounded w-fit`}>
                  Líder del equipo
                </p>
              )}

              <div className="grid grid-cols-2 gap-4">
                <Input
                  placeholder="Nombre completo"
                  value={miembro.nombre}
                  onChange={(e) => handleChange(index, 'nombre', e.target.value)}
                />
                <Input
                  type="number"
                  placeholder={`Edad ${edadMin ? `(${edadMin}-${edadMax})` : ''}`}
                  min={edadMin ?? undefined}
                  max={edadMax ?? undefined}
                  value={miembro.edad || ''}
                  onChange={(e) =>
                    handleChange(index, 'edad', e.target.value ? parseInt(e.target.value) : null)
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  placeholder="Rol en el equipo"
                  value={miembro.rol}
                  onChange={(e) => handleChange(index, 'rol', e.target.value)}
                />
                <Input
                  type="email"
                  placeholder="Correo electrónico"
                  value={miembro.email || ''}
                  onChange={(e) => handleChange(index, 'email', e.target.value)}
                />
              </div>

              {miembros.length > (minMiembros || 1) && (
                <div className="flex justify-end pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemove(index)}
                    className={`${colorMap.states.error.text} hover:opacity-90 ${colorMap.states.error.background}/10`}
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Remover
                  </Button>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      <Button
        type="button"
        onClick={handleAdd}
        disabled={!canAdd}
        variant="outline"
        className="w-full"
      >
        <Plus className="w-4 h-4 mr-2" />
        Agregar Miembro
      </Button>

      {minMiembros && (
        <p className={`text-xs ${colorMap.neutral.muted}`}>
          Mínimo {minMiembros} miembro(s) requerido(s)
        </p>
      )}
    </div>
  );
}
