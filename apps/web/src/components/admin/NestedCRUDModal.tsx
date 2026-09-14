'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { X, Save, Loader2 } from 'lucide-react';

interface NestedCRUDModalProps {
  isOpen: boolean;
  title: string;
  fields: Array<{
    name: string;
    label: string;
    type: 'text' | 'number' | 'textarea' | 'checkbox' | 'select';
    required?: boolean;
    options?: Array<{ value: string; label: string }>;
    placeholder?: string;
  }>;
  formData: Record<string, any>;
  onFormChange: (data: Record<string, any>) => void;
  onSave: () => void;
  onClose: () => void;
  loading?: boolean;
}

export function NestedCRUDModal({
  isOpen,
  title,
  fields,
  formData,
  onFormChange,
  onSave,
  onClose,
  loading = false,
}: NestedCRUDModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-lg max-h-screen overflow-y-auto">
        <CardHeader className="flex flex-row justify-between items-start bg-white border-b border-neutral-100">
          <CardTitle>{title}</CardTitle>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600">
            <X className="h-5 w-5" />
          </button>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          {fields.map((field) => (
            <div key={field.name}>
              {field.type === 'checkbox' ? (
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id={field.name}
                    checked={formData[field.name] ?? false}
                    onCheckedChange={(v) => onFormChange({ ...formData, [field.name]: v })}
                  />
                  <Label htmlFor={field.name} className="text-neutral-700 cursor-pointer">
                    {field.label}
                  </Label>
                </div>
              ) : field.type === 'select' ? (
                <div>
                  <Label htmlFor={field.name} className="text-neutral-700">
                    {field.label} {field.required && '*'}
                  </Label>
                  <Select
                    value={formData[field.name] ?? ''}
                    onValueChange={(v) => onFormChange({ ...formData, [field.name]: v })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder={field.placeholder} />
                    </SelectTrigger>
                    <SelectContent>
                      {field.options?.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : field.type === 'textarea' ? (
                <div>
                  <Label htmlFor={field.name} className="text-neutral-700">
                    {field.label} {field.required && '*'}
                  </Label>
                  <textarea
                    id={field.name}
                    value={formData[field.name] ?? ''}
                    onChange={(e) => onFormChange({ ...formData, [field.name]: e.target.value })}
                    placeholder={field.placeholder}
                    className="mt-1 w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    rows={3}
                  />
                </div>
              ) : (
                <div>
                  <Label htmlFor={field.name} className="text-neutral-700">
                    {field.label} {field.required && '*'}
                  </Label>
                  <Input
                    id={field.name}
                    type={field.type}
                    value={formData[field.name] ?? ''}
                    onChange={(e) => onFormChange({ ...formData, [field.name]: e.target.value })}
                    placeholder={field.placeholder}
                    className="mt-1"
                  />
                </div>
              )}
            </div>
          ))}
        </CardContent>
        <div className="border-t border-neutral-100 p-6 flex justify-end gap-3 bg-white">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            className="bg-primary hover:bg-primary-light text-white"
            onClick={onSave}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" /> Guardar
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}
