'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '../../utils/api';

export default function Login() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    // Redirect if already logged in
    const token = localStorage.getItem('mbdb_token');
    const role = localStorage.getItem('mbdb_role');
    if (token) {
      if (role === 'Admin') {
        router.push('/admin');
      } else if (role === 'Member') {
        router.push('/member');
      } else if (role === 'Bendahara') {
        router.push('/finance');
      } else {
        router.push('/loading');
      }
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);

    if (!username || !password) {
      setErrorMsg('Username dan Password wajib diisi.');
      setIsLoading(false);
      return;
    }

    try {
      const response = await api.post<{
        token: string;
        username: string;
        role: string;
        user_id: number;
      }>('/api/auth/login', { username, password });

      // Save session info
      localStorage.setItem('mbdb_token', response.token);
      localStorage.setItem('mbdb_role', response.role);
      localStorage.setItem('mbdb_username', response.username);
      localStorage.setItem('mbdb_user_id', String(response.user_id));

      // Redirect depending on role
      if (response.role === 'Admin') {
        router.push('/admin');
      } else if (response.role === 'Member') {
        router.push('/member');
      } else if (response.role === 'Bendahara') {
        router.push('/finance');
      } else {
        router.push('/loading');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Username atau Password salah.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '80vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1rem',
      }}
    >
      <div className="card glass animate-slide-up" style={{ width: '100%', maxWidth: '420px', padding: '2.5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <img
            src="/logo.png"
            alt="Logo MBDB"
            style={{
              width: '70px',
              height: '70px',
              borderRadius: '50%',
              objectFit: 'cover',
              border: '2px solid var(--accent)',
              boxShadow: 'var(--shadow-gold)',
              marginBottom: '1rem',
              display: 'inline-block',
            }}
          />
          <h1
            style={{
              fontSize: '2rem',
              fontWeight: 800,
              background: 'linear-gradient(135deg, var(--text-primary) 0%, var(--accent) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginBottom: '0.5rem',
            }}
          >
            Login Staff
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Portal internal untuk Admin & Official Loading MBDB Smansaagung
          </p>
        </div>

        {errorMsg && (
          <div
            style={{
              padding: '0.75rem 1rem',
              backgroundColor: 'var(--danger-light)',
              color: 'var(--danger)',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.875rem',
              marginBottom: '1.5rem',
              border: '1px solid rgba(239, 68, 68, 0.2)',
            }}
          >
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="form-group">
            <label className="form-label">Nomor Anggota / Username</label>
            <input
              type="text"
              className="form-input"
              placeholder="Masukkan Nomor Anggota atau Username Anda"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-input"
              placeholder="Masukkan password Anda"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{
              marginTop: '0.5rem',
              padding: '0.75rem',
              fontSize: '1rem',
              width: '100%',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
            }}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <svg
                  style={{ animation: 'spin 1s linear infinite', marginRight: '0.5rem' }}
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                >
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
                Memproses...
              </>
            ) : (
              'Masuk Ke Akun'
            )}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: 0 }}>
            Anggota baru?{' '}
            <Link
              href="/aktivasi"
              style={{
                color: 'var(--accent)',
                fontWeight: 600,
                textDecoration: 'underline',
              }}
            >
              Aktivasi Akun di sini
            </Link>
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
