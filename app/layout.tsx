import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'MULTI IMPRESORES - Portal Interno',
  description: 'Gestión de cotizaciones, órdenes de trabajo, abonos y cierre financiero.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={inter.variable}>
      <body className="min-h-screen bg-brand-light font-sans text-brand-dark antialiased">{children}</body>
    </html>
  );
}
