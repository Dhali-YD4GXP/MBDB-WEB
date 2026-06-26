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
            padding: '2rem 0',
            textAlign: 'center',
            fontSize: '0.875rem',
            color: 'var(--text-secondary)',
            backgroundColor: 'var(--bg-secondary)',
          }}
        >
          <div className="container">
            <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
              <a
                href="https://www.instagram.com/mbdbsmansaagung_/"
                target="_blank"
                rel="noopener noreferrer"
                className="footer-social-link"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                </svg>
                <span>mbdbsmansaagung_</span>
              </a>

              <a
                href="https://www.tiktok.com/@mbdb.smansaagung"
                target="_blank"
                rel="noopener noreferrer"
                className="footer-social-link"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"></path>
                </svg>
                <span>mbdb.smansaagung</span>
              </a>
            </div>
            <p>&copy; {new Date().getFullYear()} MBDB Smansaagung - SMAN 1 Kayuagung. All Rights Reserved.</p>
            <p style={{ fontSize: '0.75rem', marginTop: '0.25rem', opacity: 0.8 }}>Developed by Dhali Rozan Fadhaillah smansaagung 62</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
