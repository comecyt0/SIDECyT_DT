'use client';

import { AlertCircle, XCircle, CheckCircle, InfoIcon, X } from 'lucide-react';
import { useState } from 'react';

interface AlertBoxProps {
  type: 'error' | 'warning' | 'success' | 'info';
  title?: string;
  message: string;
  details?: string[];
  onClose?: () => void;
  dismissible?: boolean;
}

export function AlertBox({
  type,
  title,
  message,
  details,
  onClose,
  dismissible = true,
}: AlertBoxProps) {
  const [isOpen, setIsOpen] = useState(true);

  const handleClose = () => {
    setIsOpen(false);
    onClose?.();
  };

  if (!isOpen) return null;

  const config = {
    error: {
      bg: 'bg-red-50 border-red-200',
      icon: <XCircle className="h-5 w-5 text-red-600" />,
      title: title || 'Error',
      titleColor: 'text-red-900',
      textColor: 'text-red-800',
      detailColor: 'text-red-700',
    },
    warning: {
      bg: 'bg-yellow-50 border-yellow-200',
      icon: <AlertCircle className="h-5 w-5 text-yellow-600" />,
      title: title || 'Advertencia',
      titleColor: 'text-yellow-900',
      textColor: 'text-yellow-800',
      detailColor: 'text-yellow-700',
    },
    success: {
      bg: 'bg-green-50 border-green-200',
      icon: <CheckCircle className="h-5 w-5 text-green-600" />,
      title: title || 'Éxito',
      titleColor: 'text-green-900',
      textColor: 'text-green-800',
      detailColor: 'text-green-700',
    },
    info: {
      bg: 'bg-blue-50 border-blue-200',
      icon: <InfoIcon className="h-5 w-5 text-blue-600" />,
      title: title || 'Información',
      titleColor: 'text-blue-900',
      textColor: 'text-blue-800',
      detailColor: 'text-blue-700',
    },
  };

  const c = config[type];

  return (
    <div className={`border rounded-lg p-4 ${c.bg} animate-in fade-in slide-in-from-top-2 duration-300`}>
      <div className="flex gap-3">
        <div className="shrink-0 mt-0.5">{c.icon}</div>

        <div className="flex-1">
          {title && <h3 className={`font-semibold ${c.titleColor}`}>{c.title}</h3>}
          <p className={`${c.textColor} ${title ? 'mt-1' : ''}`}>{message}</p>

          {details && details.length > 0 && (
            <ul className={`mt-2 space-y-1 text-sm ${c.detailColor}`}>
              {details.map((detail, idx) => (
                <li key={idx} className="flex gap-2">
                  <span className="shrink-0">•</span>
                  <span>{detail}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {dismissible && (
          <button
            onClick={handleClose}
            className={`shrink-0 ${c.textColor} hover:opacity-70 transition-opacity`}
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>
    </div>
  );
}
