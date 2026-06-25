'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [token, setToken] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    // Read from localStorage on mount and when pathname changes
    const storedToken = localStorage.getItem('mbdb_token');
    const storedRole = localStorage.getItem('mbdb_role');
    const storedUsername = localStorage.getItem('mbdb_username');
    setToken(storedToken);
    setRole(storedRole);
    setUsername(storedUsername);
  }, [pathname]);

  const handleLogout = () => {
    localStorage.removeItem('mbdb_token');
    localStorage.removeItem('mbdb_role');
    localStorage.removeItem('mbdb_username');
    localStorage.removeItem('mbdb_user_id');
    setToken(null);
    setRole(null);
    setUsername(null);
    setIsMenuOpen(false);
    router.push('/login');
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <nav
      className="glass"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        borderBottom: '1px solid var(--border-color)',
        padding: '1rem 0',
      }}
    >
      <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {/* Brand/Logo */}
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <img
            src="/logo.png"
            alt="Logo MBDB"
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              objectFit: 'cover',
              border: '2px solid var(--accent)',
            }}
          />
          <span
            style={{
              fontSize: '1.2rem',
              fontWeight: 800,
              fontFamily: 'var(--font-display)',
              background: 'linear-gradient(135deg, var(--accent) 0%, #ffb300 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: '0.05em',
            }}
          >
            MBDB SMANSAAGUNG
          </span>
        </Link>

        {/* Desktop Navigation */}
        <div style={{ display: 'none', alignItems: 'center', gap: '1.5rem' }} className="desktop-nav">
          <Link
            href="/"
            style={{
              fontSize: '0.875rem',
              fontWeight: 500,
              color: pathname === '/' ? 'var(--accent)' : 'var(--text-secondary)',
            }}
          >
            Dashboard
          </Link>
          <Link
            href="/organisasi"
            style={{
              fontSize: '0.875rem',
              fontWeight: 500,
              color: pathname === '/organisasi' ? 'var(--accent)' : 'var(--text-secondary)',
            }}
          >
            Struktur Organisasi
          </Link>
          <Link
            href="/pendaftaran"
            style={{
              fontSize: '0.875rem',
              fontWeight: 500,
              color: pathname === '/pendaftaran' ? 'var(--accent)' : 'var(--text-secondary)',
            }}
          >
            Pendaftaran Baru
          </Link>

          {token && (
            <>
              <Link
                href="/loading"
                style={{
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: pathname === '/loading' ? 'var(--accent)' : 'var(--text-secondary)',
                }}
              >
                Loading Logistik
              </Link>
              <Link
                href="/instruments"
                style={{
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: pathname === '/instruments' ? 'var(--accent)' : 'var(--text-secondary)',
                }}
              >
                Inventaris Alat
              </Link>
              <Link
                href="/anggota"
                style={{
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: pathname === '/anggota' ? 'var(--accent)' : 'var(--text-secondary)',
                }}
              >
                Anggota
              </Link>
            </>
          )}

          {token && (role === 'Bendahara' || role === 'Admin') && (
            <Link
              href="/finance"
              style={{
                fontSize: '0.875rem',
                fontWeight: 500,
                color: pathname === '/finance' ? 'var(--accent)' : 'var(--text-secondary)',
              }}
            >
              Keuangan
            </Link>
          )}

          {token && role === 'Admin' && (
            <>
              <Link
                href="/admin"
                style={{
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: pathname === '/admin' ? 'var(--accent)' : 'var(--text-secondary)',
                }}
              >
                Panel Pendaftar
              </Link>
              <Link
                href="/admin/register-official"
                style={{
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: pathname === '/admin/register-official' ? 'var(--accent)' : 'var(--text-secondary)',
                }}
              >
                Tambah Official
              </Link>
              <Link
                href="/practice-sessions"
                style={{
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: pathname === '/practice-sessions' ? 'var(--accent)' : 'var(--text-secondary)',
                }}
              >
                Sesi Latihan
              </Link>
            </>
          )}

          {token ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                Halo, <strong>{username}</strong> ({role})
              </span>
              <button
                onClick={handleLogout}
                className="btn btn-outline"
                style={{ padding: '0.4rem 1rem', fontSize: '0.875rem' }}
              >
                Keluar
              </button>
            </div>
          ) : (
            <Link href="/login" className="btn btn-primary" style={{ padding: '0.5rem 1.25rem', fontSize: '0.875rem' }}>
              Login Staff
            </Link>
          )}
        </div>

        {/* Mobile Hamburger Trigger */}
        <button
          onClick={toggleMenu}
          style={{
            display: 'block',
            padding: '0.5rem',
            color: 'var(--text-primary)',
          }}
          className="mobile-menu-btn"
        >
          {isMenuOpen ? '✕' : '☰'}
        </button>
      </div>

      {/* Mobile Menu Dropdown */}
      {isMenuOpen && (
        <div
          className="glass"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            borderBottom: '1px solid var(--border-color)',
            padding: '1rem 1.5rem 1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            animation: 'slideUp 0.2s ease-out',
          }}
        >
          <Link
            href="/"
            onClick={() => setIsMenuOpen(false)}
            style={{
              fontWeight: 600,
              color: pathname === '/' ? 'var(--accent)' : 'var(--text-primary)',
            }}
          >
            Dashboard
          </Link>
          <Link
            href="/organisasi"
            onClick={() => setIsMenuOpen(false)}
            style={{
              fontWeight: 600,
              color: pathname === '/organisasi' ? 'var(--accent)' : 'var(--text-primary)',
            }}
          >
            Struktur Organisasi
          </Link>
          <Link
            href="/pendaftaran"
            onClick={() => setIsMenuOpen(false)}
            style={{
              fontWeight: 600,
              color: pathname === '/pendaftaran' ? 'var(--accent)' : 'var(--text-primary)',
            }}
          >
            Pendaftaran Baru
          </Link>

          {token && (
            <>
              <Link
                href="/loading"
                onClick={() => setIsMenuOpen(false)}
                style={{
                  fontWeight: 600,
                  color: pathname === '/loading' ? 'var(--accent)' : 'var(--text-primary)',
                }}
              >
                Loading Logistik
              </Link>
              <Link
                href="/instruments"
                onClick={() => setIsMenuOpen(false)}
                style={{
                  fontWeight: 600,
                  color: pathname === '/instruments' ? 'var(--accent)' : 'var(--text-primary)',
                }}
              >
                Inventaris Alat
              </Link>
              <Link
                href="/anggota"
                onClick={() => setIsMenuOpen(false)}
                style={{
                  fontWeight: 600,
                  color: pathname === '/anggota' ? 'var(--accent)' : 'var(--text-primary)',
                }}
              >
                Anggota
              </Link>
            </>
          )}

          {token && (role === 'Bendahara' || role === 'Admin') && (
            <Link
              href="/finance"
              onClick={() => setIsMenuOpen(false)}
              style={{
                fontWeight: 600,
                color: pathname === '/finance' ? 'var(--accent)' : 'var(--text-primary)',
              }}
            >
              Keuangan
            </Link>
          )}

          {token && role === 'Admin' && (
            <>
              <Link
                href="/admin"
                onClick={() => setIsMenuOpen(false)}
                style={{
                  fontWeight: 600,
                  color: pathname === '/admin' ? 'var(--accent)' : 'var(--text-primary)',
                }}
              >
                Panel Pendaftar
              </Link>
              <Link
                href="/admin/register-official"
                onClick={() => setIsMenuOpen(false)}
                style={{
                  fontWeight: 600,
                  color: pathname === '/admin/register-official' ? 'var(--accent)' : 'var(--text-primary)',
                }}
              >
                Tambah Official
              </Link>
              <Link
                href="/practice-sessions"
                onClick={() => setIsMenuOpen(false)}
                style={{
                  fontWeight: 600,
                  color: pathname === '/practice-sessions' ? 'var(--accent)' : 'var(--text-primary)',
                }}
              >
                Sesi Latihan
              </Link>
            </>
          )}

          <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '0.5rem 0' }} />

          {token ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                Login sebagai: <strong>{username}</strong> ({role})
              </span>
              <button onClick={handleLogout} className="btn btn-secondary" style={{ width: '100%' }}>
                Keluar
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              onClick={() => setIsMenuOpen(false)}
              className="btn btn-primary"
              style={{ width: '100%', textAlign: 'center' }}
            >
              Login Staff
            </Link>
          )}
        </div>
      )}

      {/* Embedded CSS for responsive desktop-nav / mobile hamburger display */}
      <style jsx global>{`
        .mobile-menu-btn {
          font-size: 1.5rem;
          background: none;
          border: none;
          cursor: pointer;
        }
        @media (min-width: 768px) {
          .desktop-nav {
            display: flex !important;
          }
          .mobile-menu-btn {
            display: none !important;
          }
        }
      `}</style>
    </nav>
  );
}
