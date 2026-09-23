import { redirect } from 'next/navigation';

export default function RootPage() {
  // La raíz lleva a la landing pública. En la práctica proxy.ts ya resuelve `/` antes de llegar
  // aquí (sin sesión → /sigac, con sesión → su panel); esto es solo el respaldo.
  redirect('/sigac');
}
