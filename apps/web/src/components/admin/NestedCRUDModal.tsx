'use client';

import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import StepFrame, { type StepDef } from '@/components/ui/step-frame';
import { ListPlus } from 'lucide-react';

interface Field {
  name: string;
  label: string;
  type: 'text' | 'number' | 'textarea' | 'checkbox' | 'select';
  required?: boolean;
  options?: Array<{ value: string; label: string }>;
  placeholder?: string;
  /** Texto de ayuda en lenguaje llano (opcional). */
  hint?: string;
}

interface NestedCRUDModalProps {
  isOpen: boolean;
  title: string;
  fields: Field[];
  formData: Record<string, unknown>;
  onFormChange: (data: Record<string, unknown>) => void;
  onSave: () => void;
  onClose: () => void;
  loading?: boolean;
  /** Aviso de contexto arriba del formulario (qué es lo que se está creando). */
  intro?: React.ReactNode;
  error?: string | null;
}

/**
 * Modal genérico de crear/editar de los catálogos anidados (campos, documentos, rubros, etapas,
 * modalidades, criterios…). 14/09/2026: usa el marco por pasos del sistema (StepFrame): los campos
 * obligatorios van en "Lo básico" y el resto en "Detalles"; si todo es obligatorio, un solo paso.
 */
export function NestedCRUDModal({
  isOpen,
  title,
  fields,
  formData,
  onFormChange,
  onSave,
  onClose,
  loading = false,
  intro,
  error,
}: NestedCRUDModalProps) {
  const required = fields.filter((f) => f.required);
  const optional = fields.filter((f) => !f.required);

  const renderField = (field: Field) => {
    const id = `nested-${field.name}`;
    const value = formData[field.name];
    if (field.type === 'checkbox') {
      return (
        <label key={field.name} htmlFor={id} className="flex items-center gap-3 rounded-[14px] border px-4 py-3 cursor-pointer" style={{ borderColor: 'var(--app-rule)', backgroundColor: value ? 'var(--tile-emerald-bg)' : 'var(--auth-field)' }}>
          <Checkbox id={id} checked={Boolean(value)} onCheckedChange={(v) => onFormChange({ ...formData, [field.name]: v })} />
          <span className="text-sm font-semibold text-[var(--app-ink)]">{field.label}</span>
        </label>
      );
    }
    return (
      <div key={field.name} className="space-y-1.5">
        <label htmlFor={id} className="text-xs font-bold text-[var(--app-ink-2)] uppercase tracking-widest">
          {field.label} {field.required && '*'}
        </label>
        {field.type === 'select' ? (
          <Select value={String(value ?? '')} onValueChange={(v) => onFormChange({ ...formData, [field.name]: v })}>
            <SelectTrigger id={id} className="w-full">
              <SelectValue placeholder={field.placeholder ?? 'Selecciona…'} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : field.type === 'textarea' ? (
          <textarea
            id={id}
            value={String(value ?? '')}
            onChange={(e) => onFormChange({ ...formData, [field.name]: e.target.value })}
            placeholder={field.placeholder}
            rows={3}
            className="w-full px-4 py-3 rounded-[var(--auth-radius-field)] text-sm resize-none outline-none transition-colors"
            style={{ border: '1.5px solid var(--auth-rule)', background: 'var(--auth-field)', color: 'var(--auth-ink)' }}
          />
        ) : (
          <input
            id={id}
            type={field.type}
            value={String(value ?? '')}
            onChange={(e) => onFormChange({ ...formData, [field.name]: e.target.value })}
            placeholder={field.placeholder}
            className="auth-input auth-input-static pl-4"
          />
        )}
        {field.hint && <p className="text-xs text-[var(--app-ink-2)]">{field.hint}</p>}
      </div>
    );
  };

  const missing = () => {
    const faltan = required.filter((f) => {
      const v = formData[f.name];
      return v === undefined || v === null || String(v).trim() === '';
    });
    return faltan.length ? `Falta completar: ${faltan.map((f) => f.label).join(', ')}.` : null;
  };

  const steps: StepDef[] = [];
  if (required.length && optional.length) {
    steps.push({ key: 'basico', label: 'Lo básico', question: '¿Qué es y cómo se llama?', content: <>{required.map(renderField)}</>, validate: missing });
    steps.push({ key: 'detalles', label: 'Detalles', question: '¿Algo más que precisar?', content: <>{optional.map(renderField)}</> });
  } else {
    steps.push({ key: 'todo', label: 'Datos', question: 'Completa la información', content: <>{fields.map(renderField)}</>, validate: missing });
  }

  return (
    <StepFrame
      open={isOpen}
      title={title}
      icon={<ListPlus className="h-5 w-5" />}
      intro={intro}
      steps={steps}
      onClose={onClose}
      onSubmit={onSave}
      submitting={loading}
      submitLabel="Guardar"
      error={error}
      size="md"
    />
  );
}
