// app/layout.tsx
import './globals.css';
import SessionWrapper from '@/components/SessionWrapper';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="bg-gray-900 text-white">
        <SessionWrapper>{children}</SessionWrapper>
      </body>
    </html>
  );
}