'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, APIError } from '../../utils/api';
import { Applicant } from '../../types';

export default function AdminDashboard() {
  const router = useRouter();
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Photo modal preview
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string | null>(null);

  // Instrument selection modal for acceptance
  const [acceptanceModalApp, setAcceptanceModalApp] = useState<Applicant | null>(null);
  const [selectedInstrument, setSelectedInstrument] = useState<string>('');
  const [customInstrument, setCustomInstrument] = useState<string>('');

  useEffect(() => {
    // Admin role guard
    const token = localStorage.getItem('mbdb_token');
    const role = localStorage.getItem('mbdb_role');
    if (!token || role !== 'Admin') {
      router.push('/login');
      return;
    }

    fetchApplicants();
  }, [router, filterStatus]);

  const fetchApplicants = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const path = filterStatus ? `/api/applicants?status=${filterStatus}` : '/api/applicants';
      const data = await api.get<Applicant[]>(path);
      setApplicants(data);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal mengambil data pendaftar.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStatus = async (id: number, newStatus: 'Accepted' | 'Rejected' | 'Pending') => {
    setErrorMsg(null);
    try {
      await api.put(`/api/applicants/${id}/status`, { status: newStatus });
      // Update local state to avoid refetching entire list
      setApplicants((prev) =>
        prev.map((app) => (app.id === id ? { ...app, status: newStatus, alat_diterima: '' } : app))
      );
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal mengubah status pendaftar.');
    }
  };

  const handleConfirmAcceptance = async () => {
    if (!acceptanceModalApp) return;
    const finalInstrument = selectedInstrument === 'custom' ? customInstrument : selectedInstrument;
    
    if (!finalInstrument.trim()) {
      alert('Silakan pilih atau ketik nama alat.');
      return;
    }
    
    setErrorMsg(null);
    try {
      const response = await api.put<any>(`/api/applicants/${acceptanceModalApp.id}/status`, {
        status: 'Accepted',
        alat_diterima: finalInstrument.trim(),
      });
      
      const returnedApp = response?.applicant || {};
      
      // Update local state
      setApplicants((prev) =>
        prev.map((app) =>
          app.id === acceptanceModalApp.id
            ? { ...app, status: 'Accepted', alat_diterima: returnedApp.alat_diterima || finalInstrument.trim() }
            : app
        )
      );
      setAcceptanceModalApp(null);
      setSelectedInstrument('');
      setCustomInstrument('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menerima calon anggota.');
    }
  };

  const handleDeleteApplicant = async (id: number) => {
    if (!confirm('Apakah Anda yakin ingin menghapus data pendaftar ini secara permanen?')) return;
    setErrorMsg(null);
    try {
      await api.delete(`/api/applicants/${id}`);
      // Remove from local list
      setApplicants((prev) => prev.filter((app) => app.id !== id));
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menghapus data pendaftar.');
    }
  };

  const handleExportCSV = async () => {
    setErrorMsg(null);
    try {
      // Trigger file download using window.location.href or fetch blob
      // Since it requires headers, let's fetch it as a blob
      const token = localStorage.getItem('mbdb_token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/applicants/export`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Gagal mengekspor CSV dari server.');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pendaftar_mbdb_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal mengekspor CSV.');
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'Accepted':
        return {
          backgroundColor: 'var(--success-light)',
          color: 'var(--success)',
          border: '1px solid rgba(16, 185, 129, 0.2)',
        };
      case 'Rejected':
        return {
          backgroundColor: 'var(--danger-light)',
          color: 'var(--danger)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
        };
      default:
        return {
          backgroundColor: 'var(--warning-light)',
          color: 'var(--warning)',
          border: '1px solid rgba(245, 158, 11, 0.2)',
        };
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'Accepted':
        return 'Diterima';
      case 'Rejected':
        return 'Ditolak';
      default:
        return 'Pending';
    }
  };

  return (
    <div style={{ padding: '3rem 0', minHeight: '80vh' }}>
      <div className="container">
        {/* Header Section */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            marginBottom: '2.5rem',
          }}
          className="admin-header"
        >
          <div>
            <h1 style={{ fontSize: '2.25rem', fontWeight: 800, marginBottom: '0.5rem' }}>
              Panel Kelola Pendaftar
            </h1>
            <p style={{ color: 'var(--text-secondary)' }}>
              Tinjau, terima, atau tolak pendaftaran anggota baru MBDB Smansaagung.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <button onClick={handleExportCSV} className="btn btn-accent">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '0.25rem' }}>
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Ekspor CSV (.csv)
            </button>
          </div>
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

        {/* Filters */}
        <div
          className="card glass"
          style={{
            padding: '1.25rem 2rem',
            marginBottom: '2rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1.5rem',
            flexWrap: 'wrap',
          }}
        >
          <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            Saring Status:
          </span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {[
              { label: 'Semua', value: '' },
              { label: 'Pending', value: 'Pending' },
              { label: 'Diterima', value: 'Accepted' },
              { label: 'Ditolak', value: 'Rejected' },
            ].map((btn) => (
              <button
                key={btn.label}
                onClick={() => setFilterStatus(btn.value)}
                className={`btn ${filterStatus === btn.value ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '0.4rem 1rem', fontSize: '0.875rem', borderRadius: 'var(--radius-full)' }}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>

        {/* List Grid */}
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '5rem 0' }}>
            <svg
              style={{ animation: 'spin 1s linear infinite' }}
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--accent)"
              strokeWidth="3"
            >
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
          </div>
        ) : applicants.length === 0 ? (
          <div
            className="card"
            style={{
              textAlign: 'center',
              padding: '4rem 2rem',
              color: 'var(--text-secondary)',
            }}
          >
            Tidak ada calon anggota terdaftar dengan kriteria penyaringan ini.
          </div>
        ) : (
          <div className="grid-responsive">
            {applicants.map((app) => (
              <div key={app.id} className="card animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.5rem' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  {/* Photo Thumbnail */}
                  <div
                    onClick={() => setPreviewPhotoUrl(api.getMediaUrl(app.foto_path))}
                    style={{
                      width: '60px',
                      height: '80px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-color)',
                      overflow: 'hidden',
                      backgroundColor: 'var(--bg-tertiary)',
                      flexShrink: 0,
                      cursor: 'zoom-in',
                    }}
                    title="Klik untuk memperbesar pas foto"
                  >
                    <img
                      src={api.getMediaUrl(app.foto_path)}
                      alt={`Foto ${app.nama}`}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => {
                        (e.target as any).src = 'https://placehold.co/60x80/1f2937/ffffff?text=No+Foto';
                      }}
                    />
                  </div>

                  {/* Profile info */}
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {app.nama}
                    </h3>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                      Kelas: <strong>{app.kelas}</strong>
                    </p>
                    <div
                      style={{
                        display: 'inline-block',
                        padding: '0.2rem 0.6rem',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        borderRadius: 'var(--radius-full)',
                        marginTop: '0.4rem',
                        ...getStatusStyle(app.status),
                      }}
                    >
                      {getStatusText(app.status)}
                    </div>
                  </div>
                </div>

                {/* Choices */}
                <div
                  style={{
                    backgroundColor: 'var(--bg-tertiary)',
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.825rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.25rem',
                  }}
                >
                  <div>Option 1: <strong>{app.pilihan1}</strong></div>
                  <div>Option 2: <strong>{app.pilihan2}</strong></div>
                  <div>Option 3: <strong>{app.pilihan3}</strong></div>
                  {app.status === 'Accepted' && app.alat_diterima && (
                    <div style={{ borderTop: '1px solid var(--border-color)', marginTop: '0.5rem', paddingTop: '0.5rem', color: 'var(--success)' }}>
                      Diterima di: <strong>🎺 {app.alat_diterima}</strong>
                    </div>
                  )}
                  {app.kode_pendaftaran && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '0.25rem' }}>
                      Kode: <span style={{ fontFamily: 'monospace' }}>{app.kode_pendaftaran}</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto' }}>
                  {app.status === 'Pending' ? (
                    <>
                      <button
                        onClick={() => {
                          setSelectedInstrument(app.pilihan1 || '');
                          setCustomInstrument('');
                          setAcceptanceModalApp(app);
                        }}
                        className="btn btn-primary"
                        style={{ flex: 2, padding: '0.5rem', fontSize: '0.875rem', backgroundColor: 'var(--success)' }}
                      >
                        ✓ Terima
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(app.id, 'Rejected')}
                        className="btn btn-secondary"
                        style={{ flex: 1.5, padding: '0.5rem', fontSize: '0.875rem', color: 'var(--danger)' }}
                      >
                        ✕ Tolak
                      </button>
                      <button
                        onClick={() => handleDeleteApplicant(app.id)}
                        className="btn btn-secondary"
                        style={{ flex: 1, padding: '0.5rem', fontSize: '0.875rem', color: 'var(--danger)', borderColor: 'var(--danger-light)' }}
                        title="Hapus secara permanen"
                      >
                        🗑️
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => handleUpdateStatus(app.id, 'Pending')}
                        className="btn btn-outline"
                        style={{ flex: 3, padding: '0.4rem', fontSize: '0.825rem' }}
                      >
                        Pulihkan ke Pending
                      </button>
                      <button
                        onClick={() => handleDeleteApplicant(app.id)}
                        className="btn btn-secondary"
                        style={{ flex: 1.5, padding: '0.4rem', fontSize: '0.825rem', color: 'var(--danger)', borderColor: 'var(--danger-light)' }}
                        title="Hapus secara permanen"
                      >
                        🗑️ Hapus
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Full Photo Modal Preview */}
      {previewPhotoUrl && (
        <div
          onClick={() => setPreviewPhotoUrl(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            cursor: 'zoom-out',
            animation: 'fadeIn 0.15s ease-out',
          }}
        >
          <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}>
            <img
              src={previewPhotoUrl}
              alt="Pas Foto Full"
              style={{
                maxWidth: '100%',
                maxHeight: '90vh',
                borderRadius: 'var(--radius-md)',
                boxShadow: '0 0 20px rgba(255, 255, 255, 0.1)',
                objectFit: 'contain',
              }}
            />
          </div>
        </div>
      )}

      {/* Instrument Selection Modal */}
      {acceptanceModalApp && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99,
            padding: '1rem',
          }}
        >
          <div
            className="card glass"
            style={{
              maxWidth: '500px',
              width: '100%',
              padding: '2rem',
              border: '1px solid var(--border-color)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.5rem',
              boxShadow: 'var(--shadow-gold)',
            }}
          >
            <div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem', color: 'var(--accent)' }}>
                Pilih Alat Musik
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Tentukan alat musik penempatan untuk pendaftar <strong>{acceptanceModalApp.nama}</strong>.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Instrument preference options */}
              {[
                { label: `Pilihan 1: ${acceptanceModalApp.pilihan1}`, value: acceptanceModalApp.pilihan1 },
                { label: `Pilihan 2: ${acceptanceModalApp.pilihan2}`, value: acceptanceModalApp.pilihan2 },
                { label: `Pilihan 3: ${acceptanceModalApp.pilihan3}`, value: acceptanceModalApp.pilihan3 },
              ].map((opt) => (
                <label
                  key={opt.value}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--bg-tertiary)',
                    border: `1px solid ${selectedInstrument === opt.value ? 'var(--accent)' : 'var(--border-color)'}`,
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="radio"
                    name="instrument-opt"
                    checked={selectedInstrument === opt.value}
                    onChange={() => setSelectedInstrument(opt.value)}
                  />
                  <div>
                    <span style={{ fontSize: '0.925rem', color: 'var(--text-primary)' }}>{opt.label}</span>
                  </div>
                </label>
              ))}

              {/* Custom instrument option */}
              <label
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--bg-tertiary)',
                  border: `1px solid ${selectedInstrument === 'custom' ? 'var(--accent)' : 'var(--border-color)'}`,
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <input
                    type="radio"
                    name="instrument-opt"
                    checked={selectedInstrument === 'custom'}
                    onChange={() => setSelectedInstrument('custom')}
                  />
                  <span style={{ fontSize: '0.925rem', color: 'var(--text-primary)' }}>Alat Lainnya (Ketik Manual)</span>
                </div>
                {selectedInstrument === 'custom' && (
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ketik jenis/nama alat musik..."
                    value={customInstrument}
                    onChange={(e) => setCustomInstrument(e.target.value)}
                    style={{ marginTop: '0.5rem', width: '100%' }}
                    autoFocus
                  />
                )}
              </label>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button
                type="button"
                onClick={() => {
                  setAcceptanceModalApp(null);
                  setSelectedInstrument('');
                  setCustomInstrument('');
                }}
                className="btn btn-outline"
                style={{ flex: 1 }}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmAcceptance}
                className="btn btn-accent"
                style={{ flex: 1 }}
              >
                Konfirmasi Terima
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @media (min-width: 768px) {
          .admin-header {
            flex-direction: row !important;
            justify-content: space-between !important;
            align-items: center !important;
          }
        }
      `}</style>
    </div>
  );
}
