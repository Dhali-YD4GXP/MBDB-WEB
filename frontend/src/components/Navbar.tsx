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
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

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
        padding: '0.75rem 0',
      }}
    >
      <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {/* Brand/Logo */}
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0, marginRight: '2.5rem' }}>
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
              fontSize: '1.15rem',
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
        <div style={{ display: 'none', alignItems: 'center', gap: '1.25rem' }} className="desktop-nav">
          <Link
            href="/"
            style={{
              fontSize: '0.875rem',
              fontWeight: 600,
              color: pathname === '/' ? 'var(--accent)' : 'var(--text-secondary)',
            }}
          >
            Beranda
          </Link>
          <Link
            href="/organisasi"
            style={{
              fontSize: '0.875rem',
              fontWeight: 600,
              color: pathname === '/organisasi' ? 'var(--accent)' : 'var(--text-secondary)',
            }}
          >
            Struktur
          </Link>
          <Link
            href="/pendaftaran"
            style={{
              fontSize: '0.875rem',
              fontWeight: 600,
              color: pathname === '/pendaftaran' ? 'var(--accent)' : 'var(--text-secondary)',
            }}
          >
            Pendaftaran
          </Link>
          <Link
            href="/alumni"
            style={{
              fontSize: '0.875rem',
              fontWeight: 600,
              color: pathname === '/alumni' ? 'var(--accent)' : 'var(--text-secondary)',
            }}
          >
            Alumni
          </Link>
          {!token && (
            <Link
              href="/aktivasi"
              style={{
                fontSize: '0.875rem',
                fontWeight: 600,
                color: pathname === '/aktivasi' ? 'var(--accent)' : 'var(--text-secondary)',
              }}
            >
              Aktivasi Akun
            </Link>
          )}

          {token && role === 'Member' && (
            <Link
              href="/member"
              style={{
                fontSize: '0.875rem',
                fontWeight: 600,
                color: pathname === '/member' ? 'var(--accent)' : 'var(--text-secondary)',
              }}
            >
              Dashboard
            </Link>
          )}

          {token && (
            <Link
              href="/lost-reports"
              style={{
                fontSize: '0.875rem',
                fontWeight: 600,
                color: pathname === '/lost-reports' ? 'var(--accent)' : 'var(--text-secondary)',
              }}
            >
              Lapor Hilang
            </Link>
          )}

          {token && (role === 'Admin' || role === 'Official') && (
            <>
              <Link
                href="/loading"
                style={{
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: pathname === '/loading' ? 'var(--accent)' : 'var(--text-secondary)',
                }}
              >
                Loading Logistik
              </Link>
              
              {/* Dropdown Menu for Management */}
              <div
                style={{ position: 'relative' }}
                onMouseEnter={() => setIsDropdownOpen(true)}
                onMouseLeave={() => setIsDropdownOpen(false)}
              >
                <button
                  style={{
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    color: isDropdownOpen || ['/instruments', '/anggota', '/finance', '/admin', '/admin/register-official', '/practice-sessions'].includes(pathname) ? 'var(--accent)' : 'var(--text-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    padding: '0.5rem 0',
                    cursor: 'pointer',
                  }}
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                >
                  🛠️ Kelola Menu <span style={{ fontSize: '0.7rem' }}>▼</span>
                </button>

                {isDropdownOpen && (
                  <div
                    className="glass card"
                    style={{
                      position: 'absolute',
                      top: '100%',
                      right: 0,
                      minWidth: '220px',
                      padding: '0.5rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.25rem',
                      boxShadow: 'var(--shadow-lg)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-color)',
                      zIndex: 100,
                      backgroundColor: 'var(--bg-secondary)',
                    }}
                  >
                    <Link
                      href="/instruments"
                      onClick={() => setIsDropdownOpen(false)}
                      style={{
                        fontSize: '0.85rem',
                        padding: '0.5rem 0.75rem',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: pathname === '/instruments' ? 'var(--primary-light)' : 'transparent',
                        color: pathname === '/instruments' ? 'var(--primary)' : 'var(--text-primary)',
                        fontWeight: 500,
                      }}
                      className="dropdown-item"
                    >
                      🎺 Inventaris Alat
                    </Link>

                    <Link
                      href="/anggota"
                      onClick={() => setIsDropdownOpen(false)}
                      style={{
                        fontSize: '0.85rem',
                        padding: '0.5rem 0.75rem',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: pathname === '/anggota' ? 'var(--primary-light)' : 'transparent',
                        color: pathname === '/anggota' ? 'var(--primary)' : 'var(--text-primary)',
                        fontWeight: 500,
                      }}
                      className="dropdown-item"
                    >
                      👥 Daftar Anggota
                    </Link>

                    {((role as string) === 'Bendahara' || role === 'Admin') && (
                      <Link
                        href="/finance"
                        onClick={() => setIsDropdownOpen(false)}
                        style={{
                          fontSize: '0.85rem',
                          padding: '0.5rem 0.75rem',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: pathname === '/finance' ? 'var(--primary-light)' : 'transparent',
                          color: pathname === '/finance' ? 'var(--primary)' : 'var(--text-primary)',
                          fontWeight: 500,
                        }}
                        className="dropdown-item"
                      >
                        💰 Keuangan Kas
                      </Link>
                    )}

                    {role === 'Admin' && (
                      <>
                        <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '0.25rem 0' }} />
                        
                        <Link
                          href="/admin"
                          onClick={() => setIsDropdownOpen(false)}
                          style={{
                            fontSize: '0.85rem',
                            padding: '0.5rem 0.75rem',
                            borderRadius: 'var(--radius-sm)',
                            backgroundColor: pathname === '/admin' ? 'var(--primary-light)' : 'transparent',
                            color: pathname === '/admin' ? 'var(--primary)' : 'var(--text-primary)',
                            fontWeight: 500,
                          }}
                          className="dropdown-item"
                        >
                          📂 Panel Pendaftar
                        </Link>

                        <Link
                          href="/admin/register-official"
                          onClick={() => setIsDropdownOpen(false)}
                          style={{
                            fontSize: '0.85rem',
                            padding: '0.5rem 0.75rem',
                            borderRadius: 'var(--radius-sm)',
                            backgroundColor: pathname === '/admin/register-official' ? 'var(--primary-light)' : 'transparent',
                            color: pathname === '/admin/register-official' ? 'var(--primary)' : 'var(--text-primary)',
                            fontWeight: 500,
                          }}
                          className="dropdown-item"
                        >
                          👤 Tambah Official
                        </Link>

                        <Link
                          href="/practice-sessions"
                          onClick={() => setIsDropdownOpen(false)}
                          style={{
                            fontSize: '0.85rem',
                            padding: '0.5rem 0.75rem',
                            borderRadius: 'var(--radius-sm)',
                            backgroundColor: pathname === '/practice-sessions' ? 'var(--primary-light)' : 'transparent',
                            color: pathname === '/practice-sessions' ? 'var(--primary)' : 'var(--text-primary)',
                            fontWeight: 500,
                          }}
                          className="dropdown-item"
                        >
                          📋 Presensi
                        </Link>

                        <Link
                          href="/competition-sessions"
                          onClick={() => setIsDropdownOpen(false)}
                          style={{
                            fontSize: '0.85rem',
                            padding: '0.5rem 0.75rem',
                            borderRadius: 'var(--radius-sm)',
                            backgroundColor: pathname === '/competition-sessions' ? 'var(--primary-light)' : 'transparent',
                            color: pathname === '/competition-sessions' ? 'var(--primary)' : 'var(--text-primary)',
                            fontWeight: 500,
                          }}
                          className="dropdown-item"
                        >
                          🏆 Presensi Lomba
                        </Link>
                      </>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          {token ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginLeft: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={`${username} (${role})`}>
                Halo, <strong>{username}</strong>
              </span>
              <button
                onClick={handleLogout}
                className="btn btn-outline"
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
              >
                Keluar
              </button>
            </div>
          ) : (
            <Link href="/login" className="btn btn-primary" style={{ padding: '0.4rem 1rem', fontSize: '0.8125rem' }}>
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
          <Link
            href="/alumni"
            onClick={() => setIsMenuOpen(false)}
            style={{
              fontWeight: 600,
              color: pathname === '/alumni' ? 'var(--accent)' : 'var(--text-primary)',
            }}
          >
            Daftar Alumni
          </Link>
          {!token && (
            <Link
              href="/aktivasi"
              onClick={() => setIsMenuOpen(false)}
              style={{
                fontWeight: 600,
                color: pathname === '/aktivasi' ? 'var(--accent)' : 'var(--text-primary)',
              }}
            >
              Aktivasi Akun
            </Link>
          )}

          {token && role === 'Member' && (
            <Link
              href="/member"
              onClick={() => setIsMenuOpen(false)}
              style={{
                fontWeight: 600,
                color: pathname === '/member' ? 'var(--accent)' : 'var(--text-primary)',
              }}
            >
              Dashboard Anggota
            </Link>
          )}

          {token && (
            <Link
              href="/lost-reports"
              onClick={() => setIsMenuOpen(false)}
              style={{
                fontWeight: 600,
                color: pathname === '/lost-reports' ? 'var(--accent)' : 'var(--text-primary)',
              }}
            >
              Lapor Alat Hilang
            </Link>
          )}

          {token && (role === 'Admin' || role === 'Official') && (
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
                Presensi
              </Link>
              <Link
                href="/competition-sessions"
                onClick={() => setIsMenuOpen(false)}
                style={{
                  fontWeight: 600,
                  color: pathname === '/competition-sessions' ? 'var(--accent)' : 'var(--text-primary)',
                }}
              >
                Presensi Lomba
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
        .dropdown-item {
          transition: all var(--transition-fast) !important;
          display: block;
        }
        .dropdown-item:hover {
          background-color: var(--primary-light) !important;
          color: var(--primary) !important;
          padding-left: 1rem !important;
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
