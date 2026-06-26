'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { jsPDF } from 'jspdf';
import { api } from '../../utils/api';

interface Member {
  id: number;
  nomor_anggota?: string;
  nama: string;
  kelas: string;
  alat: string;
  status: 'Aktif' | 'Alumni';
  angkatan?: string;
  kode_pendaftaran?: string;
  created_at: string;
  updated_at: string;
  total_latihan?: number;
  hadir_latihan?: number;
}

export default function MembersPage() {
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<Member[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'Semua' | 'Aktif' | 'Alumni'>('Semua');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form states for manual add / edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [formData, setFormData] = useState({
    nama: '',
    kelas: '',
    alat: '',
    status: 'Aktif' as 'Aktif' | 'Alumni',
    angkatan: '',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const storedToken = localStorage.getItem('mbdb_token');
    const storedRole = localStorage.getItem('mbdb_role');

    if (!storedToken) {
      router.push('/login');
      return;
    }

    setToken(storedToken);
    setRole(storedRole);
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.get<Member[]>('/api/members');
      setMembers(data);
      setFilteredMembers(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Gagal mengambil data anggota');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let result = members;

    // Filter by status
    if (statusFilter !== 'Semua') {
      result = result.filter((m) => m.status === statusFilter);
    }

    // Filter by search query
    if (search.trim() !== '') {
      const q = search.toLowerCase();
      result = result.filter(
        (m) =>
          m.nama.toLowerCase().includes(q) ||
          m.kelas.toLowerCase().includes(q) ||
          m.alat.toLowerCase().includes(q)
      );
    }

    setFilteredMembers(result);
  }, [search, statusFilter, members]);

  const handleOpenAddModal = () => {
    setEditingMember(null);
    setFormData({
      nama: '',
      kelas: '',
      alat: '',
      status: 'Aktif',
      angkatan: '',
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (member: Member) => {
    setEditingMember(member);
    setFormData({
      nama: member.nama,
      kelas: member.kelas,
      alat: member.alat,
      status: member.status,
      angkatan: member.angkatan || '',
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    if (!formData.nama.trim() || !formData.kelas.trim() || !formData.alat.trim() || !formData.angkatan.trim()) {
      setFormError('Semua kolom wajib diisi');
      setIsSubmitting(false);
      return;
    }

    try {
      if (editingMember) {
        // Edit mode
        await api.put(`/api/members/${editingMember.id}`, formData);
      } else {
        // Add mode
        await api.post('/api/members', formData);
      }
      setIsModalOpen(false);
      fetchMembers();
    } catch (err: any) {
      setFormError(err.message || 'Gagal menyimpan data anggota');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (member: Member, newStatus: 'Aktif' | 'Alumni') => {
    if (!window.confirm(`Ubah status ${member.nama} menjadi ${newStatus}?`)) return;

    try {
      await api.put(`/api/members/${member.id}`, { status: newStatus });
      fetchMembers();
    } catch (err: any) {
      alert(err.message || 'Gagal memperbarui status');
    }
  };

  const handleDelete = async (member: Member) => {
    if (!window.confirm(`Apakah Anda yakin ingin menghapus anggota ${member.nama}?`)) return;

    try {
      await api.delete(`/api/members/${member.id}`);
      fetchMembers();
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus anggota');
    }
  };

  const handleDownloadNametag = (member: Member) => {
    const canvas = document.createElement('canvas');
    // 300 DPI for 9cm x 5.5cm: ~1063 x 650 pixels
    canvas.width = 1063;
    canvas.height = 650;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Fill white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw Navy Border (equivalent to 0.3cm margin with 2px card border)
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 8;
    // 35px margin on all sides
    ctx.strokeRect(35, 35, 993, 580);
    
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // 1. Nama
    const namaText = member.nama.toUpperCase();
    let namaFontSize = 83; // 20pt at 300 DPI
    ctx.font = `bold ${namaFontSize}px "Times New Roman", Times, serif`;
    // Scale font size down if name is too long
    while (ctx.measureText(namaText).width > 880 && namaFontSize > 40) {
      namaFontSize -= 4;
      ctx.font = `bold ${namaFontSize}px "Times New Roman", Times, serif`;
    }
    ctx.fillText(namaText, 531.5, 180);
    
    // 2. Kelas
    const kelasText = member.kelas.toUpperCase();
    ctx.font = `67px "Times New Roman", Times, serif`; // 16pt at 300 DPI
    ctx.fillText(kelasText, 531.5, 300);
    
    // 3. Alat
    const alatText = (member.alat || '').toUpperCase();
    ctx.font = `67px "Times New Roman", Times, serif`; // 16pt at 300 DPI
    ctx.fillText(alatText, 531.5, 420);
    
    // 4. Angkatan
    const angkatanText = (member.angkatan || '').toUpperCase();
    ctx.font = `67px "Times New Roman", Times, serif`; // 16pt at 300 DPI
    ctx.fillText(angkatanText, 531.5, 530);
    
    // Convert canvas to image and add to PDF
    const imgData = canvas.toDataURL('image/png');
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'cm',
      format: [9, 5.5]
    });
    
    doc.addImage(imgData, 'PNG', 0, 0, 9, 5.5);
    doc.save(`nametag_${member.nama.toLowerCase().replace(/\s+/g, '_')}.pdf`);
  };

  const activeCount = members.filter((m) => m.status === 'Aktif').length;
  const alumniCount = members.filter((m) => m.status === 'Alumni').length;

  if (isLoading && members.length === 0) {
    return (
      <div className="container" style={{ padding: '3rem 1rem', textAlign: 'center' }}>
        <div className="spinner"></div>
        <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>Memuat data anggota...</p>
      </div>
    );
  }

  const isAdmin = role === 'Admin';

  return (
    <div className="container" style={{ padding: '2rem 1rem' }}>
      {/* Header Panel */}
      <div
        className="glass"
        style={{
          padding: '2rem',
          borderRadius: 'var(--radius-lg)',
          marginBottom: '2rem',
          boxShadow: 'var(--shadow-md)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1.5rem',
        }}
      >
        <div>
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
            Manajemen Anggota & Alumni
          </h1>
          <p style={{ color: 'var(--text-secondary)', margin: '0.5rem 0 0 0' }}>
            Kelola data anggota aktif dan alumni MBDB Smansaagung
          </p>
        </div>

        {isAdmin && (
          <button onClick={handleOpenAddModal} className="btn btn-primary" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span>➕</span> Tambah Anggota Manual
          </button>
        )}
      </div>

      {/* Stats Dashboard */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2rem',
        }}
      >
        <div className="glass" style={{ padding: '1.5rem', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ fontSize: '2.5rem', background: 'var(--accent-light)', padding: '0.5rem', borderRadius: '50%' }}>👥</div>
          <div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Total Anggota Terdaftar</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800 }}>{members.length} Orang</div>
          </div>
        </div>

        <div className="glass" style={{ padding: '1.5rem', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ fontSize: '2.5rem', background: 'var(--success-light)', padding: '0.5rem', borderRadius: '50%' }}>🎷</div>
          <div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Anggota Aktif (Pemain)</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--success)' }}>{activeCount} Orang</div>
          </div>
        </div>

        <div className="glass" style={{ padding: '1.5rem', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ fontSize: '2.5rem', background: 'var(--primary-light)', padding: '0.5rem', borderRadius: '50%' }}>🎓</div>
          <div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Alumni (Lulus)</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--primary)' }}>{alumniCount} Orang</div>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div
        className="glass"
        style={{
          padding: '1.5rem',
          borderRadius: 'var(--radius-md)',
          marginBottom: '1.5rem',
          display: 'flex',
          gap: '1rem',
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <div style={{ flex: 1, minWidth: '250px', position: 'relative' }}>
          <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }}>🔍</span>
          <input
            type="text"
            placeholder="Cari nama, kelas, atau alat..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem 1rem 0.75rem 2.5rem',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {(['Semua', 'Aktif', 'Alumni'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`btn ${statusFilter === filter ? 'btn-primary' : 'btn-outline'}`}
              style={{ padding: '0.5rem 1.25rem' }}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="glass" style={{ padding: '1.5rem', borderRadius: 'var(--radius-md)', background: 'var(--danger-light)', color: 'var(--danger)', marginBottom: '1.5rem' }}>
          ⚠️ {error}
        </div>
      )}

      {/* Members Grid / Cards (Mobile Friendly) */}
      {filteredMembers.length === 0 ? (
        <div className="glass" style={{ padding: '3rem', textAlign: 'center', borderRadius: 'var(--radius-md)' }}>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Tidak ada data anggota yang cocok dengan filter pencarian.</p>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '1.25rem',
          }}
        >
          {filteredMembers.map((member) => (
            <div
              key={member.id}
              className="glassCard"
              style={{
                background: 'var(--bg-secondary)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
                padding: '1.5rem',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '1rem',
                boxShadow: 'var(--shadow-sm)',
                transition: 'transform var(--transition-fast)',
              }}
            >
              <div>
                {/* Header card */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      padding: '0.25rem 0.75rem',
                      borderRadius: 'var(--radius-full)',
                      background: member.status === 'Aktif' ? 'var(--success-light)' : 'var(--primary-light)',
                      color: member.status === 'Aktif' ? 'var(--success)' : 'var(--primary)',
                      textTransform: 'uppercase',
                    }}
                  >
                    {member.status}
                  </span>
                  <span style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)' }}>ID: #{member.id}</span>
                </div>

                <h3 style={{ margin: '1rem 0 0.5rem 0', fontSize: '1.25rem', fontWeight: 700 }}>{member.nama}</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  <div>🏫 Kelas: <strong>{member.kelas}</strong></div>
                  <div>🎷 Alat: <strong>{member.alat}</strong></div>
                  <div>🎓 Angkatan: <strong>{member.angkatan || '-'}</strong></div>
                  {member.nomor_anggota && <div>🔑 No. Anggota: <strong>{member.nomor_anggota}</strong></div>}
                  {member.kode_pendaftaran && (member.status === 'Aktif' || member.status === 'Alumni') && (
                    <div style={{ color: 'var(--accent)', fontWeight: 600 }}>🔑 Kode Aktivasi: {member.kode_pendaftaran}</div>
                  )}
                  {member.total_latihan !== undefined && member.status === 'Aktif' && (
                    <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px dashed var(--border-color)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem', fontSize: '0.85rem' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>📅 Kehadiran Latihan:</span>
                        <strong style={{ color: 'var(--text-primary)' }}>
                          {member.hadir_latihan || 0} / {member.total_latihan || 0} ({member.total_latihan > 0 ? Math.round(((member.hadir_latihan || 0) / member.total_latihan) * 100) : 0}%)
                        </strong>
                      </div>
                      <div style={{ width: '100%', height: '6px', background: 'var(--border-color)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                        <div
                          style={{
                            width: `${member.total_latihan > 0 ? Math.min(100, Math.round(((member.hadir_latihan || 0) / member.total_latihan) * 100)) : 0}%`,
                            height: '100%',
                            background: (member.hadir_latihan || 0) === member.total_latihan && member.total_latihan > 0 ? 'var(--success)' : 'var(--primary)',
                            borderRadius: 'var(--radius-full)',
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Action buttons (Admin only) */}
              {isAdmin && (
                <div
                  style={{
                    borderTop: '1px solid var(--border-color)',
                    paddingTop: '1rem',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: '0.5rem',
                  }}
                >
                  <button
                    onClick={() => handleOpenEditModal(member)}
                    className="btn btn-outline"
                    style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                    title="Edit info anggota"
                  >
                    ✏️ Edit
                  </button>
                  {(member.status === 'Aktif' || member.status === 'Alumni') && (
                    <button
                      onClick={() => handleDownloadNametag(member)}
                      className="btn btn-outline"
                      style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', borderColor: 'var(--accent)', color: 'var(--accent)' }}
                      title="Unduh nametag anggota"
                    >
                      📥 Nametag
                    </button>
                  )}
                  {member.status === 'Aktif' ? (
                    <button
                      onClick={() => handleStatusChange(member, 'Alumni')}
                      className="btn btn-outline"
                      style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', borderColor: 'var(--primary)', color: 'var(--primary)' }}
                      title="Ubah menjadi alumni"
                    >
                      🎓 Luluskan
                    </button>
                  ) : (
                    <button
                      onClick={() => handleStatusChange(member, 'Aktif')}
                      className="btn btn-outline"
                      style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', borderColor: 'var(--success)', color: 'var(--success)' }}
                      title="Ubah menjadi aktif"
                    >
                      🎷 Aktifkan
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(member)}
                    className="btn btn-outline"
                    style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', borderColor: 'var(--danger)', color: 'var(--danger)' }}
                    title="Hapus data"
                  >
                    🗑️ Hapus
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Edit/Add Modal Overlay */}
      {isModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 100,
            padding: '1rem',
            backdropFilter: 'blur(4px)',
          }}
        >
          <div
            className="glass"
            style={{
              background: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-lg)',
              padding: '2rem',
              width: '100%',
              maxWidth: '480px',
              boxShadow: 'var(--shadow-xl)',
              animation: 'slideUp 0.3s ease-out',
            }}
          >
            <h2 style={{ margin: '0 0 1.5rem 0', fontFamily: 'var(--font-display)', fontWeight: 700 }}>
              {editingMember ? 'Edit Data Anggota' : 'Tambah Anggota Baru'}
            </h2>

            {formError && (
              <div style={{ color: 'var(--danger)', background: 'var(--danger-light)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', marginBottom: '1rem', fontSize: '0.875rem' }}>
                ⚠️ {formError}
              </div>
            )}

            <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>Nama Lengkap</label>
                <input
                  type="text"
                  required
                  value={formData.nama}
                  onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
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
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>Kelas</label>
                <input
                  type="text"
                  required
                  placeholder="Misal: XI IPA 1"
                  value={formData.kelas}
                  onChange={(e) => setFormData({ ...formData, kelas: e.target.value })}
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
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>Alat Musik (Spesialisasi)</label>
                <input
                  type="text"
                  required
                  placeholder="Misal: Snare Drum, Trumpet, Mellophone"
                  value={formData.alat}
                  onChange={(e) => setFormData({ ...formData, alat: e.target.value })}
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
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>Angkatan (Tahun Masuk)</label>
                <input
                  type="text"
                  required
                  placeholder="Misal: 62"
                  value={formData.angkatan}
                  onChange={(e) => setFormData({ ...formData, angkatan: e.target.value })}
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
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>Status Keanggotaan</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as 'Aktif' | 'Alumni' })}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                  }}
                >
                  <option value="Aktif">Aktif (Pemain)</option>
                  <option value="Alumni">Alumni (Lulus)</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-outline" disabled={isSubmitting}>
                  Batal
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
