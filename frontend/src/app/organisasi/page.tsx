'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../utils/api';
import { OrgStructure } from '../../types';

export default function OrganisasiPage() {
  const router = useRouter();
  const [org, setOrg] = useState<OrgStructure | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Edit Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form inputs
  const [namaKetua, setNamaKetua] = useState('');
  const [namaWaka1, setNamaWaka1] = useState('');
  const [namaWaka2, setNamaWaka2] = useState('');
  const [namaSekretaris, setNamaSekretaris] = useState('');
  const [namaBendahara, setNamaBendahara] = useState('');

  // File Inputs
  const [fotoKetua, setFotoKetua] = useState<File | null>(null);
  const [fotoWaka1, setFotoWaka1] = useState<File | null>(null);
  const [fotoWaka2, setFotoWaka2] = useState<File | null>(null);
  const [fotoSekretaris, setFotoSekretaris] = useState<File | null>(null);
  const [fotoBendahara, setFotoBendahara] = useState<File | null>(null);

  // File Previews
  const [prevKetua, setPrevKetua] = useState<string | null>(null);
  const [prevWaka1, setPrevWaka1] = useState<string | null>(null);
  const [prevWaka2, setPrevWaka2] = useState<string | null>(null);
  const [prevSekretaris, setPrevSekretaris] = useState<string | null>(null);
  const [prevBendahara, setPrevBendahara] = useState<string | null>(null);

  useEffect(() => {
    const role = localStorage.getItem('mbdb_role');
    const token = localStorage.getItem('mbdb_token');
    setIsAdmin(!!token && role === 'Admin');

    fetchOrgStructure();
  }, []);

  const fetchOrgStructure = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const data = await api.get<OrgStructure>('/api/org-structure');
      setOrg(data);
      if (data) {
        setNamaKetua(data.ketua_nama);
        setNamaWaka1(data.waka1_nama);
        setNamaWaka2(data.waka2_nama);
        setNamaSekretaris(data.sekretaris_nama);
        setNamaBendahara(data.bendahara_nama);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal memuat struktur organisasi.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setFile: React.Dispatch<React.SetStateAction<File | null>>,
    setPreview: React.Dispatch<React.SetStateAction<string | null>>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('Ukuran file maksimal 2MB.');
      return;
    }

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!validTypes.includes(file.type)) {
      alert('Format file harus JPG, JPEG, atau PNG.');
      return;
    }

    setFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUpdateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const formData = new FormData();
    formData.append('nama_ketua', namaKetua);
    formData.append('nama_waka1', namaWaka1);
    formData.append('nama_waka2', namaWaka2);
    formData.append('nama_sekretaris', namaSekretaris);
    formData.append('nama_bendahara', namaBendahara);

    if (fotoKetua) formData.append('foto_ketua', fotoKetua);
    if (fotoWaka1) formData.append('foto_waka1', fotoWaka1);
    if (fotoWaka2) formData.append('foto_waka2', fotoWaka2);
    if (fotoSekretaris) formData.append('foto_sekretaris', fotoSekretaris);
    if (fotoBendahara) formData.append('foto_bendahara', fotoBendahara);

    try {
      const data = await api.upload<OrgStructure>('/api/org-structure', formData);
      setOrg(data);
      setSuccessMsg('Struktur organisasi berhasil diperbarui!');
      setIsModalOpen(false);

      // Clean up files and previews
      setFotoKetua(null);
      setFotoWaka1(null);
      setFotoWaka2(null);
      setFotoSekretaris(null);
      setFotoBendahara(null);
      setPrevKetua(null);
      setPrevWaka1(null);
      setPrevWaka2(null);
      setPrevSekretaris(null);
      setPrevBendahara(null);

      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal memperbarui struktur organisasi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper component to render individual member node
  const renderMemberCard = (
    name: string,
    photoPath: string | null,
    position: string,
    borderColor: string = 'var(--border-color)',
    badgeBg: string = 'var(--bg-tertiary)',
    badgeColor: string = 'var(--text-secondary)'
  ) => {
    const photoUrl = photoPath ? api.getMediaUrl(photoPath) : null;

    return (
      <div
        className="card glass animate-fade-in"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          padding: '1.5rem',
          borderRadius: 'var(--radius-lg)',
          border: `2px solid ${borderColor}`,
          boxShadow: 'var(--shadow-md)',
          width: '100%',
          maxWidth: '260px',
        }}
      >
        {/* Photo Container */}
        <div
          style={{
            width: '100px',
            height: '100px',
            borderRadius: '50%',
            overflow: 'hidden',
            border: `3px solid ${borderColor}`,
            backgroundColor: 'var(--bg-tertiary)',
            marginBottom: '1rem',
            boxShadow: 'var(--shadow-sm)',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {photoUrl ? (
            <img src={photoUrl} alt={`Foto ${name}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <span style={{ fontSize: '2.5rem' }}>👤</span>
          )}
        </div>

        {/* Position Badge */}
        <div
          style={{
            fontSize: '0.725rem',
            fontWeight: 800,
            backgroundColor: badgeBg,
            color: badgeColor,
            padding: '0.2rem 0.75rem',
            borderRadius: 'var(--radius-full)',
            letterSpacing: '0.05em',
            marginBottom: '0.5rem',
            textTransform: 'uppercase',
            border: `1px solid ${borderColor}50`,
          }}
        >
          {position}
        </div>

        {/* Name */}
        <h3
          style={{
            fontSize: '1rem',
            fontWeight: 700,
            color: 'var(--text-primary)',
            lineHeight: 1.3,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {name}
        </h3>
      </div>
    );
  };

  return (
    <div style={{ padding: '3rem 0', minHeight: '80vh' }}>
      <div className="container">
        {/* Header */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            marginBottom: '3rem',
            textAlign: 'center',
            alignItems: 'center',
          }}
        >
          <img
            src="/logo.png"
            alt="Logo MBDB"
            style={{ width: '80px', height: '80px', borderRadius: '50%', border: '2px solid var(--accent)', boxShadow: 'var(--shadow-gold)' }}
          />
          <div>
            <h1
              style={{
                fontSize: '2.25rem',
                fontWeight: 800,
                background: 'linear-gradient(135deg, var(--text-primary) 0%, var(--primary) 50%, var(--accent) 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                marginBottom: '0.5rem',
              }}
            >
              Struktur Organisasi MBDB Smansaagung
            </h1>
            <p style={{ color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto' }}>
              Bagan kepengurusan inti Marching Band & Drumband SMA Negeri 1 Kayuagung.
            </p>
          </div>

          {isAdmin && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="btn btn-accent"
              style={{ marginTop: '0.5rem', padding: '0.5rem 1.5rem', fontSize: '0.875rem' }}
            >
              ✏️ Kelola Pengurus
            </button>
          )}
        </div>

        {successMsg && (
          <div
            style={{
              padding: '1rem',
              backgroundColor: 'var(--success-light)',
              color: 'var(--success)',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.875rem',
              maxWidth: '600px',
              margin: '0 auto 2.5rem',
              textAlign: 'center',
              border: '1px solid rgba(16, 185, 129, 0.2)',
            }}
          >
            ✓ {successMsg}
          </div>
        )}

        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '5rem 0' }}>
            <svg style={{ animation: 'spin 1s linear infinite' }} width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="3">
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
          </div>
        ) : !org ? (
          <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto' }}>
            Struktur organisasi belum dikonfigurasi.
          </div>
        ) : (
          /* HIERARCHICAL BAGAN DISPLAY */
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '2.5rem',
              position: 'relative',
              padding: '1rem 0',
            }}
          >
            {/* Level 1: Ketua */}
            <div style={{ zIndex: 5, width: '100%', display: 'flex', justifyContent: 'center' }}>
              {renderMemberCard(
                org.ketua_nama,
                org.ketua_foto,
                'Ketua Umum',
                'var(--primary)',
                'var(--primary-light)',
                'var(--primary)'
              )}
            </div>

            {/* Level 2: Wakil Ketua Grid */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'center',
                gap: '2.5rem',
                width: '100%',
                zIndex: 5,
              }}
            >
              {renderMemberCard(
                org.waka1_nama,
                org.waka1_foto,
                'Wakil Ketua 1',
                'var(--accent)',
                'var(--accent-light)',
                'var(--accent)'
              )}
              {renderMemberCard(
                org.waka2_nama,
                org.waka2_foto,
                'Wakil Ketua 2',
                'var(--accent)',
                'var(--accent-light)',
                'var(--accent)'
              )}
            </div>

            {/* Level 3: Sekretaris & Bendahara */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'center',
                gap: '2.5rem',
                width: '100%',
                zIndex: 5,
              }}
            >
              {renderMemberCard(org.sekretaris_nama, org.sekretaris_foto, 'Sekretaris')}
              {renderMemberCard(org.bendahara_nama, org.bendahara_foto, 'Bendahara')}
            </div>
          </div>
        )}
      </div>

      {/* EDIT MODAL (Admin Only) */}
      {isModalOpen && (
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
              maxWidth: '650px',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '2.5rem',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid var(--border-color)',
                paddingBottom: '1rem',
                marginBottom: '1.5rem',
              }}
            >
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Ubah Pengurus & Upload Foto</h2>
              <button
                onClick={() => setIsModalOpen(false)}
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

            <form onSubmit={handleUpdateOrg} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              
              {/* Position Inputs list */}
              {[
                {
                  label: 'Ketua Umum',
                  nameVal: namaKetua,
                  setName: setNamaKetua,
                  fotoFile: fotoKetua,
                  setFoto: setFotoKetua,
                  prevVal: prevKetua,
                  setPrev: setPrevKetua,
                  fieldName: 'foto_ketua',
                  existingPath: org?.ketua_foto,
                },
                {
                  label: 'Wakil Ketua 1',
                  nameVal: namaWaka1,
                  setName: setNamaWaka1,
                  fotoFile: fotoWaka1,
                  setFoto: setFotoWaka1,
                  prevVal: prevWaka1,
                  setPrev: setPrevWaka1,
                  fieldName: 'foto_waka1',
                  existingPath: org?.waka1_foto,
                },
                {
                  label: 'Wakil Ketua 2',
                  nameVal: namaWaka2,
                  setName: setNamaWaka2,
                  fotoFile: fotoWaka2,
                  setFoto: setFotoWaka2,
                  prevVal: prevWaka2,
                  setPrev: setPrevWaka2,
                  fieldName: 'foto_waka2',
                  existingPath: org?.waka2_foto,
                },
                {
                  label: 'Sekretaris Umum',
                  nameVal: namaSekretaris,
                  setName: setNamaSekretaris,
                  fotoFile: fotoSekretaris,
                  setFoto: setFotoSekretaris,
                  prevVal: prevSekretaris,
                  setPrev: setPrevSekretaris,
                  fieldName: 'foto_sekretaris',
                  existingPath: org?.sekretaris_foto,
                },
                {
                  label: 'Bendahara Umum',
                  nameVal: namaBendahara,
                  setName: setNamaBendahara,
                  fotoFile: fotoBendahara,
                  setFoto: setFotoBendahara,
                  prevVal: prevBendahara,
                  setPrev: setPrevBendahara,
                  fieldName: 'foto_bendahara',
                  existingPath: org?.bendahara_foto,
                },
              ].map((pos, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem',
                    paddingBottom: '1.5rem',
                    borderBottom: '1px solid var(--border-color)',
                    ...({ '@media (min-width: 640px)': { flexDirection: 'row', alignItems: 'center' } } as any),
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '0.5rem' }}>
                      {pos.label}
                    </h3>
                    <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                      <label className="form-label" style={{ fontSize: '0.75rem' }}>Nama Pengurus</label>
                      <input
                        type="text"
                        className="form-input"
                        value={pos.nameVal}
                        onChange={(e) => pos.setName(e.target.value)}
                        required
                        disabled={isSubmitting}
                      />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.75rem' }}>Upload Foto Baru</label>
                      <input
                        type="file"
                        accept=".jpg,.jpeg,.png"
                        onChange={(e) => handleFileChange(e, pos.setFoto, pos.setPrev)}
                        disabled={isSubmitting}
                        style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}
                      />
                    </div>
                  </div>

                  {/* Thumbnail Preview */}
                  <div
                    style={{
                      width: '70px',
                      height: '70px',
                      borderRadius: '50%',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--bg-tertiary)',
                      overflow: 'hidden',
                      flexShrink: 0,
                      alignSelf: 'center',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.75rem',
                      color: 'var(--text-tertiary)',
                    }}
                  >
                    {pos.prevVal ? (
                      <img src={pos.prevVal} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : pos.existingPath ? (
                      <img src={api.getMediaUrl(pos.existingPath)} alt="Existing" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span>No Foto</span>
                    )}
                  </div>
                </div>
              ))}

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="submit" className="btn btn-accent" style={{ flex: 1 }} disabled={isSubmitting}>
                  {isSubmitting ? 'Memproses...' : 'Perbarui Kepengurusan'}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsModalOpen(false)}
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
      `}</style>
    </div>
  );
}
