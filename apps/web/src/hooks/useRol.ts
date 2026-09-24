'use client';

import { useEffect, useState } from 'react';
import Cookies from 'js-cookie';
import type { RolSlug } from '@/lib/roles';

/**
 * Rol del usuario para DECIDIR QUÉ MOSTRAR (E45). No es un control de seguridad: la cookie `userRole` la escribe el
 * navegador; el backend (rol + alcance) es quien permite o niega cada acción. Aquí solo se ocultan botones que el
 * backend rechazaría.
 */
export function useRol() {
  const [rol, setRol] = useState<RolSlug | ''>('');
  useEffect(() => {
    setRol((Cookies.get('userRole') as RolSlug) || '');
  }, []);

  return {
    rol,
    esAdmin: rol === 'admin',
    esDelegado: rol === 'admin_convocatoria',
    esConsulta: rol === 'consulta',
    /** Puede operar el flujo (revisar, asignar, convenios, publicar folios): admin y admin de convocatoria. */
    puedeOperar: rol === 'admin' || rol === 'admin_convocatoria',
    listo: rol !== '',
  };
}
