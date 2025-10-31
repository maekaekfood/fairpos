import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { cn } from '@/lib/utils';
import { FirebaseClientProvider } from '@/firebase';
import MobileNavBar from '@/components/MobileNavBar';

export const metadata: Metadata = {
  title: 'ร้านแฟร์',
  description: 'ระบบขายหน้าร้าน (POS) ที่ทันสมัยสำหรับจัดการสต็อกสินค้า',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=PT+Sans:ital,wght@0,400;0,700;1,400;1,700&family=Sarabun:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className={cn(
          'min-h-screen bg-background font-body antialiased'
        )}
      >
        <FirebaseClientProvider>
          <div className="pb-20 md:pb-0">
            {children}
          </div>
          <MobileNavBar />
          <Toaster />
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
