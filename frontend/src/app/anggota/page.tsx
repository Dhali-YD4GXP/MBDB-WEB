'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../utils/api';

interface Member {
  id: number;
  nama: string;
  kelas: string;
  alat: string;
  status: 'Aktif' | 'Alumni';
  angkatan?: string;
  created_at: string;
  updated_at: string;
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

  const handlePrintNametag = (member: Member) => {
    const printWindow = window.open('', '_blank', 'width=600,height=500');
    if (!printWindow) {
      alert('Gagal membuka jendela cetak. Pastikan pop-up blocker dinonaktifkan.');
      return;
    }
    
    const doc = printWindow.document;
    doc.write(`
      <html>
        <head>
          <title>Nametag - ${member.nama}</title>
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
            <div class="nama">${member.nama}</div>
            <div class="kelas">${member.kelas}</div>
            <div class="alat">${member.alat || ''}</div>
            <div class="angkatan">${member.angkatan || ''}</div>
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
                  {member.status === 'Aktif' && (
                    <button
                      onClick={() => handlePrintNametag(member)}
                      className="btn btn-outline"
                      style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', borderColor: 'var(--accent)', color: 'var(--accent)' }}
                      title="Cetak nametag anggota"
                    >
                      📇 Nametag
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
                  placeholder="Misal: 2026 atau Angkatan 30"
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
