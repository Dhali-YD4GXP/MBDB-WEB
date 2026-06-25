'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CompetitionRoster } from '../../types';

interface ActiveSession {
  id: number;
  title: string;
  token: string;
  is_active: boolean;
  created_at: string;
}

function PresensiForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [session, setSession] = useState<any | null>(null);
  const [isCompetition, setIsCompetition] = useState(false);
  const [competitionRoster, setCompetitionRoster] = useState<CompetitionRoster[]>([]);
  const [selectedRosterId, setSelectedRosterId] = useState<number | null>(null);

  const [isValidating, setIsValidating] = useState(true);
  const [validationError, setValidationError] = useState<string | null>(null);

  const [nama, setNama] = useState('');
  const [alat, setAlat] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setValidationError('Token presensi tidak ditemukan. Silakan scan QR Code yang valid.');
      setIsValidating(false);
      return;
    }

    validateToken(token);
  }, [token]);

  const validateToken = async (tokenStr: string) => {
    setIsValidating(true);
    setValidationError(null);
    try {
      // 1. Try practice session first
      const practiceResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081'}/api/public/practice-sessions/${tokenStr}`);
      if (practiceResponse.ok) {
        const data = await practiceResponse.json();
        setSession(data);
        setIsCompetition(false);
        setIsValidating(false);
        return;
      }

      // 2. Try competition session
      const compResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081'}/api/public/competition-sessions/${tokenStr}`);
      if (compResponse.ok) {
        const data = await compResponse.json();
        setSession(data);
        setIsCompetition(true);
        setCompetitionRoster(data.roster || []);
        setIsValidating(false);
        return;
      }

      throw new Error('Sesi presensi latihan/lomba tidak aktif atau tidak ditemukan');
    } catch (err: any) {
      console.error(err);
      setValidationError(err.message || 'Sesi presensi tidak valid atau sudah ditutup');
      setIsValidating(false);
    }
  };

  const playChime = (type: 'success' | 'error') => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const audioCtx = new AudioContextClass();
      
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      if (type === 'success') {
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
        oscillator.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.1); // E5
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime + 0.25);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.25);
      } else {
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(150, audioCtx.currentTime);
        oscillator.frequency.setValueAtTime(100, audioCtx.currentTime + 0.15);
        gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime + 0.35);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.35);
      }
    } catch (e) {
      console.log('Error playing chime:', e);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setSubmitError(null);
    setIsSubmitting(true);

    if (isCompetition) {
      if (!selectedRosterId) {
        setSubmitError('Silakan pilih nama Anda dari daftar');
        setIsSubmitting(false);
        playChime('error');
        return;
      }

      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081'}/api/public/competition-sessions/${token}/attend`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ roster_id: selectedRosterId }),
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || 'Gagal mengirim data presensi');
        }

        const resData = await response.json();
        const attendedMember = resData.roster || {};
        setNama(attendedMember.nama);
        setAlat(attendedMember.alat);
        setSubmitSuccess(true);
        playChime('success');
      } catch (err: any) {
        console.error(err);
        setSubmitError(err.message || 'Terjadi kesalahan saat mengirim presensi');
        playChime('error');
      } finally {
        setIsSubmitting(false);
      }
    } else {
      if (!nama.trim() || !alat.trim()) {
        setSubmitError('Nama dan Alat wajib diisi');
        setIsSubmitting(false);
        playChime('error');
        return;
      }

      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081'}/api/public/practice-sessions/${token}/attend`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ nama, alat }),
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || 'Gagal mengirim data presensi');
        }

        setSubmitSuccess(true);
        playChime('success');
      } catch (err: any) {
        console.error(err);
        setSubmitError(err.message || 'Terjadi kesalahan saat mengirim presensi');
        playChime('error');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const pendingRoster = competitionRoster.filter(r => !r.has_attended);
  const attendedRoster = competitionRoster.filter(r => r.has_attended);

  if (isValidating) {
    return (
      <div className="glass" style={{ padding: '3rem', borderRadius: 'var(--radius-lg)', textAlign: 'center', maxWidth: '480px', margin: '4rem auto' }}>
        <div className="spinner"></div>
        <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>Memverifikasi sesi presensi...</p>
      </div>
    );
  }

  if (validationError) {
    return (
      <div className="glass" style={{ padding: '3rem', borderRadius: 'var(--radius-lg)', textAlign: 'center', maxWidth: '480px', margin: '4rem auto', boxShadow: 'var(--shadow-lg)' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--danger)', marginBottom: '1rem', fontFamily: 'var(--font-display)' }}>Sesi Presensi Tidak Valid</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', lineHeight: '1.5' }}>
          {validationError}
        </p>
        <button onClick={() => router.push('/')} className="btn btn-outline" style={{ width: '100%' }}>
          Kembali ke Beranda
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '480px', margin: '4rem auto', padding: '0 1rem' }}>
      {submitSuccess ? (
        <div
          className="glass"
          style={{
            padding: '3rem 2rem',
            borderRadius: 'var(--radius-lg)',
            textAlign: 'center',
            boxShadow: 'var(--shadow-lg)',
            animation: 'scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
        >
          <div className="checkmark-wrapper" style={{ margin: '0 auto 1.5rem auto' }}>
            <div className="checkmark-circle">
              <span className="checkmark-icon">✓</span>
            </div>
          </div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--success)', marginBottom: '0.75rem', fontFamily: 'var(--font-display)' }}>
            Presensi Berhasil!
          </h2>
          <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '1.5rem' }}>
            Halo <strong>{nama}</strong> ({alat}), presensi Anda di sesi {isCompetition ? 'lomba' : 'latihan'} <strong>{session?.title}</strong> telah berhasil dicatat. {isCompetition ? 'Selamat bertanding!' : 'Selamat berlatih!'}
          </p>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)' }}>
            Waktu check-in: {new Date().toLocaleTimeString('id-ID')}
          </div>
        </div>
      ) : (
        <div
          className="glass"
          style={{
            padding: '2.5rem 2rem',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-lg)',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <span style={{ fontSize: '2.5rem', background: 'var(--accent-light)', padding: '0.5rem', borderRadius: '50%', display: 'inline-block', marginBottom: '1rem' }}>
              {isCompetition ? '🏆' : '📝'}
            </span>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, fontFamily: 'var(--font-display)' }}>
              {isCompetition ? 'Presensi Keberangkatan Lomba' : 'Presensi Latihan'}
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
              Acara: <strong>{session?.title}</strong>
            </p>
          </div>

          {submitError && (
            <div style={{ color: 'var(--danger)', background: 'var(--danger-light)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', marginBottom: '1rem', fontSize: '0.875rem' }}>
              ⚠️ {submitError}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {isCompetition ? (
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>Pilih Nama Anda</label>
                <select
                  required
                  value={selectedRosterId || ''}
                  onChange={(e) => setSelectedRosterId(Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: '1rem',
                  }}
                >
                  <option value="">-- Pilih Nama --</option>
                  {pendingRoster.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.nama} ({r.alat})
                    </option>
                  ))}
                </select>
                {pendingRoster.length === 0 && (
                  <p style={{ fontSize: '0.825rem', color: 'var(--success)', marginTop: '0.5rem' }}>
                    Semua anggota terdaftar sudah melakukan presensi.
                  </p>
                )}
              </div>
            ) : (
              <>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>Nama Lengkap</label>
                  <input
                    type="text"
                    required
                    placeholder="Masukkan nama lengkap Anda"
                    value={nama}
                    onChange={(e) => setNama(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>Alat Musik / Seksi</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Snare, Trumpet, Color Guard"
                    value={alat}
                    onChange={(e) => setAlat(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                    }}
                  />
                </div>
              </>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '1rem', padding: '0.85rem' }}
              disabled={isSubmitting || (isCompetition && pendingRoster.length === 0)}
            >
              {isSubmitting ? 'Memproses...' : '✓ Kirim Presensi'}
            </button>
          </form>

          {isCompetition && attendedRoster.length > 0 && (
            <div style={{ marginTop: '2rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
              <h4 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '0.75rem' }}>
                Anggota yang Sudah Hadir ({attendedRoster.length})
              </h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', maxHeight: '120px', overflowY: 'auto' }}>
                {attendedRoster.map((r) => (
                  <span
                    key={r.id}
                    style={{
                      fontSize: '0.75rem',
                      padding: '0.25rem 0.5rem',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: 'var(--success-light)',
                      color: 'var(--success)',
                      border: '1px solid rgba(16, 185, 129, 0.15)',
                    }}
                  >
                    ✓ {r.nama} ({r.alat})
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Checkmark animation style */}
      <style jsx global>{`
        .checkmark-circle {
          width: 72px;
          height: 72px;
          border-radius: 50%;
          background: var(--success);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 10px rgba(46, 125, 50, 0.3);
        }
        .checkmark-icon {
          color: #ffffff;
          font-size: 2.25rem;
          font-weight: bold;
        }
        @keyframes scaleIn {
          from {
            transform: scale(0.9);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}

export default function PresensiPage() {
  return (
    <Suspense fallback={
      <div className="glass" style={{ padding: '3rem', borderRadius: 'var(--radius-lg)', textAlign: 'center', maxWidth: '480px', margin: '4rem auto' }}>
        <div className="spinner"></div>
        <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>Memuat halaman presensi...</p>
      </div>
    }>
      <PresensiForm />
    </Suspense>
  );
}
