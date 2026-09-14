// COMECYT API Domain Types
// Central type definitions for all API models matching Laravel backend

export interface Rol {
  id: number;
  nombre: string;
  slug: string;
}

export interface Empresa {
  id: number;
  nombre: string;
  clave?: string;
  municipio_id?: number;
  municipio?: { id: number; nombre: string };
}

export interface User {
  id: number;
  name: string;
  email: string;
  rol_id: number;
  rol?: Rol;
  empresa_id?: number;
  empresa?: Empresa;
  telefono?: string;
  cargo?: string;
  activo: boolean;
  ultimo_acceso?: string;
  created_at?: string;
}

export interface TipoPrograma {
  id: number;
  clave: string;
  nombre: string;
  descripcion?: string;
  tipo_apoyo: 'reembolso' | 'concurrente' | 'honorarios';
  tiene_etapas: boolean;
  tiene_equipo: boolean;
  monto_maximo: number;
  activo: boolean;
}

export interface Convocatoria {
  id: number;
  nombre: string;
  ejercicio_fiscal: string;
  estado: string;
  descripcion?: string;
  tipo_programa_id?: number;
  tipoPrograma?: TipoPrograma;
  fecha_inicio?: string;
  fecha_fin?: string;
  fecha_apertura?: string;
  fecha_cierre?: string;
  presupuesto_total?: number;
  monto_maximo_apoyo?: number;
  porcentaje_aportacion_minima?: number;
  created_at?: string;
}

export interface Observacion {
  id: number;
  solicitud_id: number;
  user_id: number;
  campo: string;
  tipo: string;
  comentario: string;
  resuelta: boolean;
  respuesta_solicitante?: string;
  user?: Pick<User, 'id' | 'name'>;
  created_at?: string;
}

export interface Convenio {
  id: number;
  solicitud_id: number;
  numero_convenio: string;
  estado: string;
  monto_aprobado: number;
  num_tranches: number;
  fecha_generacion?: string;
  fecha_firma?: string;
  pdf_url?: string;
  observaciones?: string;
}

export interface Banco {
  id: number;
  codigo?: string;
  nombre: string;
}

export interface Ministracion {
  id: number;
  solicitud_id: number;
  banco_id?: number;
  banco?: Banco;
  cuenta_clabe?: string;
  numero_cuenta?: string;
  titular_cuenta?: string;
  estado: 'pendiente' | 'revision' | 'autorizada' | 'pagada' | 'rechazada';
  observaciones?: string;
  carta_compromiso_aprobada: boolean;
  carta_compromiso_url?: string;
  caratula_banco_url?: string;
  constancia_fiscal_url?: string;
  factura_institucion_url?: string;
  monto?: number;
  numero_tranche?: number;
  created_at?: string;
  solicitud?: Pick<Solicitud, 'id' | 'folio' | 'titulo_proyecto' | 'monto_solicitado' | 'convenio' | 'empresa'> & { user?: { id: number; name: string; empresa?: Empresa } };
}

export interface Documento {
  id: number;
  solicitud_id: number;
  tipo: string;
  nombre_original: string;
  url: string;
  created_at: string;
}

export interface Solicitud {
  id: number;
  folio: string;
  titulo_proyecto: string;
  descripcion_proyecto?: string;
  resumen?: string;
  estado: string;
  etapa_actual?: string;
  estado_informe?: 'pendiente' | 'entregado' | 'observado' | 'aprobado';
  informe_final_url?: string;
  resultados_obtenidos?: string;
  fecha_entrega_informe?: string;
  fecha_limite_informe?: string;
  observaciones_informe?: string;
  monto_solicitado: number;
  aportacion_concurrente?: number;
  modalidad?: string;
  area_conocimiento?: { id: number; nombre: string };
  area_conocimiento_id?: number;
  user_id?: number;
  user?: Pick<User, 'id' | 'name' | 'email'>;
  empresa_id?: number;
  empresa?: Pick<Empresa, 'id' | 'nombre'>;
  convocatoria_id?: number;
  convocatoria?: Convocatoria;
  observaciones?: Observacion[];
  documentos?: Documento[];
  convenio?: Pick<Convenio, 'id' | 'numero_convenio' | 'monto_aprobado' | 'num_tranches'>;
  ministracion?: Ministracion;
  ministraciones?: Ministracion[];
  asignaciones?: AsignacionEvaluador[];
  created_at?: string;
  updated_at?: string;
}

export interface AsignacionEvaluador {
  id: number;
  solicitud_id: number;
  evaluador_id: number;
  estado: 'asignado' | 'evaluando' | 'concluido' | 'notificado';
  fecha_limite?: string;
  solicitud?: Solicitud;
  evaluador?: User;
  dictamen?: Dictamen;
  created_at?: string;
}

export interface Dictamen {
  id: number;
  asignacion_id: number;
  criterio_1_puntaje?: number;
  criterio_2_puntaje?: number;
  criterio_3_puntaje?: number;
  criterio_4_puntaje?: number;
  puntaje_total?: number;
  comentarios_justificacion?: string;
  sujeto_apoyo?: boolean;
  documento_formato_b_url?: string;
}

export interface ListaNegra {
  id: number;
  empresa_id: number;
  empresa?: Pick<Empresa, 'id' | 'nombre'>;
  motivo: string;
  fecha_inicio_sancion: string;
  fecha_fin_sancion?: string;
  activa: boolean;
  created_at?: string;
}

export interface Informe {
  id: number;
  solicitud_id: number;
  solicitud?: Pick<Solicitud, 'id' | 'folio' | 'titulo_proyecto'>;
  estado: string;
  tipo?: string;
  resultados?: string;
  observaciones?: string;
  pdf_url?: string;
  fecha_limite_entrega?: string;
  fecha_entregado?: string;
  created_at?: string;
}

export interface NotificacionLog {
  id: number;
  user_id: number;
  correo_destino?: string;
  asunto: string;
  mensaje: string;
  tipo: string;
  solicitud_id?: number;
  enviado: boolean;
  error_mensaje?: string;
  leida_at?: string;
  descripcion?: string;
  user?: Pick<User, 'id' | 'name' | 'email'>;
  solicitud?: Pick<Solicitud, 'id' | 'folio'>;
  created_at: string;
  updated_at?: string;
}

export interface AreaConocimiento {
  id: number;
  nombre: string;
  clave?: string;
  activo?: boolean;
}

// API response wrappers
export interface PaginatedResponse<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

// Dashboard types
export interface DashboardStat {
  title: string;
  value: string;
  icon: string;
  color?: string;
  trend?: string;
}

export interface ActivityItem {
  id: number;
  descripcion: string;
  tipo?: string;
  created_at: string;
}

export interface AlertItem {
  id: number;
  mensaje: string;
  message?: string;
  tipo: 'info' | 'warning' | 'error';
  type?: 'info' | 'warning' | 'error';
}
