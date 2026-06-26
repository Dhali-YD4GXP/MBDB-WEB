'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../utils/api';

interface PracticeSession {
  id: number;
  title: string;
  token: string;
  is_active: boolean;
  tanggal_mulai?: string;
  jam_mulai?: string;
  created_at: string;
  closed_at?: string;
}

interface AttendanceRecord {
  id: number;
  practice_session_id: number;
  nama: string;
  alat: string;
  status?: string;
  alasan_terlambat?: string;
  timestamp: string;
}

interface DetailResponse {
  session: PracticeSession;
  attendances: AttendanceRecord[];
}

export default function PracticeSessionsPage() {
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);
  const [sessions, setSessions] = useState<PracticeSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const [selectedSessionData, setSelectedSessionData] = useState<DetailResponse | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newTanggalMulai, setNewTanggalMulai] = useState('');
  const [newJamMulai, setNewJamMulai] = useState('');
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [presenceUrl, setPresenceUrl] = useState('');

  // Ref to store current interval ID for real-time polling
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const storedToken = localStorage.getItem('mbdb_token');
    const storedRole = localStorage.getItem('mbdb_role');

    if (!storedToken) {
      router.push('/login');
      return;
    }

    if (storedRole !== 'Admin') {
      // Sesi latihan is restricted to Admin
      alert('Akses Ditolak: Hanya Admin yang dapat mengelola sesi presensi latihan');
      router.push('/');
      return;
    }

    setRole(storedRole);
    fetchSessions();

    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    setNewTanggalMulai(`${yyyy}-${mm}-${dd}`);

    const hh = String(today.getHours()).padStart(2, '0');
    const min = String(today.getMinutes()).padStart(2, '0');
    setNewJamMulai(`${hh}:${min}`);

    return () => {
      stopPolling();
    };
  }, []);

  const fetchSessions = async () => {
    setIsLoadingList(true);
    setErrorMsg(null);
    try {
      const data = await api.get<PracticeSession[]>('/api/practice-sessions');
      setSessions(data);
      // Auto-select the first session if active, or just keep it
      if (data.length > 0 && selectedSessionId === null) {
        handleSelectSession(data[0].id);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Gagal mengambil daftar sesi latihan');
    } finally {
      setIsLoadingList(false);
    }
  };

  const handleSelectSession = async (id: number) => {
    setSelectedSessionId(id);
    stopPolling();
    fetchSessionDetails(id, true);
  };

  const fetchSessionDetails = async (id: number, showLoading = false) => {
    if (showLoading) setIsLoadingDetail(true);
    try {
      const token = localStorage.getItem('mbdb_token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081'}/api/practice-sessions/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Gagal mengambil detail sesi dari server');
      }

      const data: DetailResponse = await response.json();
      setSelectedSessionData(data);

      // Generate the URL members will scan
      if (typeof window !== 'undefined') {
        const origin = window.location.origin;
        setPresenceUrl(`${origin}/presensi?token=${data.session.token}`);
      }

      // Start polling if session is active
      if (data.session.is_active) {
        startPolling(id);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Gagal mengambil detail sesi latihan');
    } finally {
      if (showLoading) setIsLoadingDetail(false);
    }
  };

  const startPolling = (id: number) => {
    stopPolling();
    pollingIntervalRef.current = setInterval(() => {
      fetchSessionDetails(id, false);
    }, 5000); // Poll every 5 seconds
  };

  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  };

  const handleStartSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      const token = localStorage.getItem('mbdb_token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081'}/api/practice-sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: newTitle,
          tanggal_mulai: newTanggalMulai,
          jam_mulai: newJamMulai,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Gagal memulai sesi baru');
      }

      const newSess: PracticeSession = await response.json();
      setNewTitle('');
      await fetchSessions();
      handleSelectSession(newSess.id);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal memulai sesi latihan baru');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseSession = async (id: number) => {
    if (!window.confirm('Tutup sesi latihan ini? Sesi yang ditutup tidak dapat discan lagi oleh peserta.')) return;

    setErrorMsg(null);
    try {
      const token = localStorage.getItem('mbdb_token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081'}/api/practice-sessions/${id}/close`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Gagal menutup sesi latihan');
      }

      stopPolling();
      await fetchSessions();
      handleSelectSession(id);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menutup sesi');
    }
  };

  const handleExportCSV = async (id: number, title: string) => {
    setErrorMsg(null);
    try {
      const token = localStorage.getItem('mbdb_token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081'}/api/practice-sessions/${id}/export`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Gagal mengekspor CSV dari server');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `presensi_latihan_${title.replace(/\s+/g, '_')}_${id}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal mengekspor CSV');
    }
  };

  const qrImageUrl = selectedSessionData?.session.token
    ? `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(presenceUrl)}`
    : '';

  return (
    <div className="container" style={{ padding: '2rem 1rem' }}>
      {/* Page Title */}
      <div
        className="glass"
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
            background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Sesi Latihan (Presensi QR)
        </h1>
        <p style={{ color: 'var(--text-secondary)', margin: '0.5rem 0 0 0' }}>
          Mulai sesi latihan baru, generate QR Code presensi, pantau kedatangan, dan ekspor data presensi peserta
        </p>
      </div>

      {errorMsg && (
        <div className="glass" style={{ padding: '1rem 1.5rem', borderRadius: 'var(--radius-md)', background: 'var(--danger-light)', color: 'var(--danger)', marginBottom: '1.5rem' }}>
          ⚠️ {errorMsg}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem', alignItems: 'start' }}>
        
        {/* Left Column: Start Session & Session List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Start Sesi Latihan Form */}
          <div className="glass" style={{ padding: '2rem', borderRadius: 'var(--radius-md)' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.25rem', fontFamily: 'var(--font-display)' }}>
              🎯 Mulai Sesi Latihan Baru
            </h2>
            <form onSubmit={handleStartSession} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>Nama Sesi</label>
                <input
                  type="text"
                  placeholder="Contoh: Latihan Fisik & Koreo Utama"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>Tanggal Mulai</label>
                  <input
                    type="date"
                    required
                    value={newTanggalMulai}
                    onChange={(e) => setNewTanggalMulai(e.target.value)}
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
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>Jam Mulai</label>
                  <input
                    type="time"
                    required
                    value={newJamMulai}
                    onChange={(e) => setNewJamMulai(e.target.value)}
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
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={isSubmitting}>
                {isSubmitting ? 'Memproses...' : '🚀 Mulai Sesi & Aktifkan QR'}
              </button>
            </form>
          </div>

          {/* Sesi List */}
          <div className="glass" style={{ padding: '2rem', borderRadius: 'var(--radius-md)' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.25rem', fontFamily: 'var(--font-display)' }}>
              📜 Riwayat Sesi Latihan
            </h2>
            
            {isLoadingList ? (
              <div style={{ padding: '2rem 0', textAlign: 'center', color: 'var(--text-secondary)' }}>Memuat riwayat sesi...</div>
            ) : sessions.length === 0 ? (
              <div style={{ padding: '2rem 0', textAlign: 'center', color: 'var(--text-secondary)' }}>Belum ada sesi latihan.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '400px', overflowY: 'auto', paddingRight: '0.25rem' }}>
                {sessions.map((sess) => (
                  <button
                    key={sess.id}
                    onClick={() => handleSelectSession(sess.id)}
                    style={{
                      width: '100%',
                      padding: '1rem',
                      borderRadius: 'var(--radius-sm)',
                      border: selectedSessionId === sess.id ? '2px solid var(--accent)' : '1px solid var(--border-color)',
                      background: selectedSessionId === sess.id ? 'var(--accent-light)' : 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                      textAlign: 'left',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.25rem',
                      transition: 'transform var(--transition-fast)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ fontSize: '1rem' }}>{sess.title}</strong>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          padding: '0.15rem 0.5rem',
                          borderRadius: 'var(--radius-full)',
                          background: sess.is_active ? 'var(--success-light)' : 'var(--border-color)',
                          color: sess.is_active ? 'var(--success)' : 'var(--text-secondary)',
                        }}
                      >
                        {sess.is_active ? 'Aktif' : 'Selesai'}
                      </span>
                    </div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      🗓️ {new Date(sess.created_at).toLocaleString('id-ID')}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Session Details, QR Code & Live Attendance Records */}
        <div>
          {isLoadingDetail ? (
            <div className="glass" style={{ padding: '4rem', textAlign: 'center', borderRadius: 'var(--radius-md)' }}>
              <div className="spinner"></div>
              <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>Memuat detail sesi...</p>
            </div>
          ) : selectedSessionData ? (
            <div className="glass" style={{ padding: '2rem', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              
              {/* Session Meta */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1.5rem' }}>
                <div>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      padding: '0.25rem 0.75rem',
                      borderRadius: 'var(--radius-full)',
                      background: selectedSessionData.session.is_active ? 'var(--success-light)' : 'var(--border-color)',
                      color: selectedSessionData.session.is_active ? 'var(--success)' : 'var(--text-secondary)',
                      textTransform: 'uppercase',
                      display: 'inline-block',
                      marginBottom: '0.5rem',
                    }}
                  >
                    Sesi {selectedSessionData.session.is_active ? 'Aktif' : 'Sudah Ditutup'}
                  </span>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>{selectedSessionData.session.title}</h2>
                  {selectedSessionData.session.tanggal_mulai && selectedSessionData.session.jam_mulai && (
                    <p style={{ fontSize: '0.875rem', color: 'var(--accent)', fontWeight: 600, margin: '0.25rem 0 0 0' }}>
                      Jadwal Mulai: {selectedSessionData.session.tanggal_mulai} {selectedSessionData.session.jam_mulai}
                    </p>
                  )}
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>
                    Dibuat: {new Date(selectedSessionData.session.created_at).toLocaleString('id-ID')}
                  </p>
                  {selectedSessionData.session.closed_at && (
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: '0.1rem 0 0 0' }}>
                      Selesai: {new Date(selectedSessionData.session.closed_at).toLocaleString('id-ID')}
                    </p>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {selectedSessionData.session.is_active && (
                    <button
                      onClick={() => handleCloseSession(selectedSessionData.session.id)}
                      className="btn btn-secondary"
                      style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', display: 'flex', gap: '0.25rem', alignItems: 'center' }}
                    >
                      🛑 Tutup Sesi
                    </button>
                  )}
                  <button
                    onClick={() => handleExportCSV(selectedSessionData.session.id, selectedSessionData.session.title)}
                    className="btn btn-outline"
                    style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', display: 'flex', gap: '0.25rem', alignItems: 'center' }}
                  >
                    📥 Ekspor CSV
                  </button>
                </div>
              </div>

              {/* QR Code Presentation (if Active) */}
              {selectedSessionData.session.is_active ? (
                <div
                  style={{
                    background: 'var(--bg-tertiary)',
                    padding: '1.5rem',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '1rem',
                  }}
                >
                  <strong style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>Scan QR untuk Presensi</strong>
                  <div style={{ background: '#ffffff', padding: '1rem', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-sm)' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={qrImageUrl}
                      alt="QR Code Presensi Sesi Latihan"
                      style={{ width: '200px', height: '200px', display: 'block' }}
                    />
                  </div>
                  
                  <div style={{ width: '100%', textAlign: 'center', fontSize: '0.875rem' }}>
                    <div style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Atau buka tautan berikut:</div>
                    <a
                      href={presenceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: 'var(--primary)', fontWeight: 600, wordBreak: 'break-all' }}
                    >
                      {presenceUrl}
                    </a>
                  </div>
                  
                  <button
                    onClick={() => window.open(qrImageUrl, '_blank')}
                    className="btn btn-outline"
                    style={{ padding: '0.4rem 1rem', fontSize: '0.875rem', background: '#ffffff' }}
                  >
                    🖨️ Cetak / Buka Gambar QR
                  </button>
                </div>
              ) : (
                <div style={{ padding: '1.5rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  🔒 Sesi presensi ini telah ditutup. QR Code dinonaktifkan.
                </div>
              )}

              {/* Live Attendance List */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>
                    👥 Hadir ({selectedSessionData.attendances.length} Orang)
                  </h3>
                  {selectedSessionData.session.is_active && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <span className="pulse-dot"></span> Live Polling Aktif...
                    </span>
                  )}
                </div>

                {selectedSessionData.attendances.length === 0 ? (
                  <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
                    Belum ada kedatangan tercatat untuk sesi ini.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '350px', overflowY: 'auto' }}>
                    {selectedSessionData.attendances.map((att) => (
                      <div
                        key={att.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '0.75rem 1rem',
                          background: 'var(--bg-primary)',
                          border: '1px solid var(--border-color)',
                          borderRadius: 'var(--radius-sm)',
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                            <strong style={{ color: 'var(--text-primary)' }}>{att.nama}</strong>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', background: 'var(--bg-tertiary)', padding: '0.15rem 0.5rem', borderRadius: '4px' }}>
                              {att.alat}
                            </span>
                            <span
                              style={{
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                padding: '0.1rem 0.4rem',
                                borderRadius: 'var(--radius-full)',
                                backgroundColor: att.status === 'Terlambat' ? 'var(--danger-light)' : 'var(--success-light)',
                                color: att.status === 'Terlambat' ? 'var(--danger)' : 'var(--success)',
                              }}
                            >
                              {att.status || 'Hadir'}
                            </span>
                          </div>
                          {att.status === 'Terlambat' && att.alasan_terlambat && (
                            <div style={{ fontSize: '0.775rem', color: 'var(--text-secondary)', marginTop: '0.25rem', fontStyle: 'italic' }}>
                              Alasan: &ldquo;{att.alasan_terlambat}&rdquo;
                            </div>
                          )}
                        </div>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', flexShrink: 0 }}>
                          🕒 {new Date(att.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          ) : (
            <div className="glass" style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-secondary)', borderRadius: 'var(--radius-md)' }}>
              👈 Pilih sesi latihan dari daftar atau mulai sesi baru untuk mengelola presensi.
            </div>
          )}
        </div>

      </div>

      <style jsx global>{`
        .pulse-dot {
          display: inline-block;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background-color: var(--success);
          box-shadow: 0 0 0 rgba(46, 125, 50, 0.4);
          animation: pulse 1.5s infinite;
        }
        @keyframes pulse {
          0% {
            box-shadow: 0 0 0 0px rgba(46, 125, 50, 0.7);
          }
          70% {
            box-shadow: 0 0 0 6px rgba(46, 125, 50, 0);
          }
          100% {
            box-shadow: 0 0 0 0px rgba(46, 125, 50, 0);
          }
        }
      `}</style>
    </div>
  );
}
