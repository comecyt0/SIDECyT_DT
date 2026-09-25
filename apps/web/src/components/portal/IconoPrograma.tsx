import { Award, BadgeCheck, BookOpen, Briefcase, FlaskConical, GraduationCap, Lightbulb, Network, Rocket, Shield, Users, Wrench } from 'lucide-react';
import type { Icono } from '@/lib/sitio';

/** E49: ícono de un programa público por clave (lista cerrada; clave desconocida → foco). */
const MAPA: Record<Icono, typeof Wrench> = {
  wrench: Wrench, graduation: GraduationCap, rocket: Rocket, network: Network, lightbulb: Lightbulb, award: Award,
  shield: Shield, badge: BadgeCheck, book: BookOpen, flask: FlaskConical, users: Users, briefcase: Briefcase,
};

export const ETIQUETA_ICONO: Record<Icono, string> = {
  wrench: 'Herramienta', graduation: 'Birrete', rocket: 'Cohete', network: 'Red', lightbulb: 'Foco', award: 'Medalla',
  shield: 'Escudo', badge: 'Insignia', book: 'Libro', flask: 'Matraz', users: 'Personas', briefcase: 'Portafolio',
};

export default function IconoPrograma({ icono, className }: { icono: Icono; className?: string }) {
  const C = MAPA[icono] ?? Lightbulb;
  return <C className={className} aria-hidden="true" />;
}
