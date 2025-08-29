import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/toaster';
import { cn } from '@/lib/utils';
import { AppHeader } from '@/components/app-header';

export const metadata: Metadata = {
  title: 'NetSight',
  description: 'Intelligent Network Scanning and Asset Analysis',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
      </head>
      <body
        className={cn(
          'min-h-screen bg-background font-body antialiased',
        )}
      >
        <ThemeProvider>
          <div className="flex min-h-screen w-full flex-col">
            <AppHeader />
            <main className="flex-1 container py-8">{children}</main>
          </div>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
