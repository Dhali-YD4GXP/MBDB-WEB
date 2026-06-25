import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "../components/Navbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Portal MBDB Smansaagung",
  description: "Sistem Pendaftaran Anggota Mandiri & Manajemen Inventaris Logistik Marching Band & Drumband SMAN 1 Kayuagung",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Navbar />
        <main style={{ flex: '1 0 auto' }}>
          {children}
        </main>
        <footer
          style={{
            flexShrink: 0,
            borderTop: '1px solid var(--border-color)',
            padding: '1.5rem 0',
            textAlign: 'center',
            fontSize: '0.875rem',
            color: 'var(--text-secondary)',
            backgroundColor: 'var(--bg-secondary)',
          }}
        >
          <div className="container">
            <p>&copy; {new Date().getFullYear()} MBDB Smansaagung - SMAN 1 Kayuagung. All Rights Reserved.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
