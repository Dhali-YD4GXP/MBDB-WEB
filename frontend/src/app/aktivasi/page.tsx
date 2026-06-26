'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '../../utils/api';

export default function AktivasiPage() {
  const router = useRouter();
  const [nomorAnggota, setNomorAnggota] = useState('');
  const [kodePendaftaran, setKodePendaftaran] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    // Frontend validations
    if (!nomorAnggota || !kodePendaftaran || !password || !confirmPassword) {
      setErrorMsg('Semua kolom wajib diisi.');
      setIsLoading(false);
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Password minimal harus 6 karakter.');
      setIsLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Konfirmasi password tidak cocok.');
      setIsLoading(false);
      return;
    }

    try {
      const response = await api.post<{ message: string }>('/api/auth/activate', {
        nomor_anggota: nomorAnggota.trim(),
        kode_pendaftaran: kodePendaftaran.trim(),
        password: password.trim(),
      });

      setSuccessMsg(response.message || 'Akun berhasil diaktivasi! Silakan login.');
      // Auto redirect to login after 3 seconds
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal mengaktivasi akun. Silakan periksa kembali Nomor Anggota dan Kode Pendaftaran Anda.');
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
      <div className="card glass animate-slide-up" style={{ width: '100%', maxWidth: '450px', padding: '2.5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <span style={{ fontSize: '2.5rem', background: 'var(--accent-light)', padding: '0.5rem', borderRadius: '50%', display: 'inline-block', marginBottom: '1rem' }}>
            🔑
          </span>
          <h1
            style={{
              fontSize: '1.75rem',
              fontWeight: 800,
              background: 'linear-gradient(135deg, var(--text-primary) 0%, var(--accent) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginBottom: '0.5rem',
              fontFamily: 'var(--font-display)',
            }}
          >
            Aktivasi Akun
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Khusus anggota aktif baru untuk pertama kali mengatur kata sandi login.
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
            ⚠️ {errorMsg}
          </div>
        )}

        {successMsg && (
          <div
            style={{
              padding: '0.75rem 1rem',
              backgroundColor: 'var(--success-light)',
              color: 'var(--success)',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.875rem',
              marginBottom: '1.5rem',
              border: '1px solid rgba(16, 185, 129, 0.2)',
            }}
          >
            🎉 {successMsg}
            <div style={{ fontSize: '0.75rem', marginTop: '0.5rem', opacity: 0.8 }}>
              Mengarahkan Anda ke halaman login dalam 3 detik...
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="form-group">
            <label className="form-label">Nomor Anggota</label>
            <input
              type="text"
              className="form-input"
              placeholder="Contoh: MBDB-2026-001"
              value={nomorAnggota}
              onChange={(e) => setNomorAnggota(e.target.value)}
              required
              disabled={isLoading || !!successMsg}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Kode Pendaftaran</label>
            <input
              type="text"
              className="form-input"
              placeholder="Contoh: REG-123456"
              value={kodePendaftaran}
              onChange={(e) => setKodePendaftaran(e.target.value)}
              required
              disabled={isLoading || !!successMsg}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password Baru</label>
            <input
              type="password"
              className="form-input"
              placeholder="Minimal 6 karakter"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading || !!successMsg}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Konfirmasi Password Baru</label>
            <input
              type="password"
              className="form-input"
              placeholder="Ulangi password baru Anda"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={isLoading || !!successMsg}
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
            disabled={isLoading || !!successMsg}
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
                Memproses Aktivasi...
              </>
            ) : (
              'Aktivasi Akun Saya'
            )}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: 0 }}>
            Sudah aktivasi?{' '}
            <Link
              href="/login"
              style={{
                color: 'var(--accent)',
                fontWeight: 600,
                textDecoration: 'underline',
              }}
            >
              Login di sini
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
