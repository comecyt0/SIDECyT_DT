import { serverFetch } from '@/lib/server-api';
import CarruselClient, { type CarouselSlide } from './CarruselClient';

export const dynamic = 'force-dynamic';

export default async function AdminCarruselPage() {
  let slides: CarouselSlide[] = [];
  try {
    const raw = await serverFetch<CarouselSlide[] | { data: CarouselSlide[] }>('/admin/carousel');
    slides = Array.isArray(raw) ? raw : (raw?.data ?? []);
  } catch {
    slides = [];
  }
  return <CarruselClient slides={slides} />;
}
