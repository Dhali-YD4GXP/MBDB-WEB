'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../utils/api';

interface LostReport {
  id: number;
  nama_alat: string;
  lokasi_hilang: string;
  player_terakhir: string;
  created_at: string;
}

export default function LostReportsPage() {
  const router = useRouter();
  const [reports, setReports] = useState<LostReport[]>([]);
  const [namaAlat, setNamaAlat] = useState('');
  const [lokasiHilang, setLokasiHilang] = useState('');
  const [playerTerakhir, setPlayerTerakhir] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('mbdb_token');
    if (!token) {
      router.push('/login');
      return;
    }
    fetchReports();
  }, [router]);

  const fetchReports = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const data = await api.get<LostReport[]>('/api/lost-reports');
      setReports(data);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Gagal mengambil data laporan alat hilang');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!namaAlat.trim() || !lokasiHilang.trim() || !playerTerakhir.trim()) {
      setErrorMsg('Semua kolom wajib diisi');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/api/lost-reports', {
        nama_alat: namaAlat,
        lokasi_hilang: lokasiHilang,
        player_terakhir: playerTerakhir,
      });

      setSuccessMsg('Laporan alat hilang berhasil dikirim.');
      setNamaAlat('');
      setLokasiHilang('');
      setPlayerTerakhir('');
      fetchReports();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Gagal mengirim laporan');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container" style={{ padding: '2rem 1rem', maxWidth: '800px' }}>
      
      {/* Title Card */}
      <div
        className="glass animate-slide-up"
        style={{
          padding: '1.75rem 2rem',
          borderRadius: 'var(--radius-lg)',
          marginBottom: '2rem',
          boxShadow: 'var(--shadow-md)',
        }}
      >
        <h1
          style={{
            fontSize: '2rem',
            fontWeight: 800,
            fontFamily: 'var(--font-display)',
            margin: 0,
            background: 'linear-gradient(135deg, var(--danger) 0%, var(--accent) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Laporan Alat Hilang
        </h1>
        <p style={{ color: 'var(--text-secondary)', margin: '0.5rem 0 0 0' }}>
          Laporkan alat musik yang hilang atau pantau riwayat pelaporan alat hilang di unit MBDB Smansaagung
        </p>
      </div>

      {errorMsg && (
        <div className="glass" style={{ padding: '1rem 1.5rem', borderRadius: 'var(--radius-md)', background: 'var(--danger-light)', color: 'var(--danger)', marginBottom: '1.5rem' }}>
          ⚠️ {errorMsg}
        </div>
      )}

      {successMsg && (
        <div className="glass" style={{ padding: '1rem 1.5rem', borderRadius: 'var(--radius-md)', background: 'var(--success-light)', color: 'var(--success)', marginBottom: '1.5rem' }}>
          ✅ {successMsg}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', alignItems: 'start' }}>
        
        {/* Form Column */}
        <div className="glass animate-slide-up" style={{ padding: '2rem', borderRadius: 'var(--radius-md)' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.25rem', fontFamily: 'var(--font-display)' }}>
            📢 Buat Laporan Kehilangan
          </h2>
          
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>Nama / Jenis Alat</label>
              <input
                type="text"
                required
                placeholder="Contoh: Snare Drum Yamaha"
                value={namaAlat}
                onChange={(e) => setNamaAlat(e.target.value)}
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
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>Lokasi Terakhir Terlihat / Hilang</label>
              <input
                type="text"
                required
                placeholder="Contoh: Lapangan Upacara, Gudang 2"
                value={lokasiHilang}
                onChange={(e) => setLokasiHilang(e.target.value)}
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
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>Player Terakhir</label>
              <input
                type="text"
                required
                placeholder="Nama anggota pemegang terakhir"
                value={playerTerakhir}
                onChange={(e) => setPlayerTerakhir(e.target.value)}
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

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }} disabled={isSubmitting}>
              {isSubmitting ? 'Mengirim...' : 'Kirim Laporan'}
            </button>
          </form>
        </div>

        {/* List Column */}
        <div className="glass animate-slide-up" style={{ padding: '2rem', borderRadius: 'var(--radius-md)', animationDelay: '0.1s' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.25rem', fontFamily: 'var(--font-display)' }}>
            📋 Daftar Alat Hilang
          </h2>

          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-secondary)' }}>
              <div className="spinner" style={{ margin: '0 auto 1rem auto' }}></div>
              Memuat laporan...
            </div>
          ) : reports.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem 0' }}>
              Tidak ada laporan kehilangan alat musik.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '420px', overflowY: 'auto', paddingRight: '0.25rem' }}>
              {reports.map((rep) => (
                <div
                  key={rep.id}
                  style={{
                    padding: '1rem',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-sm)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.35rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ color: 'var(--danger)', fontSize: '1rem' }}>⚠️ {rep.nama_alat}</strong>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      {new Date(rep.created_at).toLocaleDateString('id-ID')}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                    📍 Lokasi: <strong>{rep.lokasi_hilang}</strong>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                    👤 Player Terakhir: <strong>{rep.player_terakhir}</strong>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
