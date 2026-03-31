
import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from '@/components/providers';
import { Toaster } from "@/components/ui/toaster";
import { PWARegistrar } from '@/components/PWARegistrar';

export const metadata: Metadata = {
  title: {
    default: "جداول العمل",
    template: "%s | جداول العمل",
  },
  description: 'تطبيق لتنظيم وإدارة جداول العمل بسهولة. قم بإنشاء وتخصيص جداولك، وتتبع أيام العمل والإجازات.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'جداول العمل',
  },
  openGraph: {
    title: 'صفحة جداول العمل',
    description: 'تطبيق لتنظيم وإدارة جداول العمل بسهولة.',
    siteName: 'صفحة جداول العمل',
    locale: 'ar_SA',
    type: 'website',
  },
};

export const viewport: Viewport = {
  themeColor: '#000000',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" className="dark" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased bg-background text-foreground">
        <Providers>
          {children}
            <Toaster />
        </Providers>
        <PWARegistrar /> {/* <-- أضف المكون هنا داخل الـ body */}
      </body>
    </html>
  );
}
