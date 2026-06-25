'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '../utils/api';
import { Agenda, OrgStructure } from '../types';

export default function MainDashboard() {
  const [agendas, setAgendas] = useState<Agenda[]>([]);
  const [org, setOrg] = useState<OrgStructure | null>(null);
  
  const [isLoadingAgendas, setIsLoadingActive] = useState(true);
  const [isLoadingOrg, setIsLoadingOrg] = useState(true);
  
  const [isAdmin, setIsAdmin] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Mobile toggle for Org Structure dropdown
  const [isMobileOrgOpen, setIsMobileOrgOpen] = useState(false);

  // Agenda Form States (Admin Only)
  const [isAgendaModalOpen, setIsAgendaModalOpen] = useState(false);
  const [selectedAgenda, setSelectedAgenda] = useState<Agenda | null>(null);
  const [judul, setJudul] = useState('');
  const [jenis, setJenis] = useState('Latihan');
  const [tanggal, setTanggal] = useState('');
  const [tempat, setTempat] = useState('');
  const [keterangan, setKeterangan] = useState('');
  const [isSubmittingAgenda, setIsSubmittingAgenda] = useState(false);



  useEffect(() => {
    // Check if current user is Admin
    const role = localStorage.getItem('mbdb_role');
    const token = localStorage.getItem('mbdb_token');
    setIsAdmin(!!token && role === 'Admin');

    fetchAgendas();
    fetchOrgStructure();
  }, []);

  const fetchAgendas = async () => {
    setIsLoadingActive(true);
    try {
      const data = await api.get<Agenda[]>('/api/agendas');
      setAgendas(data);
    } catch (err: any) {
      console.error('Gagal mengambil data agenda:', err);
    } finally {
      setIsLoadingActive(false);
    }
  };

  const fetchOrgStructure = async () => {
    setIsLoadingOrg(true);
    try {
      const data = await api.get<OrgStructure>('/api/org-structure');
      setOrg(data);
    } catch (err) {
      console.error('Gagal mengambil struktur organisasi:', err);
    } finally {
      setIsLoadingOrg(false);
    }
  };

  const handleOpenAgendaModal = (agenda: Agenda | null = null) => {
    setSelectedAgenda(agenda);
    if (agenda) {
      setJudul(agenda.judul);
      setJenis(agenda.jenis);
      // Convert backend timestamp to datetime-local format "YYYY-MM-DDThh:mm"
      const date = new Date(agenda.tanggal);
      const formattedDate = date.toISOString().slice(0, 16);
      setTanggal(formattedDate);
      setTempat(agenda.tempat);
      setKeterangan(agenda.keterangan || '');
    } else {
      setJudul('');
      setJenis('Latihan');
      setTanggal('');
      setTempat('');
      setKeterangan('');
    }
    setIsAgendaModalOpen(true);
  };

  const handleSaveAgenda = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingAgenda(true);
    setErrorMsg(null);

    const payload = {
      judul,
      jenis,
      tanggal: new Date(tanggal).toISOString(), // Format to RFC3339
      tempat,
      keterangan,
    };

    try {
      if (selectedAgenda) {
        await api.put(`/api/agendas/${selectedAgenda.id}`, payload);
      } else {
        await api.post('/api/agendas', payload);
      }
      setIsAgendaModalOpen(false);
      fetchAgendas();
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menyimpan agenda.');
    } finally {
      setIsSubmittingAgenda(false);
    }
  };

  const handleDeleteAgenda = async (id: number) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus agenda ini?')) return;
    try {
      await api.delete(`/api/agendas/${id}`);
      fetchAgendas();
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus agenda.');
    }
  };



  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getAgendaBadgeStyle = (type: string) => {
    switch (type) {
      case 'Lomba':
        return { backgroundColor: 'var(--primary-light)', color: 'var(--primary)', border: '1px solid rgba(211, 47, 47, 0.2)' };
      case 'Penampilan':
        return { backgroundColor: 'var(--accent-light)', color: 'var(--accent)', border: '1px solid rgba(245, 166, 35, 0.2)' };
      default: // Latihan
        return { backgroundColor: 'var(--success-light)', color: 'var(--success)', border: '1px solid rgba(46, 125, 50, 0.2)' };
    }
  };

  return (
    <div style={{ padding: '3rem 0', minHeight: '80vh' }}>
      <div className="container">
        {/* Welcome Banner */}
        <div
          className="card glass animate-fade-in"
          style={{
            padding: '3rem 2rem',
            marginBottom: '3rem',
            textAlign: 'center',
            background: 'linear-gradient(135deg, rgba(211, 47, 47, 0.08) 0%, rgba(245, 166, 35, 0.08) 100%)',
            border: '1px solid var(--border-color)',
            boxShadow: 'var(--shadow-lg)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          <img
            src="/logo.png"
            alt="Logo MBDB"
            style={{ width: '100px', height: '100px', borderRadius: '50%', border: '3px solid var(--accent)', boxShadow: 'var(--shadow-gold)', marginBottom: '0.5rem' }}
          />
          <h1
            style={{
              fontSize: '2.5rem',
              fontWeight: 800,
              fontFamily: 'var(--font-display)',
              background: 'linear-gradient(135deg, var(--text-primary) 0%, var(--primary) 50%, var(--accent) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Portal MBDB Smansaagung
          </h1>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '650px', margin: '0 auto', fontSize: '1.05rem', lineHeight: 1.6 }}>
            Selamat datang di Portal Resmi Marching Band & Drumband SMA Negeri 1 Kayuagung. 
            Ikuti agenda latihan, jadwal lomba, penampilan kami, atau bergabunglah menjadi anggota baru.
          </p>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <Link href="/pendaftaran" className="btn btn-accent">
              ✍️ Daftar Anggota Baru
            </Link>
            <a href="#agendas-section" className="btn btn-secondary">
              📅 Lihat Agenda Kegiatan
            </a>
          </div>
        </div>

        {/* Sidebar/Dropdown Mobile Toggle */}
        <div style={{ display: 'block', marginBottom: '1.5rem' }} className="mobile-org-toggle">
          <button
            onClick={() => setIsMobileOrgOpen(!isMobileOrgOpen)}
            className="btn btn-secondary"
            style={{ width: '100%', justifyContent: 'space-between', border: '1px solid var(--border-color)' }}
          >
            <span>{isMobileOrgOpen ? '✕ Tutup' : '👥 Lihat'} Struktur Organisasi MBDB</span>
            <span>{isMobileOrgOpen ? '▲' : '▼'}</span>
          </button>

          {isMobileOrgOpen && (
            <div className="card glass animate-slide-up" style={{ marginTop: '0.5rem', padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--accent)' }}>Struktur Organisasi</h3>
                {isAdmin && (
                  <Link href="/organisasi" className="btn btn-outline" style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem' }}>
                    Kelola
                  </Link>
                )}
              </div>
              {renderOrgTree(org)}
            </div>
          )}
        </div>

        {/* Main Content Layout (Split Screen on Desktop) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '3rem' }} className="dashboard-grid">
          
          {/* Main Content: Agendas Section */}
          <div id="agendas-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 800, borderLeft: '4px solid var(--primary)', paddingLeft: '0.75rem' }}>
                📅 Agenda Kegiatan MBDB
              </h2>
              {isAdmin && (
                <button onClick={() => handleOpenAgendaModal(null)} className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>
                  + Tambah Agenda
                </button>
              )}
            </div>

            {isLoadingAgendas ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem 0' }}>
                <svg style={{ animation: 'spin 1s linear infinite' }} width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="3">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
              </div>
            ) : agendas.length === 0 ? (
              <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                Belum ada agenda terdaftar saat ini. Hubungi Admin untuk memperbarui jadwal.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {agendas.map((agenda) => (
                  <div key={agenda.id} className="card animate-fade-in" style={{ padding: '1.5rem', display: 'flex', gap: '1rem', flexDirection: 'column' }}>
                    
                    {/* Left side: Date Badge */}
                    <div
                      style={{
                        width: '80px',
                        height: '80px',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: 'var(--bg-tertiary)',
                        border: '1px solid var(--border-color)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase' }}>
                        {new Date(agenda.tanggal).toLocaleDateString('id-ID', { month: 'short' })}
                      </span>
                      <span style={{ fontSize: '1.75rem', fontWeight: 800, lineHeight: 1.1, color: 'var(--text-primary)' }}>
                        {new Date(agenda.tanggal).getDate()}
                      </span>
                    </div>

                    {/* Middle: Content info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.4rem' }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-sm)', ...getAgendaBadgeStyle(agenda.jenis) }}>
                          {agenda.jenis.toUpperCase()}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          🕒 {formatTime(agenda.tanggal)} WIB
                        </span>
                      </div>

                      <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '0.25rem' }}>{agenda.judul}</h3>
                      <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                        📍 Tempat: <strong>{agenda.tempat}</strong>
                      </p>
                      {agenda.keterangan && (
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                          {agenda.keterangan}
                        </p>
                      )}
                    </div>

                    {/* Right side: Admin Action Buttons */}
                    {isAdmin && (
                      <div className="agenda-actions" style={{ display: 'flex', flexDirection: 'row', gap: '0.5rem', alignSelf: 'flex-start' }}>
                        <button
                          onClick={() => handleOpenAgendaModal(agenda)}
                          className="btn btn-outline"
                          style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                        >
                          Ubah
                        </button>
                        <button
                          onClick={() => handleDeleteAgenda(agenda.id)}
                          className="btn btn-secondary"
                          style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', color: 'var(--danger)' }}
                        >
                          Hapus
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right side: Org Structure (Desktop Sidebar) */}
          <div style={{ display: 'none' }} className="desktop-org-sidebar">
            <div style={{ position: 'sticky', top: '100px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800, borderLeft: '4px solid var(--accent)', paddingLeft: '0.75rem' }}>
                  👥 Struktur Organisasi
                </h2>
                {isAdmin && (
                  <Link href="/organisasi" className="btn btn-outline" style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}>
                    Kelola
                  </Link>
                )}
              </div>

              {isLoadingOrg ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem 0' }}>
                  <svg style={{ animation: 'spin 1s linear infinite' }} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="3">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                </div>
              ) : (
                <div className="card glass" style={{ padding: '1.75rem' }}>
                  {renderOrgTree(org)}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* AGENDA ADD/EDIT MODAL (Admin Only) */}
      {isAgendaModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(11, 15, 25, 0.8)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
            animation: 'fadeIn 0.2s ease-out',
          }}
        >
          <div className="card glass" style={{ width: '100%', maxWidth: '500px', padding: '2.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>
                {selectedAgenda ? 'Ubah Agenda' : 'Tambah Agenda Baru'}
              </h2>
              <button
                onClick={() => setIsAgendaModalOpen(false)}
                style={{ fontSize: '1.5rem', color: 'var(--text-secondary)', cursor: 'pointer', lineHeight: 1 }}
              >
                &times;
              </button>
            </div>

            {errorMsg && (
              <div
                style={{
                  padding: '0.75rem',
                  backgroundColor: 'var(--danger-light)',
                  color: 'var(--danger)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.825rem',
                  marginBottom: '1rem',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                }}
              >
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSaveAgenda} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="form-group">
                <label className="form-label">Judul Agenda</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Contoh: Lomba GPMB 2026"
                  value={judul}
                  onChange={(e) => setJudul(e.target.value)}
                  required
                  disabled={isSubmittingAgenda}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Jenis Kegiatan</label>
                  <select
                    className="form-input"
                    value={jenis}
                    onChange={(e) => setJenis(e.target.value)}
                    required
                    disabled={isSubmittingAgenda}
                  >
                    <option value="Latihan">Latihan</option>
                    <option value="Penampilan">Penampilan</option>
                    <option value="Lomba">Lomba</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Tanggal & Jam</label>
                  <input
                    type="datetime-local"
                    className="form-input"
                    value={tanggal}
                    onChange={(e) => setTanggal(e.target.value)}
                    required
                    disabled={isSubmittingAgenda}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Tempat / Lokasi</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Contoh: Stadion Kayuagung"
                  value={tempat}
                  onChange={(e) => setTempat(e.target.value)}
                  required
                  disabled={isSubmittingAgenda}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Keterangan Tambahan (Opsional)</label>
                <textarea
                  className="form-input"
                  placeholder="Bawa seragam latihan, air minum, dll..."
                  value={keterangan}
                  onChange={(e) => setKeterangan(e.target.value)}
                  style={{ minHeight: '80px', resize: 'vertical' }}
                  disabled={isSubmittingAgenda}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="submit" className="btn btn-accent" style={{ flex: 1 }} disabled={isSubmittingAgenda}>
                  {isSubmittingAgenda ? 'Menyimpan...' : 'Simpan Agenda'}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsAgendaModalOpen(false)}
                  style={{ flex: 1 }}
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}



      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @media (min-width: 1024px) {
          .dashboard-grid {
            grid-template-columns: 2fr 1fr !important;
          }
          .mobile-org-toggle {
            display: none !important;
          }
          .desktop-org-sidebar {
            display: block !important;
          }
        }
        @media (min-width: 640px) {
          .card {
            flex-direction: row;
          }
          .agenda-actions {
            flex-direction: column !important;
            align-self: center !important;
          }
        }
      `}</style>
    </div>
  );
}

// Render Organization Tree helper function
function renderOrgTree(org: OrgStructure | null) {
  if (!org) return <div style={{ color: 'var(--text-secondary)' }}>Struktur Organisasi Kosong</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', alignItems: 'center', width: '100%' }}>
      
      {/* Ketua Card */}
      <div
        style={{
          padding: '0.75rem 1.25rem',
          backgroundColor: 'var(--primary-light)',
          border: '2px solid var(--primary)',
          borderRadius: 'var(--radius-md)',
          textAlign: 'center',
          boxShadow: 'var(--shadow-sm)',
          width: '85%',
        }}
      >
        <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--primary)', letterSpacing: '0.05em' }}>KETUA UMUM</div>
        <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{org.ketua_nama}</div>
      </div>

      {/* Connecting line */}
      <div style={{ width: '2px', height: '15px', backgroundColor: 'var(--border-color)' }} />

      {/* Wakil Ketua Side-by-Side Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', width: '100%' }}>
        <div
          style={{
            padding: '0.6rem 0.8rem',
            backgroundColor: 'var(--bg-tertiary)',
            border: '1.5px solid var(--border-color)',
            borderTop: '3px solid var(--accent)',
            borderRadius: 'var(--radius-md)',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-secondary)' }}>WAKIL KETUA 1</div>
          <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{org.waka1_nama}</div>
        </div>

        <div
          style={{
            padding: '0.6rem 0.8rem',
            backgroundColor: 'var(--bg-tertiary)',
            border: '1.5px solid var(--border-color)',
            borderTop: '3px solid var(--accent)',
            borderRadius: 'var(--radius-md)',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-secondary)' }}>WAKIL KETUA 2</div>
          <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{org.waka2_nama}</div>
        </div>
      </div>

      {/* Connecting lines */}
      <div style={{ display: 'flex', justifyContent: 'space-around', width: '100%', height: '15px' }}>
        <div style={{ width: '2px', height: '100%', backgroundColor: 'var(--border-color)' }} />
        <div style={{ width: '2px', height: '100%', backgroundColor: 'var(--border-color)' }} />
      </div>

      {/* Sekretaris & Bendahara */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', width: '100%' }}>
        <div
          style={{
            padding: '0.6rem 0.8rem',
            backgroundColor: 'var(--bg-tertiary)',
            border: '1.5px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-secondary)' }}>SEKRETARIS</div>
          <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{org.sekretaris_nama}</div>
        </div>

        <div
          style={{
            padding: '0.6rem 0.8rem',
            backgroundColor: 'var(--bg-tertiary)',
            border: '1.5px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-secondary)' }}>BENDAHARA</div>
          <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{org.bendahara_nama}</div>
        </div>
      </div>

      {/* View full link */}
      <Link
        href="/organisasi"
        className="btn btn-outline"
        style={{
          marginTop: '1rem',
          width: '100%',
          fontSize: '0.8rem',
          padding: '0.5rem',
          textAlign: 'center',
          display: 'block',
        }}
      >
        👁 Lihat Detail & Foto Pengurus
      </Link>

    </div>
  );
}
