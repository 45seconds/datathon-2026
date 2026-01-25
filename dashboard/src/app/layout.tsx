import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
<<<<<<< HEAD
  title: 'Humanitarian Crisis Dashboard | DSC Datathon 2026',
  description: 'Analyzing humanitarian need vs resource allocation to identify underserved global crises',
=======
  title: 'humanitarian need database.',
  description: 'Analyzing humanitarian need vs resource allocation to identify underserved global crises',
  icons: {
    icon: '/globe.svg',
  },
>>>>>>> 5d9ae2cfa8499c593acb31f470c87a6a6fe6fdb5
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
