'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../utils/api';
import { CompetitionSession, CompetitionRoster, CompetitionDetailResponse } from '../../types';

interface Member {
  id: number;
  nama: string;
  kelas: string;
  alat: string;
  status: 'Aktif' | 'Alumni';
}

export default function CompetitionSessionsPage() {
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);
  
  // Lists
  const [sessions, setSessions] = useState<CompetitionSession[]>([]);
  const [allMembers, setAllMembers] = useState<Member[]>([]);
  
  // Selection/Details
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const [selectedSessionData, setSelectedSessionData] = useState<CompetitionDetailResponse | null>(null);
  const [presenceUrl, setPresenceUrl] = useState('');
  
  // Form States - Create Session
  const [newTitle, setNewTitle] = useState('');
  const [tempRoster, setTempRoster] = useState<CompetitionRoster[]>([]);
  
  // Temporary Form States - Add Member to Roster
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [selectedAlumniId, setSelectedAlumniId] = useState<string>('');
  const [manualNama, setManualNama] = useState('');
  const [manualKelas, setManualKelas] = useState('');
  const [manualAlat, setManualAlat] = useState('');
  
  // UI Status
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Active polling interval ref
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const storedToken = localStorage.getItem('mbdb_token');
    const storedRole = localStorage.getItem('mbdb_role');

    if (!storedToken) {
      router.push('/login');
      return;
    }

    if (storedRole !== 'Admin') {
      alert('Akses Ditolak: Hanya Admin yang dapat mengelola sesi presensi lomba');
      router.push('/');
      return;
    }

    setRole(storedRole);
    fetchSessions();
    fetchMembers();

    return () => {
      stopPolling();
    };
  }, []);

  const fetchSessions = async () => {
    setIsLoadingList(true);
    setErrorMsg(null);
    try {
      const data = await api.get<CompetitionSession[]>('/api/competition-sessions');
      setSessions(data);
      // Auto-select the first session if list is loaded and nothing is selected yet
      if (data.length > 0 && selectedSessionId === null) {
        handleSelectSession(data[0].id);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Gagal mengambil daftar sesi lomba');
    } finally {
      setIsLoadingList(false);
    }
  };

  const fetchMembers = async () => {
    try {
      // Fetch all members to pick from
      const data = await api.get<Member[]>('/api/members');
      setAllMembers(data);
    } catch (err) {
      console.error('Gagal mengambil daftar anggota:', err);
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
      const data = await api.get<CompetitionDetailResponse>(`/api/competition-sessions/${id}`);
      setSelectedSessionData(data);

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
      setErrorMsg(err.message || 'Gagal mengambil detail sesi lomba');
    } finally {
      if (showLoading) setIsLoadingDetail(false);
    }
  };

  const startPolling = (id: number) => {
    stopPolling();
    pollingIntervalRef.current = setInterval(() => {
      fetchSessionDetails(id, false);
    }, 5000);
  };

  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  };

  // Roster Compiler Helpers
  const addActiveToRoster = () => {
    if (!selectedMemberId) return;
    const member = allMembers.find((m) => m.id === Number(selectedMemberId));
    if (!member) return;

    // Check duplicate
    if (tempRoster.some((r) => r.nama === member.nama && r.source === 'Aktif')) {
      alert('Anggota ini sudah ada dalam daftar keberangkatan');
      return;
    }

    const newItem: CompetitionRoster = {
      nama: member.nama,
      kelas: member.kelas,
      alat: member.alat,
      source: 'Aktif',
      has_attended: false,
    };

    setTempRoster([...tempRoster, newItem]);
    setSelectedMemberId('');
  };

  const addAlumniToRoster = () => {
    if (!selectedAlumniId) return;
    const member = allMembers.find((m) => m.id === Number(selectedAlumniId));
    if (!member) return;

    // Check duplicate
    if (tempRoster.some((r) => r.nama === member.nama && r.source === 'Alumni')) {
      alert('Alumni ini sudah ada dalam daftar keberangkatan');
      return;
    }

    const newItem: CompetitionRoster = {
      nama: member.nama,
      kelas: member.kelas,
      alat: member.alat,
      source: 'Alumni',
      has_attended: false,
    };

    setTempRoster([...tempRoster, newItem]);
    setSelectedAlumniId('');
  };

  const addManualToRoster = () => {
    const trimmedNama = manualNama.trim();
    const trimmedAlat = manualAlat.trim();
    if (!trimmedNama || !trimmedAlat) {
      alert('Nama dan Alat wajib diisi untuk penambahan manual');
      return;
    }

    // Check duplicate
    if (tempRoster.some((r) => r.nama === trimmedNama && r.source === 'Manual')) {
      alert('Nama ini sudah ada dalam daftar keberangkatan manual');
      return;
    }

    const newItem: CompetitionRoster = {
      nama: trimmedNama,
      kelas: manualKelas.trim() || undefined,
      alat: trimmedAlat,
      source: 'Manual',
      has_attended: false,
    };

    setTempRoster([...tempRoster, newItem]);
    setManualNama('');
    setManualKelas('');
    setManualAlat('');
  };

  const removeFromRoster = (index: number) => {
    const updated = [...tempRoster];
    updated.splice(index, 1);
    setTempRoster(updated);
  };

  const handleStartSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const trimmedTitle = newTitle.trim();
    if (!trimmedTitle) {
      setErrorMsg('Nama Lomba wajib diisi');
      return;
    }

    if (tempRoster.length === 0) {
      setErrorMsg('Daftar anggota yang berangkat lomba tidak boleh kosong');
      return;
    }

    setIsSubmitting(true);
    try {
      const newSess = await api.post<CompetitionSession>('/api/competition-sessions', {
        title: trimmedTitle,
        roster: tempRoster,
      });

      setNewTitle('');
      setTempRoster([]);
      await fetchSessions();
      handleSelectSession(newSess.id);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal memulai sesi presensi lomba');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseSession = async (id: number) => {
    if (!window.confirm('Tutup sesi presensi lomba ini? Anggota tidak akan bisa scan QR lagi.')) return;

    setErrorMsg(null);
    try {
      await api.put(`/api/competition-sessions/${id}/close`, {});
      stopPolling();
      await fetchSessions();
      handleSelectSession(id);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menutup sesi presensi lomba');
    }
  };

  const activeMembersOptions = allMembers.filter(
    (m) => m.status === 'Aktif' && !tempRoster.some((tr) => tr.nama === m.nama && tr.source === 'Aktif')
  );

  const alumniMembersOptions = allMembers.filter(
    (m) => m.status === 'Alumni' && !tempRoster.some((tr) => tr.nama === m.nama && tr.source === 'Alumni')
  );

  const qrImageUrl = selectedSessionData?.session.token
    ? `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(presenceUrl)}`
    : '';

  return (
    <div className="container" style={{ padding: '2rem 1rem' }}>
      {/* Header Panel */}
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
          Presensi Keberangkatan Lomba
        </h1>
        <p style={{ color: 'var(--text-secondary)', margin: '0.5rem 0 0 0' }}>
          Kelola data keberangkatan lomba marching band, generate QR Code presensi, pantau check-in, dan dapatkan peringatan kelengkapan tim.
        </p>
      </div>

      {errorMsg && (
        <div
          className="glass"
          style={{
            padding: '1rem 1.5rem',
            borderRadius: 'var(--radius-md)',
            background: 'var(--danger-light)',
            color: 'var(--danger)',
            marginBottom: '1.5rem',
          }}
        >
          ⚠️ {errorMsg}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem', alignItems: 'start' }}>
        
        {/* Left Column: Create Roster & History */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Create New Session Card */}
          <div className="glass" style={{ padding: '2rem', borderRadius: 'var(--radius-md)' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.25rem', fontFamily: 'var(--font-display)' }}>
              🎯 Mulai Presensi Lomba Baru
            </h2>
            
            <form onSubmit={handleStartSession} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                  Nama Event / Lomba
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: GPMB (Grand Prix Marching Band) 2026"
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

              {/* Roster Builder section */}
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>
                  👥 Roster Keberangkatan
                </h3>

                {/* Select Active Member */}
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem', color: 'var(--text-secondary)' }}>
                    Pilih Anggota Aktif
                  </label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <select
                      value={selectedMemberId}
                      onChange={(e) => setSelectedMemberId(e.target.value)}
                      style={{
                        flex: 1,
                        padding: '0.5rem',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border-color)',
                        background: 'var(--bg-primary)',
                        color: 'var(--text-primary)',
                        fontSize: '0.875rem',
                      }}
                    >
                      <option value="">-- Pilih Anggota Aktif --</option>
                      {activeMembersOptions.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.nama} ({m.alat})
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={addActiveToRoster}
                      className="btn btn-outline"
                      style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}
                      disabled={!selectedMemberId}
                    >
                      ➕ Tambah
                    </button>
                  </div>
                </div>

                {/* Select Alumni */}
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem', color: 'var(--text-secondary)' }}>
                    Pilih Alumni
                  </label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <select
                      value={selectedAlumniId}
                      onChange={(e) => setSelectedAlumniId(e.target.value)}
                      style={{
                        flex: 1,
                        padding: '0.5rem',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border-color)',
                        background: 'var(--bg-primary)',
                        color: 'var(--text-primary)',
                        fontSize: '0.875rem',
                      }}
                    >
                      <option value="">-- Pilih Alumni --</option>
                      {alumniMembersOptions.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.nama} ({m.alat})
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={addAlumniToRoster}
                      className="btn btn-outline"
                      style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}
                      disabled={!selectedAlumniId}
                    >
                      ➕ Tambah
                    </button>
                  </div>
                </div>

                {/* Add Manual Form */}
                <div style={{ background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1rem' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
                    ✍️ Input Manual Anggota Tambahan
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <input
                      type="text"
                      placeholder="Nama Lengkap"
                      value={manualNama}
                      onChange={(e) => setManualNama(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.4rem 0.5rem',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border-color)',
                        background: 'var(--bg-primary)',
                        color: 'var(--text-primary)',
                        fontSize: '0.85rem',
                      }}
                    />
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input
                        type="text"
                        placeholder="Kelas (opsional)"
                        value={manualKelas}
                        onChange={(e) => setManualKelas(e.target.value)}
                        style={{
                          flex: 1,
                          padding: '0.4rem 0.5rem',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border-color)',
                          background: 'var(--bg-primary)',
                          color: 'var(--text-primary)',
                          fontSize: '0.85rem',
                        }}
                      />
                      <input
                        type="text"
                        placeholder="Alat / Seksi"
                        value={manualAlat}
                        onChange={(e) => setManualAlat(e.target.value)}
                        style={{
                          flex: 2,
                          padding: '0.4rem 0.5rem',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border-color)',
                          background: 'var(--bg-primary)',
                          color: 'var(--text-primary)',
                          fontSize: '0.85rem',
                        }}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={addManualToRoster}
                      className="btn btn-outline"
                      style={{ padding: '0.4rem 0.5rem', fontSize: '0.85rem', width: '100%' }}
                    >
                      ➕ Tambah Keberangkatan Manual
                    </button>
                  </div>
                </div>

                {/* Compiled Roster List */}
                <div style={{ marginTop: '1rem' }}>
                  <span style={{ fontSize: '0.875rem', fontWeight: 700, display: 'block', marginBottom: '0.5rem' }}>
                    Daftar Keberangkatan ({tempRoster.length} Orang)
                  </span>
                  
                  {tempRoster.length === 0 ? (
                    <div style={{ padding: '1rem', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-sm)', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                      Roster belum disusun. Pilih dari list di atas atau input manual.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--border-color)', padding: '0.5rem', borderRadius: 'var(--radius-sm)', background: 'var(--bg-primary)' }}>
                      {tempRoster.map((item, index) => (
                        <div
                          key={index}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '0.35rem 0.5rem',
                            background: 'var(--bg-secondary)',
                            borderRadius: '4px',
                            fontSize: '0.8rem',
                          }}
                        >
                          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: '0.5rem' }}>
                            <strong style={{ color: 'var(--text-primary)' }}>{item.nama}</strong>
                            <span style={{ color: 'var(--text-secondary)', marginLeft: '0.35rem' }}>({item.alat})</span>
                            <span
                              style={{
                                display: 'inline-block',
                                marginLeft: '0.5rem',
                                fontSize: '0.65rem',
                                fontWeight: 700,
                                padding: '0.1rem 0.35rem',
                                borderRadius: '4px',
                                background:
                                  item.source === 'Aktif'
                                    ? 'rgba(59, 130, 246, 0.15)'
                                    : item.source === 'Alumni'
                                    ? 'rgba(139, 92, 246, 0.15)'
                                    : 'rgba(245, 158, 11, 0.15)',
                                color:
                                  item.source === 'Aktif'
                                    ? '#3b82f6'
                                    : item.source === 'Alumni'
                                    ? '#8b5cf6'
                                    : '#f59e0b',
                              }}
                            >
                              {item.source}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFromRoster(index)}
                            style={{
                              border: 'none',
                              background: 'none',
                              color: 'var(--danger)',
                              cursor: 'pointer',
                              fontWeight: 'bold',
                              fontSize: '0.875rem',
                              padding: '0 0.25rem',
                            }}
                            title="Hapus"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', marginTop: '0.5rem' }}
                disabled={isSubmitting || tempRoster.length === 0}
              >
                {isSubmitting ? 'Memproses...' : '🚀 Mulai Sesi Lomba & QR'}
              </button>
            </form>
          </div>

          {/* Sessions List */}
          <div className="glass" style={{ padding: '2rem', borderRadius: 'var(--radius-md)' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.25rem', fontFamily: 'var(--font-display)' }}>
              📜 Riwayat Presensi Lomba
            </h2>
            
            {isLoadingList ? (
              <div style={{ padding: '2rem 0', textAlign: 'center', color: 'var(--text-secondary)' }}>Memuat riwayat lomba...</div>
            ) : sessions.length === 0 ? (
              <div style={{ padding: '2rem 0', textAlign: 'center', color: 'var(--text-secondary)' }}>Belum ada sesi presensi lomba.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '350px', overflowY: 'auto', paddingRight: '0.25rem' }}>
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
                      <strong style={{ fontSize: '1rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }}>
                        {sess.title}
                      </strong>
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

        {/* Right Column: Live Statistics, Warnings, QR Code, and Detailed Attendance List */}
        <div>
          {isLoadingDetail ? (
            <div className="glass" style={{ padding: '4rem', textAlign: 'center', borderRadius: 'var(--radius-md)' }}>
              <div className="spinner"></div>
              <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>Memuat detail sesi...</p>
            </div>
          ) : selectedSessionData ? (
            <div className="glass" style={{ padding: '2rem', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              {/* Session Title and Controls */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
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
                    Sesi Lomba {selectedSessionData.session.is_active ? 'Aktif' : 'Selesai'}
                  </span>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>{selectedSessionData.session.title}</h2>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>
                    Mulai: {new Date(selectedSessionData.session.created_at).toLocaleString('id-ID')}
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
                </div>
              </div>

              {/* Attendance Statistics Visualizer */}
              <div style={{ background: 'var(--bg-tertiary)', padding: '1.25rem', borderRadius: 'var(--radius-md)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Progres Check-in Tim</span>
                  <strong style={{ fontSize: '1.15rem' }}>
                    {selectedSessionData.attended_count} / {selectedSessionData.total_count} ({Math.round((selectedSessionData.attended_count / selectedSessionData.total_count) * 100)}%)
                  </strong>
                </div>

                {/* Progress bar */}
                <div style={{ width: '100%', height: '10px', background: 'var(--border-color)', borderRadius: 'var(--radius-full)', overflow: 'hidden', marginBottom: '0.5rem' }}>
                  <div
                    style={{
                      width: `${(selectedSessionData.attended_count / selectedSessionData.total_count) * 100}%`,
                      height: '100%',
                      background: selectedSessionData.is_complete ? 'var(--success)' : 'var(--primary)',
                      transition: 'width 0.4s ease-out',
                    }}
                  ></div>
                </div>
              </div>

              {/* INCOMPLETENESS WARNING (CRITICAL REQUIREMENT) */}
              {!selectedSessionData.is_complete ? (
                <div
                  className="glass animate-pulse-border"
                  style={{
                    padding: '1rem 1.25rem',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(239, 68, 68, 0.08)',
                    border: '1.5px solid var(--danger)',
                    color: 'var(--danger)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                  }}
                >
                  <span style={{ fontSize: '1.5rem' }}>⚠️</span>
                  <div>
                    <strong style={{ display: 'block', fontSize: '0.9rem' }}>Presensi Lomba Belum Lengkap!</strong>
                    <span style={{ fontSize: '0.825rem', color: 'var(--text-primary)', opacity: 0.85 }}>
                      Masih ada <strong>{selectedSessionData.total_count - selectedSessionData.attended_count} orang</strong> dalam roster yang belum melakukan scan QR presensi keberangkatan.
                    </span>
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    padding: '1rem 1.25rem',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(16, 185, 129, 0.08)',
                    border: '1.5px solid var(--success)',
                    color: 'var(--success)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                  }}
                >
                  <span style={{ fontSize: '1.5rem' }}>✓</span>
                  <div>
                    <strong style={{ display: 'block', fontSize: '0.9rem' }}>Semua Anggota Roster Hadir</strong>
                    <span style={{ fontSize: '0.825rem', color: 'var(--text-primary)', opacity: 0.85 }}>
                      Seluruh <strong>{selectedSessionData.total_count} orang</strong> dalam roster telah berhasil melakukan presensi keberangkatan. Tim lengkap!
                    </span>
                  </div>
                </div>
              )}

              {/* QR Code Presentation */}
              {selectedSessionData.session.is_active ? (
                <div
                  style={{
                    background: 'var(--bg-tertiary)',
                    padding: '1.25rem',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '1rem',
                  }}
                >
                  <strong style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>Scan QR Keberangkatan Lomba</strong>
                  <div style={{ background: '#ffffff', padding: '0.75rem', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-sm)' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={qrImageUrl}
                      alt="QR Code Presensi Sesi Lomba"
                      style={{ width: '180px', height: '180px', display: 'block' }}
                    />
                  </div>
                  
                  <div style={{ width: '100%', textAlign: 'center', fontSize: '0.85rem' }}>
                    <div style={{ color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Atau bagikan tautan ini ke grup:</div>
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
                    style={{ padding: '0.35rem 0.85rem', fontSize: '0.8rem', background: '#ffffff' }}
                  >
                    🖨️ Cetak / Buka Gambar QR
                  </button>
                </div>
              ) : (
                <div style={{ padding: '1.25rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                  🔒 Sesi presensi ini telah ditutup. QR Code dinonaktifkan.
                </div>
              )}

              {/* Roster Detailed Grid */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
                    📋 Kepesertaan & Status Kehadiran
                  </h3>
                  {selectedSessionData.session.is_active && (
                    <span style={{ fontSize: '0.7rem', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                      <span className="pulse-dot"></span> Live updates...
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '350px', overflowY: 'auto' }}>
                  {selectedSessionData.session.roster?.map((r) => (
                    <div
                      key={r.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '0.75rem 1rem',
                        background: r.has_attended ? 'rgba(16, 185, 129, 0.03)' : 'rgba(239, 68, 68, 0.03)',
                        border: `1px solid ${r.has_attended ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)'}`,
                        borderRadius: 'var(--radius-sm)',
                        transition: 'background var(--transition-fast)',
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <strong style={{ color: 'var(--text-primary)', fontSize: '0.925rem' }}>{r.nama}</strong>
                          <span
                            style={{
                              fontSize: '0.625rem',
                              fontWeight: 700,
                              padding: '0.05rem 0.3rem',
                              borderRadius: '4px',
                              background:
                                r.source === 'Aktif'
                                  ? 'rgba(59, 130, 246, 0.1)'
                                  : r.source === 'Alumni'
                                  ? 'rgba(139, 92, 246, 0.1)'
                                  : 'rgba(245, 158, 11, 0.1)',
                              color:
                                r.source === 'Aktif'
                                  ? '#3b82f6'
                                  : r.source === 'Alumni'
                                  ? '#8b5cf6'
                                  : '#f59e0b',
                            }}
                          >
                            {r.source}
                          </span>
                        </div>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          Alat: {r.alat} {r.kelas ? `| Kelas: ${r.kelas}` : ''}
                        </span>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <span
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            padding: '0.2rem 0.5rem',
                            borderRadius: '4px',
                            background: r.has_attended ? 'var(--success-light)' : 'var(--danger-light)',
                            color: r.has_attended ? 'var(--success)' : 'var(--danger)',
                            display: 'inline-block',
                          }}
                        >
                          {r.has_attended ? '✓ Hadir' : '❌ Belum'}
                        </span>
                        {r.has_attended && r.attended_at && (
                          <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-tertiary)', marginTop: '0.25rem' }}>
                            🕒 {new Date(r.attended_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          ) : (
            <div className="glass" style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-secondary)', borderRadius: 'var(--radius-md)' }}>
              👈 Pilih sesi presensi lomba dari daftar atau buat sesi baru untuk memantau keberangkatan.
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
        @keyframes pulse-border-danger {
          0% {
            border-color: var(--danger);
            box-shadow: 0 0 0 0px rgba(239, 68, 68, 0.3);
          }
          70% {
            border-color: rgba(239, 68, 68, 0.8);
            box-shadow: 0 0 0 6px rgba(239, 68, 68, 0);
          }
          100% {
            border-color: var(--danger);
            box-shadow: 0 0 0 0px rgba(239, 68, 68, 0);
          }
        }
        .animate-pulse-border {
          animation: pulse-border-danger 2s infinite ease-in-out;
        }
      `}</style>
    </div>
  );
}
