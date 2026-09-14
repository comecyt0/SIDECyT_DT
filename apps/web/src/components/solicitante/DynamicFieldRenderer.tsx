'use client';

import React from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ProgramaCampo } from '@/hooks/useProgramaCatalog';
import { colorMap } from '@/lib/color-mapper';

interface DynamicFieldRendererProps {
  campo: ProgramaCampo;
  value: string | number;
  onChange: (value: string | number) => void;
  error?: string;
}

/**
 * DynamicFieldRenderer
 * Renders appropriate input component based on campo.tipo_campo
 * Displays validation errors and required indicator
 */
export function DynamicFieldRenderer({
  campo,
  value,
  onChange,
  error,
}: DynamicFieldRendererProps) {
  const rules = campo.reglas_validacion_json || {};
  const label = campo.etiqueta || campo.nombre_campo;

  return (
    <div className="space-y-2">
      <Label htmlFor={`field-${campo.id}`}>
        {label}
        {campo.requerido && <span className={`${colorMap.states.error.text} ml-1`}>*</span>}
      </Label>

      {campo.tipo_campo === 'text' && (
        <Input
          id={`field-${campo.id}`}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={campo.nombre_campo}
          className={error ? colorMap.states.error.border : ''}
        />
      )}

      {campo.tipo_campo === 'number' && (
        <Input
          id={`field-${campo.id}`}
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value ? parseFloat(e.target.value) : '')}
          min={rules.min}
          max={rules.max}
          step={rules.step || 0.01}
          placeholder={campo.nombre_campo}
          className={error ? colorMap.states.error.border : ''}
        />
      )}

      {campo.tipo_campo === 'date' && (
        <Input
          id={`field-${campo.id}`}
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={error ? colorMap.states.error.border : ''}
        />
      )}

      {campo.tipo_campo === 'textarea' && (
        <div className="space-y-1">
          <Textarea
            id={`field-${campo.id}`}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={campo.nombre_campo}
            className={error ? colorMap.states.error.border : ''}
            rows={5}
          />
          <p className={`text-xs ${colorMap.neutral.muted}`}>
            {String(value).length} / {rules.max_length || '∞'}
          </p>
        </div>
      )}

      {campo.tipo_campo === 'select' && campo.opciones_json && (
        <Select value={String(value)} onValueChange={(val) => val && onChange(val)}>
          <SelectTrigger id={`field-${campo.id}`} className={error ? colorMap.states.error.border : ''}>
            <SelectValue placeholder={`Seleccionar ${label}`} />
          </SelectTrigger>
          <SelectContent>
            {campo.opciones_json.map((opt) => (
              <SelectItem key={opt.id} value={String(opt.id)}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {error && <p className={`text-xs ${colorMap.states.error.text}`}>{error}</p>}
    </div>
  );
}
