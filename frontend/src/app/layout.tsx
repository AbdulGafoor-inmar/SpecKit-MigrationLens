import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'MigrationLens — .NET 10 Compliance Dashboard',
  description:
    'AI-Powered .NET 10 / C# 14 Modernization Compliance Dashboard for Azure DevOps repositories',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans bg-mesh min-h-screen`}>
        {children}
      </body>
    </html>
  );
}
