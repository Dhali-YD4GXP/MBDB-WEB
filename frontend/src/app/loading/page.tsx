'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../utils/api';
import { SessionDetail, Session } from '../../types';
import QRScanner from '../../components/QRScanner';

export default function LoadingPage() {
  const router = useRouter();
  const [activeSession, setActiveSession] = useState<SessionDetail | null>(null);
  const [pastSessions, setPastSessions] = useState<Session[]>([]);
  const [isLoadingActive, setIsLoadingActive] = useState(true);
  const [isLoadingPast, setIsLoadingPast] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [scanResultMsg, setScanResultMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Forms & Modal states
  const [namaSesi, setNamaSesi] = useState('');
  const [isStartingSession, setIsStartingSession] = useState(false);
  const [isClosingSession, setIsClosingSession] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  
  // Selected past session details modal
  const [selectedPastSession, setSelectedPastSession] = useState<SessionDetail | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  useEffect(() => {
    // Auth Guard
    const token = localStorage.getItem('mbdb_token');
    if (!token) {
      router.push('/login');
      return;
    }

    fetchActiveSession();
    fetchPastSessions();
  }, [router]);

  const fetchActiveSession = async () => {
    setIsLoadingActive(true);
    setErrorMsg(null);
    try {
      const data = await api.get<SessionDetail | null>('/api/sessions/active');
      setActiveSession(data);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal mengambil data sesi aktif.');
    } finally {
      setIsLoadingActive(false);
    }
  };

  const fetchPastSessions = async () => {
    setIsLoadingPast(true);
    try {
      const data = await api.get<Session[]>('/api/sessions');
      // Filter out the active one from the main list if present
      setPastSessions(data);
    } catch (err) {
      console.error('Failed to fetch past sessions', err);
    } finally {
      setIsLoadingPast(false);
    }
  };

  const handleStartSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsStartingSession(true);
    setErrorMsg(null);

    if (!namaSesi.trim()) {
      setErrorMsg('Nama sesi latihan / event wajib diisi.');
      setIsStartingSession(false);
      return;
    }

    try {
      await api.post('/api/sessions', { nama_sesi: namaSesi });
      setNamaSesi('');
      // Refresh session views
      await fetchActiveSession();
      await fetchPastSessions();
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal memulai sesi baru.');
    } finally {
      setIsStartingSession(false);
    }
  };

  const handleCloseSession = async () => {
    if (!window.confirm('Apakah Anda yakin ingin MENUTUP sesi aktif ini? Semua alat yang belum kembali harus dipertanggungjawabkan.')) {
      return;
    }

    setIsClosingSession(true);
    setErrorMsg(null);
    try {
      await api.post('/api/sessions/active/close', {});
      setActiveSession(null);
      await fetchActiveSession();
      await fetchPastSessions();
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menutup sesi.');
    } finally {
      setIsClosingSession(false);
    }
  };

  const handleScanSuccess = async (decodedText: string) => {
    setIsScannerOpen(false);
    setScanResultMsg(null);
    
    try {
      const res = await api.post<{ message: string; status: string }>('/api/sessions/active/scan', {
        instrument_id: decodedText,
      });
      
      setScanResultMsg({
        text: res.message,
        type: 'success',
      });
      
      // Auto-hide message after 5 seconds
      setTimeout(() => setScanResultMsg(null), 5000);
      
      // Refresh active session metrics and log
      fetchActiveSession();
    } catch (err: any) {
      setScanResultMsg({
        text: err.message || `Gagal mencatat pemindaian untuk ID: ${decodedText}`,
        type: 'error',
      });
      setTimeout(() => setScanResultMsg(null), 6000);
    }
  };

  const handleViewPastSessionDetail = async (id: number) => {
    setIsLoadingDetail(true);
    setSelectedPastSession(null);
    try {
      const data = await api.get<SessionDetail>(`/api/sessions/${id}`);
      setSelectedPastSession(data);
    } catch (err: any) {
      alert(err.message || 'Gagal mengambil detail sesi lampau.');
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatTimeOnly = (dateStr: string) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div style={{ padding: '3rem 0', minHeight: '80vh' }}>
      <div className="container">
        {/* Title */}
        <div style={{ marginBottom: '2.5rem' }}>
          <h1 style={{ fontSize: '2.25rem', fontWeight: 800, marginBottom: '0.5rem' }}>
            Manajemen Loading Logistik
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Monitor dan catat logistik alat musik yang keluar masuk gudang untuk latihan maupun event.
          </p>
        </div>

        {errorMsg && (
          <div
            style={{
              padding: '1rem',
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

        {/* Scan Results Notification Toast */}
        {scanResultMsg && (
          <div
            style={{
              padding: '1rem 1.5rem',
              backgroundColor: scanResultMsg.type === 'success' ? 'var(--success-light)' : 'var(--danger-light)',
              color: scanResultMsg.type === 'success' ? 'var(--success)' : 'var(--danger)',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.9rem',
              fontWeight: 600,
              marginBottom: '1.5rem',
              border: `1px solid ${scanResultMsg.type === 'success' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              animation: 'fadeIn 0.2s ease-out',
            }}
          >
            <span>{scanResultMsg.type === 'success' ? '✅' : '❌'} {scanResultMsg.text}</span>
            <button onClick={() => setScanResultMsg(null)} style={{ color: 'inherit', fontWeight: 800 }}>&times;</button>
          </div>
        )}

        {/* LOADING STAGE */}
        {isLoadingActive ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem 0' }}>
            <svg
              style={{ animation: 'spin 1s linear infinite' }}
              width="36"
              height="36"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--accent)"
              strokeWidth="3"
            >
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
          </div>
        ) : !activeSession ? (
          /* NO ACTIVE SESSION: START SESSION CARD */
          <div className="card glass" style={{ maxWidth: '600px', margin: '0 auto 3rem', padding: '2.5rem', textAlign: 'center' }}>
            <div
              style={{
                width: '60px',
                height: '60px',
                borderRadius: 'var(--radius-full)',
                backgroundColor: 'var(--accent-light)',
                color: 'var(--accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.5rem',
                fontSize: '1.5rem',
              }}
            >
              📦
            </div>
            
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.75rem' }}>
              Mulai Sesi Baru
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.75rem' }}>
              Tidak ada sesi latihan atau event yang berjalan saat ini. Masukkan nama sesi untuk memulai pencatatan logistik keluar/masuk alat.
            </p>

            <form onSubmit={handleStartSession} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', textAlign: 'left' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Nama Latihan / Event</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Contoh: Latihan Rutin Lapangan, Parade HUT RI"
                  value={namaSesi}
                  onChange={(e) => setNamaSesi(e.target.value)}
                  required
                  disabled={isStartingSession}
                />
              </div>

              <button
                type="submit"
                className="btn btn-accent"
                style={{ width: '100%', padding: '0.8rem', marginTop: '0.5rem' }}
                disabled={isStartingSession}
              >
                {isStartingSession ? 'Memproses...' : 'Mulai Sesi Baru'}
              </button>
            </form>
          </div>
        ) : (
          /* ACTIVE SESSION PANEL */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', marginBottom: '3rem' }}>
            {/* Active Session Stats Banner */}
            <div className="card glass animate-fade-in" style={{ borderColor: 'var(--accent)', borderWidth: '1px' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  flexWrap: 'wrap',
                  gap: '1.5rem',
                  borderBottom: '1px solid var(--border-color)',
                  paddingBottom: '1.25rem',
                  marginBottom: '1.5rem',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <span style={{ width: '8px', height: '8px', backgroundColor: 'var(--success)', borderRadius: '50%', display: 'inline-block', animation: 'pulseBorder 1.5s infinite' }} />
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--success)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                      SESI AKTIF BERJALAN
                    </span>
                  </div>
                  <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>{activeSession.session.nama_sesi}</h2>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.825rem', marginTop: '0.25rem' }}>
                    Dimulai: <strong>{formatDate(activeSession.session.start_at)}</strong>
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    onClick={() => setIsScannerOpen(true)}
                    className="btn btn-accent"
                    style={{
                      padding: '0.8rem 1.5rem',
                      fontSize: '1rem',
                      boxShadow: 'var(--shadow-gold)',
                      animation: 'pulseBorder 2s infinite',
                    }}
                  >
                    📷 Scan QR Code
                  </button>
                  <button
                    onClick={handleCloseSession}
                    className="btn btn-secondary"
                    style={{ padding: '0.8rem 1.25rem', color: 'var(--danger)' }}
                    disabled={isClosingSession}
                  >
                    Tutup Sesi
                  </button>
                </div>
              </div>

              {/* Counters */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', textAlign: 'center' }}>
                <div style={{ padding: '1rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                    ALAT KELUAR
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary)' }}>{activeSession.total_out}</div>
                </div>

                <div style={{ padding: '1rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                    SUDAH KEMBALI
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--success)' }}>{activeSession.total_returned}</div>
                </div>

                <div
                  style={{
                    padding: '1rem',
                    backgroundColor: activeSession.total_remaining > 0 ? 'var(--warning-light)' : 'var(--bg-tertiary)',
                    borderRadius: 'var(--radius-md)',
                    border: activeSession.total_remaining > 0 ? '1px solid rgba(245, 158, 11, 0.3)' : 'none',
                  }}
                >
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                    BELUM KEMBALI
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: activeSession.total_remaining > 0 ? 'var(--warning)' : 'var(--text-primary)' }}>
                    {activeSession.total_remaining}
                  </div>
                </div>
              </div>
            </div>

            {/* Split Screen: Missing Instruments & Audit Trail Logs */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem', ...({ '@media (min-width: 1024px)': { gridTemplateColumns: '1fr 1.2fr' } } as any) }} className="main-grid">
              {/* Left Column: Missing Instruments List */}
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  ⚠️ Daftar Alat Belum Kembali
                  <span style={{ fontSize: '0.8rem', padding: '0.15rem 0.5rem', backgroundColor: 'var(--warning-light)', color: 'var(--warning)', borderRadius: 'var(--radius-full)' }}>
                    {activeSession.total_remaining} Alat
                  </span>
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '450px', overflowY: 'auto' }}>
                  {activeSession.remaining_details.length === 0 ? (
                    <div className="card" style={{ textAlign: 'center', padding: '2rem', color: 'var(--success)', fontWeight: 600 }}>
                      🎉 Semua alat sudah dikembalikan ke gudang!
                    </div>
                  ) : (
                    activeSession.remaining_details.map((inst) => (
                      <div
                        key={inst.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '1rem',
                          backgroundColor: 'var(--bg-secondary)',
                          borderLeft: '4px solid var(--warning)',
                          borderRadius: 'var(--radius-sm)',
                          boxShadow: 'var(--shadow-sm)',
                        }}
                      >
                        <div>
                          <h4 style={{ fontWeight: 700, fontSize: '0.95rem' }}>{inst.jenis_alat}</h4>
                          <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                            ID: {inst.id}
                          </span>
                        </div>
                        <div style={{ textAlign: 'right', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          Pemegang Terakhir: <strong style={{ color: 'var(--text-primary)' }}>{inst.nama_pengguna_terakhir || '-'}</strong>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Right Column: Audit Trail Logs */}
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1rem' }}>
                  📝 Riwayat Pemindaian (Audit Trail)
                </h3>

                <div
                  style={{
                    backgroundColor: 'var(--bg-secondary)',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid var(--border-color)',
                    maxHeight: '450px',
                    overflowY: 'auto',
                    padding: '1rem',
                  }}
                >
                  {activeSession.logs.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-tertiary)' }}>
                      Belum ada pemindaian yang dicatat pada sesi ini.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                      {activeSession.logs.map((log) => (
                        <div
                          key={log.log_id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            padding: '0.75rem',
                            borderBottom: '1px solid var(--border-color)',
                            fontSize: '0.825rem',
                          }}
                        >
                          {/* Log Status pill */}
                          <span
                            style={{
                              padding: '0.15rem 0.5rem',
                              borderRadius: 'var(--radius-sm)',
                              fontWeight: 700,
                              fontSize: '0.7rem',
                              width: '60px',
                              textAlign: 'center',
                              backgroundColor: log.status === 'Keluar' ? 'var(--primary-light)' : 'var(--success-light)',
                              color: log.status === 'Keluar' ? 'var(--primary)' : 'var(--success)',
                            }}
                          >
                            {log.status === 'Keluar' ? 'OUT' : 'IN'}
                          </span>

                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div>
                              <strong>{log.jenis_alat}</strong>{' '}
                              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)', fontSize: '0.75rem' }}>
                                ({log.instrument_id})
                              </span>
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                              Oleh: {log.scanned_by} &bull; Jam: {formatTimeOnly(log.timestamp)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PAST SESSIONS SECTION */}
        <div style={{ marginTop: '4rem' }}>
          <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1.5rem' }}>
            Riwayat Sesi Lampau
          </h3>

          {isLoadingPast ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem 0' }}>
              <svg
                style={{ animation: 'spin 1s linear infinite' }}
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--accent)"
                strokeWidth="3"
              >
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
            </div>
          ) : pastSessions.length === 0 ? (
            <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              Tidak ada sesi logistik sebelumnya yang tercatat.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {pastSessions.map((session) => (
                <div
                  key={session.id}
                  className="card"
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '1rem',
                    padding: '1.25rem 1.5rem',
                    borderColor: session.is_active ? 'var(--accent)' : 'var(--border-color)',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <h4 style={{ fontWeight: 700, fontSize: '1.1rem' }}>{session.nama_sesi}</h4>
                      {session.is_active && (
                        <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem', backgroundColor: 'var(--success-light)', color: 'var(--success)', borderRadius: 'var(--radius-full)', fontWeight: 700 }}>
                          Sedang Berjalan
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
                      Mulai: {formatDate(session.start_at)} {session.end_at && ` | Selesai: ${formatTimeOnly(session.end_at)}`}
                    </p>
                  </div>

                  <button
                    onClick={() => handleViewPastSessionDetail(session.id)}
                    className="btn btn-outline"
                    style={{ padding: '0.4rem 1rem', fontSize: '0.825rem' }}
                  >
                    Detail Sesi
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* QR Scanner Component Modal */}
      <QRScanner
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={handleScanSuccess}
      />

      {/* Past Session Detail Modal */}
      {selectedPastSession && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(11, 15, 25, 0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
            animation: 'fadeIn 0.2s ease-out',
          }}
        >
          <div
            className="card glass"
            style={{
              width: '100%',
              maxWidth: '700px',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '2.5rem',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                borderBottom: '1px solid var(--border-color)',
                paddingBottom: '1.25rem',
                marginBottom: '1.5rem',
              }}
            >
              <div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Detail Sesi: {selectedPastSession.session.nama_sesi}</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.825rem', marginTop: '0.25rem' }}>
                  Waktu: <strong>{formatDate(selectedPastSession.session.start_at)}</strong> 
                  {selectedPastSession.session.end_at && ` - ${formatTimeOnly(selectedPastSession.session.end_at)}`}
                </p>
              </div>
              <button
                onClick={() => setSelectedPastSession(null)}
                style={{ fontSize: '1.75rem', color: 'var(--text-secondary)', cursor: 'pointer', lineHeight: 1 }}
              >
                &times;
              </button>
            </div>

            {/* Past stats counters */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', textAlign: 'center', marginBottom: '2rem' }}>
              <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>TOTAL DIBAWA</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)' }}>{selectedPastSession.total_out}</div>
              </div>
              <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>KEMBALI</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--success)' }}>{selectedPastSession.total_returned}</div>
              </div>
              <div
                style={{
                  padding: '0.75rem',
                  backgroundColor: selectedPastSession.total_remaining > 0 ? 'var(--danger-light)' : 'var(--bg-tertiary)',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>SELISIH/HILANG</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: selectedPastSession.total_remaining > 0 ? 'var(--danger)' : 'var(--text-primary)' }}>
                  {selectedPastSession.total_remaining}
                </div>
              </div>
            </div>

            {/* Columns split for past detail */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem', ...({ '@media (min-width: 768px)': { gridTemplateColumns: '1fr 1fr' } } as any) }} className="past-detail-grid">
              <div>
                <h4 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.75rem', color: 'var(--danger)' }}>
                  ⚠️ Alat Belum Kembali Pada Sesi Ini
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '250px', overflowY: 'auto' }}>
                  {selectedPastSession.remaining_details.length === 0 ? (
                    <div style={{ fontSize: '0.875rem', color: 'var(--success)', fontWeight: 600 }}>
                      Tidak ada (Semua alat kembali lengkap).
                    </div>
                  ) : (
                    selectedPastSession.remaining_details.map((inst) => (
                      <div key={inst.id} style={{ padding: '0.75rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', fontSize: '0.825rem' }}>
                        <strong>{inst.jenis_alat}</strong> ({inst.id})
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          Peminjam: {inst.nama_pengguna_terakhir || '-'}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div>
                <h4 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.75rem' }}>
                  📝 Audit Logs Pemindaian
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '250px', overflowY: 'auto' }}>
                  {selectedPastSession.logs.map((log) => (
                    <div key={log.log_id} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.4rem', fontSize: '0.8rem' }}>
                      <div>
                        <strong>{log.jenis_alat}</strong> ({log.status})
                        <div style={{ fontSize: '0.725rem', color: 'var(--text-tertiary)' }}>Oleh: {log.scanned_by}</div>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{formatTimeOnly(log.timestamp)}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={() => setSelectedPastSession(null)}
              className="btn btn-secondary"
              style={{ width: '100%', marginTop: '2rem' }}
            >
              Tutup Rincian
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @media (min-width: 1024px) {
          .main-grid {
            grid-template-columns: 1fr 1.2fr !important;
          }
        }
        @media (min-width: 768px) {
          .past-detail-grid {
            grid-template-columns: 1fr 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
