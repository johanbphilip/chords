import type { ReactNode } from 'react';
import './globals.css';
import { GeistSans } from "geist/font/sans";
import { cn } from "@/lib/utils";

export const metadata = { title: 'Chords' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={cn("font-sans", GeistSans.variable)}>
      <body>{children}</body>
    </html>
  );
}
