'use client';

import React, { useState, useRef } from 'react';
import { api } from '../../utils/api';

export default function RegisterMember() {
  const [activeTab, setActiveTab] = useState<'daftar' | 'status'>('daftar');

  const [nama, setNama] = useState('');
  const [kelas, setKelas] = useState('');
  const [angkatan, setAngkatan] = useState('');
  const [pilihan1, setPilihan1] = useState('');
  const [pilihan2, setPilihan2] = useState('');
  const [pilihan3, setPilihan3] = useState('');
  const [foto, setFoto] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [registeredCode, setRegisteredCode] = useState<string | null>(null);
  const [registeredName, setRegisteredName] = useState<string | null>(null);

  const [statusInputCode, setStatusInputCode] = useState('');
  const [statusResult, setStatusResult] = useState<any | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size client-side (2MB)
    if (file.size > 2 * 1024 * 1024) {
      setErrorMsg('Ukuran file foto maksimal 2MB.');
      setFoto(null);
      setFotoPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Validate type client-side
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!validTypes.includes(file.type)) {
      setErrorMsg('Format file harus JPG, JPEG, atau PNG.');
      setFoto(null);
      setFotoPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setErrorMsg(null);
    setFoto(file);
    
    // Create preview URL
    const reader = new FileReader();
    reader.onloadend = () => {
      setFotoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!nama || !kelas || !angkatan || !pilihan1 || !pilihan2 || !pilihan3 || !foto) {
      setErrorMsg('Semua data formulir dan pas foto wajib diisi.');
      setIsLoading(false);
      return;
    }

    if (pilihan1 === pilihan2 || pilihan1 === pilihan3 || pilihan2 === pilihan3) {
      setErrorMsg('Pilihan alat 1, 2, dan 3 tidak boleh sama.');
      setIsLoading(false);
      return;
    }

    const formData = new FormData();
    formData.append('nama', nama);
    formData.append('kelas', kelas);
    formData.append('angkatan', angkatan);
    formData.append('pilihan1', pilihan1);
    formData.append('pilihan2', pilihan2);
    formData.append('pilihan3', pilihan3);
    formData.append('foto', foto);

    try {
      const response = await api.upload<any>('/api/applicants', formData);
      const applicantData = response?.data || {};
      setRegisteredCode(applicantData.kode_pendaftaran || '');
      setRegisteredName(applicantData.nama || nama);
      setSuccessMsg(`Pendaftaran atas nama ${applicantData.nama || nama} berhasil dikirim!`);
      
      // Reset form
      setNama('');
      setKelas('');
      setAngkatan('');
      setPilihan1('');
      setPilihan2('');
      setPilihan3('');
      setFoto(null);
      setFotoPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal mengirim pendaftaran. Silakan coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusInputCode.trim()) return;
    setStatusLoading(true);
    setStatusError(null);
    setStatusResult(null);
    try {
      const data = await api.get<any>(`/api/applicants/status/${statusInputCode.trim().toUpperCase()}`);
      setStatusResult(data);
    } catch (err: any) {
      setStatusError(err.message || 'Kode pendaftaran tidak ditemukan. Pastikan format benar (contoh: REG-XXXXXX).');
    } finally {
      setStatusLoading(false);
    }
  };

  const handlePrintNametag = () => {
    if (!statusResult) return;
    const printWindow = window.open('', '_blank', 'width=600,height=500');
    if (!printWindow) {
      alert('Gagal membuka jendela cetak. Pastikan pop-up blocker dinonaktifkan.');
      return;
    }
    
    const doc = printWindow.document;
    doc.write(`
      <html>
        <head>
          <title>Nametag - ${statusResult.nama}</title>
          <style>
            @page {
              size: 9cm 5.5cm;
              margin: 0;
            }
            body {
              margin: 0;
              padding: 0;
              width: 9cm;
              height: 5.5cm;
              display: flex;
              align-items: center;
              justify-content: center;
              font-family: 'Times New Roman', Times, serif;
              background-color: #ffffff;
              box-sizing: border-box;
              -webkit-print-color-adjust: exact;
            }
            .card {
              width: 8.4cm;
              height: 4.9cm;
              border: 2px solid #0f172a; /* Dark Navy border */
              box-sizing: border-box;
              padding: 0.3cm;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: space-around;
              text-align: center;
              background-color: #ffffff;
            }
            .nama {
              font-size: 18pt;
              font-weight: bold;
              color: #000000;
              text-transform: uppercase;
              line-height: 1.2;
              word-wrap: break-word;
              max-width: 100%;
            }
            .kelas {
              font-size: 14pt;
              font-weight: normal;
              color: #000000;
              text-transform: uppercase;
            }
            .alat {
              font-size: 14pt;
              font-weight: normal;
              color: #000000;
              text-transform: uppercase;
            }
            .angkatan {
              font-size: 12pt;
              font-weight: normal;
              color: #000000;
              text-transform: uppercase;
            }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="nama">${statusResult.nama}</div>
            <div class="kelas">${statusResult.kelas}</div>
            <div class="alat">${statusResult.alat_diterima || ''}</div>
            <div class="angkatan">${statusResult.angkatan || ''}</div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    doc.close();
  };

  return (
    <div
      style={{
        padding: '3rem 0',
        minHeight: '80vh',
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <div className="container" style={{ maxWidth: '800px' }}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <img
            src="/logo.png"
            alt="Logo MBDB Smansaagung"
            style={{
              width: '90px',
              height: '90px',
              borderRadius: '50%',
              objectFit: 'cover',
              border: '3px solid var(--accent)',
              boxShadow: 'var(--shadow-gold)',
              marginBottom: '1.25rem',
            }}
          />
          <h1
            style={{
              fontSize: '2.5rem',
              fontWeight: 800,
              marginBottom: '1rem',
              background: 'linear-gradient(135deg, var(--text-primary) 0%, var(--accent) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Penerimaan Anggota Baru
          </h1>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto' }}>
            Bergabunglah bersama keluarga besar **MBDB Smansaagung (Marching Band & Drumband SMAN 1 Kayuagung)**. 
            Lengkapi formulir di bawah ini dengan data asli Anda.
          </p>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '2rem' }}>
          <button
            type="button"
            className={`btn ${activeTab === 'daftar' ? 'btn-accent' : 'btn-outline'}`}
            onClick={() => {
              setActiveTab('daftar');
              setErrorMsg(null);
              setSuccessMsg(null);
              setRegisteredCode(null);
            }}
            style={{ padding: '0.75rem 1.5rem', fontWeight: 600 }}
          >
            Formulir Pendaftaran
          </button>
          <button
            type="button"
            className={`btn ${activeTab === 'status' ? 'btn-accent' : 'btn-outline'}`}
            onClick={() => {
              setActiveTab('status');
              setErrorMsg(null);
              setSuccessMsg(null);
              setStatusError(null);
              setStatusResult(null);
            }}
            style={{ padding: '0.75rem 1.5rem', fontWeight: 600 }}
          >
            Cek Status Penerimaan
          </button>
        </div>

        {activeTab === 'daftar' && registeredCode ? (
          <div className="card glass" style={{ padding: '3rem 2.5rem', border: '1px solid var(--border-color)', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
              <div
                style={{
                  width: '72px',
                  height: '72px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--success-light)',
                  color: 'var(--success)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
            </div>

            <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '0.5rem', color: 'var(--success)' }}>
              Pendaftaran Berhasil!
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
              Pendaftaran atas nama <strong>{registeredName}</strong> telah berhasil dikirim.
            </p>

            <div
              style={{
                backgroundColor: 'var(--bg-tertiary)',
                border: '1px dashed var(--border-color)',
                borderRadius: 'var(--radius-md)',
                padding: '1.5rem',
                marginBottom: '2rem',
                position: 'relative',
              }}
            >
              <div style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                Kode Pendaftaran Anda
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--accent)', letterSpacing: '2px', fontFamily: 'monospace' }}>
                {registeredCode}
              </div>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => {
                  navigator.clipboard.writeText(registeredCode || '');
                  alert('Kode pendaftaran berhasil disalin!');
                }}
                style={{ marginTop: '1rem', padding: '0.5rem 1.0rem', fontSize: '0.875rem' }}
              >
                Salin Kode
              </button>
            </div>

            <p style={{ fontSize: '0.9rem', color: 'var(--text-tertiary)', marginBottom: '2rem', lineHeight: '1.5' }}>
              Simpan kode pendaftaran di atas. Anda dapat menggunakan kode tersebut pada tab <strong>Cek Status Penerimaan</strong> untuk memantau hasil seleksi.
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => {
                  setRegisteredCode(null);
                  setRegisteredName(null);
                  setSuccessMsg(null);
                }}
                style={{ padding: '0.75rem 1.5rem' }}
              >
                Daftar Lagi
              </button>
              <button
                type="button"
                className="btn btn-accent"
                onClick={() => {
                  setActiveTab('status');
                  setStatusInputCode(registeredCode || '');
                  setStatusLoading(true);
                  setStatusError(null);
                  setStatusResult(null);
                  api.get<any>(`/api/applicants/status/${registeredCode}`)
                    .then((data) => setStatusResult(data))
                    .catch((err) => setStatusError(err.message || 'Gagal memeriksa status.'))
                    .finally(() => setStatusLoading(false));
                }}
                style={{ padding: '0.75rem 1.5rem' }}
              >
                Cek Status Sekarang
              </button>
            </div>
          </div>
        ) : activeTab === 'daftar' ? (
          <div className="card glass" style={{ padding: '2.5rem', border: '1px solid var(--border-color)' }}>
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
                ⚠️ {errorMsg}
              </div>
            )}

            {successMsg && (
              <div
                style={{
                  padding: '1.25rem',
                  backgroundColor: 'var(--success-light)',
                  color: 'var(--success)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.925rem',
                  marginBottom: '1.5rem',
                  border: '1px solid rgba(16, 185, 129, 0.2)',
                  lineHeight: 1.5,
                }}
              >
                🎉 {successMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }} className="form-grid">
                {/* Nama Lengkap */}
                <div className="form-group">
                  <label className="form-label">Nama Lengkap</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Masukkan nama lengkap Anda"
                    value={nama}
                    onChange={(e) => setNama(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>

                {/* Kelas */}
                <div className="form-group">
                  <label className="form-label">Kelas</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Contoh: X IPA 1, XI IPS 3"
                    value={kelas}
                    onChange={(e) => setKelas(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>

                {/* Angkatan */}
                <div className="form-group">
                  <label className="form-label">Angkatan (Tahun Masuk)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Contoh: 2026 atau Angkatan 30"
                    value={angkatan}
                    onChange={(e) => setAngkatan(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Pilihan Alat */}
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--accent)' }}>
                  Prioritas Pilihan Alat Musik
                </h3>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.25rem' }} className="pilihan-grid">
                  <div className="form-group">
                    <label className="form-label">Pilihan 1 (Prioritas Utama)</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Contoh: Snare Drum, Trumpet, Colorguard"
                      value={pilihan1}
                      onChange={(e) => setPilihan1(e.target.value)}
                      required
                      disabled={isLoading}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Pilihan 2</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Contoh: Tenor Drum, Mellophone"
                      value={pilihan2}
                      onChange={(e) => setPilihan2(e.target.value)}
                      required
                      disabled={isLoading}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Pilihan 3</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Contoh: Bass Drum, Cymbal, Tuba"
                      value={pilihan3}
                      onChange={(e) => setPilihan3(e.target.value)}
                      required
                      disabled={isLoading}
                    />
                  </div>
                </div>
              </div>

              {/* Pas Foto Upload */}
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }} className="foto-upload-section">
                <div style={{ flex: 1 }} className="form-group">
                  <label className="form-label">Pas Foto (Format JPG/JPEG/PNG, Maks 2MB)</label>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".jpg,.jpeg,.png"
                    style={{ display: 'none' }}
                  />
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isLoading}
                    style={{ width: '100%', padding: '1.5rem', borderStyle: 'dashed', borderWidth: '2px', display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'center' }}
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    <span>{foto ? foto.name : 'Pilih File Pas Foto'}</span>
                  </button>
                </div>

                {/* Photo Preview */}
                <div
                  style={{
                    width: '120px',
                    height: '160px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-tertiary)',
                    overflow: 'hidden',
                    alignSelf: 'center',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--text-tertiary)',
                    fontSize: '0.75rem',
                  }}
                >
                  {fotoPreview ? (
                    <img src={fotoPreview} alt="Pas Foto Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span>Pratinjau Foto</span>
                  )}
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="btn btn-accent"
                style={{
                  marginTop: '1rem',
                  padding: '1rem',
                  fontSize: '1rem',
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
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                    >
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                    Mengirim Pendaftaran...
                  </>
                ) : (
                  'Kirim Pendaftaran Anggota'
                )}
              </button>
            </form>
          </div>
        ) : (
          <div className="card glass" style={{ padding: '2.5rem', border: '1px solid var(--border-color)' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1.5rem', textAlign: 'center', color: 'var(--text-primary)' }}>
              Cek Hasil Seleksi Pendaftaran
            </h2>

            <form onSubmit={handleCheckStatus} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '2rem' }}>
              <div className="form-group">
                <label className="form-label">Kode Pendaftaran</label>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Contoh: REG-XXXXXX"
                    value={statusInputCode}
                    onChange={(e) => setStatusInputCode(e.target.value)}
                    required
                    style={{ flex: 1, textTransform: 'uppercase', fontSize: '1.1rem', letterSpacing: '1px', fontFamily: 'monospace' }}
                    disabled={statusLoading}
                  />
                  <button
                    type="submit"
                    className="btn btn-accent"
                    style={{ minWidth: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    disabled={statusLoading}
                  >
                    {statusLoading ? (
                      <svg
                        style={{ animation: 'spin 1s linear infinite' }}
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                      >
                        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                      </svg>
                    ) : (
                      'Cek Status'
                    )}
                  </button>
                </div>
              </div>
            </form>

            {statusError && (
              <div
                style={{
                  padding: '1rem',
                  backgroundColor: 'var(--danger-light)',
                  color: 'var(--danger)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.875rem',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  textAlign: 'center',
                }}
              >
                ⚠️ {statusError}
              </div>
            )}

            {statusResult && (
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                
                {/* Status Alert Banner */}
                {statusResult.status === 'Pending' && (
                  <div
                    style={{
                      padding: '1.25rem',
                      backgroundColor: 'rgba(217, 119, 6, 0.1)',
                      color: '#d97706',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid rgba(217, 119, 6, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      lineHeight: 1.5,
                    }}
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <div>
                      <strong>Status: Pending.</strong> Pendaftaran Anda sedang ditinjau oleh admin MBDB Smansaagung. Silakan cek kembali beberapa hari ke depan.
                    </div>
                  </div>
                )}

                {statusResult.status === 'Rejected' && (
                  <div
                    style={{
                      padding: '1.25rem',
                      backgroundColor: 'var(--danger-light)',
                      color: 'var(--danger)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid rgba(239, 68, 68, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      lineHeight: 1.5,
                    }}
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
                      <circle cx="12" cy="12" r="10" />
                      <line x1="15" y1="9" x2="9" y2="15" />
                      <line x1="9" y1="9" x2="15" y2="15" />
                    </svg>
                    <div>
                      <strong>Status: Ditolak.</strong> Mohon maaf, pendaftaran Anda belum dapat diterima pada periode penerimaan kali ini. Tetap semangat dan terima kasih atas ketertarikan Anda!
                    </div>
                  </div>
                )}

                {statusResult.status === 'Accepted' && (
                  <div
                    style={{
                      padding: '1.5rem',
                      backgroundColor: 'var(--success-light)',
                      color: 'var(--success)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid rgba(16, 185, 129, 0.2)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '0.75rem',
                      textAlign: 'center',
                      lineHeight: 1.6,
                      boxShadow: 'var(--shadow-gold)',
                    }}
                  >
                    <div
                      style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '50%',
                        backgroundColor: 'rgba(16, 185, 129, 0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '0.25rem',
                      }}
                    >
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0 0 0.5rem 0' }}>Diterima!</h3>
                      Selamat! Anda dinyatakan <strong>DITERIMA</strong> menjadi anggota aktif MBDB Smansaagung pada alat:
                      <div
                        style={{
                          display: 'inline-block',
                          marginTop: '0.75rem',
                          padding: '0.5rem 1.5rem',
                          backgroundColor: 'var(--accent)',
                          color: '#000',
                          fontWeight: 800,
                          borderRadius: 'var(--radius-md)',
                          fontSize: '1.2rem',
                          boxShadow: 'var(--shadow-gold)',
                          textTransform: 'uppercase',
                        }}
                      >
                        🎺 {statusResult.alat_diterima}
                      </div>

                      <div style={{ marginTop: '1.5rem' }}>
                        <button
                          type="button"
                          onClick={handlePrintNametag}
                          className="btn btn-accent"
                          style={{
                            padding: '0.75rem 2rem',
                            fontSize: '1rem',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            boxShadow: 'var(--shadow-md)',
                          }}
                        >
                          📇 Cetak Nametag Anda
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Detail Table */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', backgroundColor: 'var(--bg-tertiary)', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', margin: 0 }}>
                    Detail Calon Anggota
                  </h3>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.925rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-tertiary)' }}>Nama Lengkap</span>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{statusResult.nama}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-tertiary)' }}>Kelas</span>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{statusResult.kelas}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-tertiary)' }}>Angkatan</span>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{statusResult.angkatan || '-'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-tertiary)' }}>Pilihan Alat 1</span>
                      <span style={{ color: 'var(--text-secondary)' }}>{statusResult.pilihan1}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-tertiary)' }}>Pilihan Alat 2</span>
                      <span style={{ color: 'var(--text-secondary)' }}>{statusResult.pilihan2}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-tertiary)' }}>Pilihan Alat 3</span>
                      <span style={{ color: 'var(--text-secondary)' }}>{statusResult.pilihan3}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-tertiary)' }}>Tanggal Daftar</span>
                      <span style={{ color: 'var(--text-secondary)' }}>{new Date(statusResult.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                    </div>
                  </div>
                </div>

              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Dynamic Keyframes styles */}
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @media (min-width: 640px) {
          .form-grid {
            grid-template-columns: repeat(3, 1fr) !important;
          }
          .foto-upload-section {
            flex-direction: row !important;
          }
        }
        @media (min-width: 768px) {
          .pilihan-grid {
            grid-template-columns: 1fr 1fr 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
