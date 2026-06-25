'use client';

import React, { useState, useRef } from 'react';
import { api } from '../../utils/api';

const INSTRUMENT_OPTIONS = [
  'Trumpet',
  'Mellophone',
  'Trombone',
  'Euphonium',
  'Tuba',
  'Snare Drum',
  'Multi Tenor (Quarto)',
  'Bass Drum',
  'Cymbals',
  'Marimba',
  'Vibraphone',
  'Xylophone',
  'Glockenspiel',
  'Timpani',
  'Colorguard (Bendera/Senjata)',
];

export default function RegisterMember() {
  const [nama, setNama] = useState('');
  const [kelas, setKelas] = useState('');
  const [pilihan1, setPilihan1] = useState('');
  const [pilihan2, setPilihan2] = useState('');
  const [pilihan3, setPilihan3] = useState('');
  const [foto, setFoto] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  
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

    if (!nama || !kelas || !pilihan1 || !pilihan2 || !pilihan3 || !foto) {
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
    formData.append('pilihan1', pilihan1);
    formData.append('pilihan2', pilihan2);
    formData.append('pilihan3', pilihan3);
    formData.append('foto', foto);

    try {
      await api.upload('/api/applicants', formData);
      setSuccessMsg(`Pendaftaran atas nama ${nama} berhasil dikirim! Status awal pendaftaran Anda adalah Pending.`);
      
      // Reset form
      setNama('');
      setKelas('');
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
            </div>

            {/* Pilihan Alat */}
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--accent)' }}>
                Prioritas Pilihan Alat Musik
              </h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.25rem' }} className="pilihan-grid">
                <div className="form-group">
                  <label className="form-label">Pilihan 1 (Prioritas Utama)</label>
                  <select
                    className="form-input"
                    value={pilihan1}
                    onChange={(e) => setPilihan1(e.target.value)}
                    required
                    disabled={isLoading}
                  >
                    <option value="">-- Pilih Alat --</option>
                    {INSTRUMENT_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Pilihan 2</label>
                  <select
                    className="form-input"
                    value={pilihan2}
                    onChange={(e) => setPilihan2(e.target.value)}
                    required
                    disabled={isLoading}
                  >
                    <option value="">-- Pilih Alat --</option>
                    {INSTRUMENT_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Pilihan 3</label>
                  <select
                    className="form-input"
                    value={pilihan3}
                    onChange={(e) => setPilihan3(e.target.value)}
                    required
                    disabled={isLoading}
                  >
                    <option value="">-- Pilih Alat --</option>
                    {INSTRUMENT_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
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
                  required
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
      </div>
      
      {/* Dynamic Keyframes styles */}
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @media (min-width: 640px) {
          .form-grid {
            grid-template-columns: 1fr 1fr !important;
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
