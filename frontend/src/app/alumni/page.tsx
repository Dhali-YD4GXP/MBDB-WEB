'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

interface Alumni {
  id: number;
  nama: string;
  angkatan: string;
  alat: string;
}

export default function DaftarAlumniPage() {
  const [alumniList, setAlumniList] = useState<Alumni[]>([]);
  const [filteredAlumni, setFilteredAlumni] = useState<Alumni[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAlumni();
  }, []);

  const fetchAlumni = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
      const response = await fetch(`${baseUrl}/api/public/alumni`);
      if (!response.ok) {
        throw new Error('Gagal mengambil daftar alumni');
      }
      const data = await response.json();
      setAlumniList(data);
      setFilteredAlumni(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Terjadi kesalahan saat memuat data alumni.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const term = search.toLowerCase().trim();
    if (term === '') {
      setFilteredAlumni(alumniList);
    } else {
      const filtered = alumniList.filter(
        (a) =>
          a.nama.toLowerCase().includes(term) ||
          a.angkatan.toLowerCase().includes(term) ||
          a.alat.toLowerCase().includes(term)
      );
      setFilteredAlumni(filtered);
    }
  }, [search, alumniList]);

  return (
    <div className="container" style={{ padding: '3rem 1rem', maxWidth: '800px' }}>
      <div
        className="glass animate-slide-up"
        style={{
          padding: '2.5rem 2rem',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg)',
          textAlign: 'center',
          marginBottom: '2rem',
        }}
      >
        <span style={{ fontSize: '2.5rem', display: 'inline-block', marginBottom: '1rem' }}>🎓</span>
        <h1
          style={{
            fontSize: '2rem',
            fontWeight: 800,
            background: 'linear-gradient(135deg, var(--text-primary) 0%, var(--accent) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '0.5rem',
            fontFamily: 'var(--font-display)',
          }}
        >
          Daftar Alumni MBDB
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', maxWidth: '600px', margin: '0 auto 1.5rem auto' }}>
          Halaman publik untuk mencari dan melihat keanggotaan alumni MBDB Smansaagung. Jika nama Anda belum terdaftar, silakan hubungi pengurus atau admin.
        </p>

        {/* Search Bar */}
        <div style={{ position: 'relative', width: '100%', maxWidth: '500px', margin: '0 auto' }}>
          <input
            type="text"
            placeholder="Cari nama, angkatan, atau alat..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '0.85rem 1.25rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-primary)',
              color: 'var(--text-primary)',
              fontSize: '1rem',
              outline: 'none',
              boxShadow: 'var(--shadow-sm)',
            }}
          />
        </div>
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '3rem 0' }}>
          <div className="spinner"></div>
          <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>Memuat data alumni...</p>
        </div>
      ) : error ? (
        <div className="glass" style={{ padding: '2rem', textAlign: 'center', borderRadius: 'var(--radius-md)', border: '1px solid var(--danger-light)' }}>
          <p style={{ color: 'var(--danger)', fontWeight: 600 }}>⚠️ {error}</p>
          <button onClick={fetchAlumni} className="btn btn-outline" style={{ marginTop: '1rem' }}>Coba Lagi</button>
        </div>
      ) : filteredAlumni.length === 0 ? (
        <div className="glass" style={{ padding: '3rem', textAlign: 'center', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)' }}>
          <p style={{ fontSize: '1.1rem', margin: 0 }}>Tidak ada data alumni yang cocok dengan pencarian Anda.</p>
        </div>
      ) : (
        <div className="glass animate-slide-up" style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-md)' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.95rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'rgba(255, 255, 255, 0.02)' }}>
                  <th style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Nama Lengkap</th>
                  <th style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Angkatan</th>
                  <th style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Alat / Seksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredAlumni.map((alumni) => (
                  <tr
                    key={alumni.id}
                    style={{
                      borderBottom: '1px solid var(--border-color)',
                      transition: 'background var(--transition-fast)',
                    }}
                    className="table-row-hover"
                  >
                    <td style={{ padding: '1rem 1.5rem', fontWeight: 600, color: 'var(--text-primary)' }}>{alumni.nama}</td>
                    <td style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)' }}>{alumni.angkatan}</td>
                    <td style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)' }}>{alumni.alat}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div style={{ textAlign: 'center', marginTop: '2rem' }}>
        <Link href="/aktivasi" style={{ color: 'var(--accent)', fontWeight: 600, textDecoration: 'underline', fontSize: '0.95rem' }}>
          Kembali ke Halaman Aktivasi Akun
        </Link>
      </div>

      <style jsx global>{`
        .table-row-hover:hover {
          background-color: rgba(255, 255, 255, 0.01);
        }
      `}</style>
    </div>
  );
}
