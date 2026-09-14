import { redirect } from 'next/navigation';

export default function RootPage() {
  // Redirigir a login inmediatamente al cargar la raíz
  redirect('/login');
}
