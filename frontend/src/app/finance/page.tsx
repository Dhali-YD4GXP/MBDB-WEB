'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../utils/api';
import { FinanceSummary, FinanceRecord } from '../../types';

export default function FinancePage() {
  const router = useRouter();
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [role, setRole] = useState<string | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form States
  const [tipe, setTipe] = useState('Kas Masuk');
  const [jumlah, setJumlah] = useState('');
  const [keterangan, setKeterangan] = useState('');
  const [receipt, setReceipt] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size client-side (2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('Ukuran file bukti struk maksimal 2MB.');
      setReceipt(null);
      setReceiptPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Validate type client-side
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!validTypes.includes(file.type)) {
      alert('Format file harus JPG, JPEG, atau PNG.');
      setReceipt(null);
      setReceiptPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setReceipt(file);
    
    // Create preview URL
    const reader = new FileReader();
    reader.onloadend = () => {
      setReceiptPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    // Role guard: Bendahara or Admin
    const token = localStorage.getItem('mbdb_token');
    const storedRole = localStorage.getItem('mbdb_role');
    
    if (!token || (storedRole !== 'Bendahara' && storedRole !== 'Admin')) {
      router.push('/login');
      return;
    }

    setRole(storedRole);
    fetchFinanceData();
  }, [router]);

  const fetchFinanceData = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const data = await api.get<FinanceSummary>('/api/finance');
      setSummary(data);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal mengambil data keuangan.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecordTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const parsedJumlah = parseFloat(jumlah);
    if (isNaN(parsedJumlah) || parsedJumlah <= 0) {
      setErrorMsg('Jumlah transaksi harus lebih besar dari 0.');
      setIsSubmitting(false);
      return;
    }

    if (!keterangan.trim()) {
      setErrorMsg('Keterangan transaksi wajib diisi.');
      setIsSubmitting(false);
      return;
    }

    const formData = new FormData();
    formData.append('tipe', tipe);
    formData.append('jumlah', parsedJumlah.toString());
    formData.append('keterangan', keterangan.trim());
    if (receipt) {
      formData.append('receipt', receipt);
    }

    try {
      await api.upload('/api/finance', formData);

      setSuccessMsg('Transaksi keuangan berhasil dicatat!');
      setJumlah('');
      setKeterangan('');
      setReceipt(null);
      setReceiptPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      
      // Auto-dismiss success message
      setTimeout(() => setSuccessMsg(null), 4000);
      
      // Refresh list
      fetchFinanceData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal mencatat transaksi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div style={{ padding: '3rem 0', minHeight: '80vh' }}>
      <div className="container">
        {/* Title */}
        <div style={{ marginBottom: '2.5rem' }}>
          <h1 style={{ fontSize: '2.25rem', fontWeight: 800, marginBottom: '0.5rem' }}>
            Pencatatan Keuangan (Kas MBDB)
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Halaman internal Bendahara dan Admin untuk mencatat serta meninjau kas masuk dan kas keluar.
          </p>
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
            ⚠️ {errorMsg}
          </div>
        )}

        {successMsg && (
          <div
            style={{
              padding: '1rem',
              backgroundColor: 'var(--success-light)',
              color: 'var(--success)',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.875rem',
              marginBottom: '1.5rem',
              border: '1px solid rgba(16, 185, 129, 0.2)',
            }}
          >
            ✓ {successMsg}
          </div>
        )}

        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem 0' }}>
            <svg
              style={{ animation: 'spin 1s linear infinite' }}
              width="36"
              height="36"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--accent)"
              strokeWidth="3"
            >
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
          </div>
        ) : !summary ? (
          <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
            Gagal memuat ringkasan keuangan.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
            
            {/* 1. Metrics Banner */}
            <div style={{ display: 'grid', gap: '1.5rem' }} className="metrics-grid">
              
              {/* Cash In */}
              <div className="card glass" style={{ borderLeft: '4px solid var(--success)' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                  Total Kas Masuk
                </div>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--success)' }}>
                  {formatRupiah(summary.total_masuk)}
                </div>
              </div>

              {/* Cash Out */}
              <div className="card glass" style={{ borderLeft: '4px solid var(--danger)' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                  Total Kas Keluar
                </div>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--danger)' }}>
                  {formatRupiah(summary.total_keluar)}
                </div>
              </div>

              {/* Balance */}
              <div
                className="card glass"
                style={{
                  borderLeft: `4px solid ${summary.saldo >= 0 ? 'var(--accent)' : 'var(--danger)'}`,
                  background: 'linear-gradient(135deg, rgba(245, 166, 35, 0.05) 0%, rgba(211, 47, 47, 0.05) 100%)',
                }}
              >
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                  Saldo Kas Saat Ini
                </div>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: summary.saldo >= 0 ? 'var(--text-primary)' : 'var(--danger)' }}>
                  {formatRupiah(summary.saldo)}
                </div>
              </div>
            </div>

            {/* 2. Split Screen: Record Form & History Log */}
            <div style={{ display: 'grid', gap: '2rem' }} className="main-grid">
              
              {/* Left Column: Form */}
              <div>
                <div className="card glass" style={{ position: 'sticky', top: '100px' }}>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem', color: 'var(--accent)' }}>
                    Catat Kas Masuk / Keluar
                  </h2>

                  <form onSubmit={handleRecordTransaction} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div className="form-group">
                      <label className="form-label">Tipe Transaksi</label>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {['Kas Masuk', 'Kas Keluar'].map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setTipe(t)}
                            className={`btn ${tipe === t ? 'btn-primary' : 'btn-secondary'}`}
                            style={{ flex: 1, padding: '0.5rem', fontSize: '0.875rem' }}
                            disabled={isSubmitting}
                          >
                            {t === 'Kas Masuk' ? '📥 Masuk' : '📤 Keluar'}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Jumlah Uang (Rupiah)</label>
                      <input
                        type="number"
                        className="form-input"
                        placeholder="Contoh: 50000"
                        value={jumlah}
                        onChange={(e) => setJumlah(e.target.value)}
                        required
                        min="1"
                        disabled={isSubmitting}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Keterangan Transaksi</label>
                      <textarea
                        className="form-input"
                        placeholder="Contoh: Uang iuran latihan anggota, Pembelian mallet snare"
                        value={keterangan}
                        onChange={(e) => setKeterangan(e.target.value)}
                        required
                        style={{ minHeight: '80px', resize: 'vertical' }}
                        disabled={isSubmitting}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Bukti Struk Belanja (Opsional, Maks 2MB)</label>
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept=".jpg,.jpeg,.png"
                        style={{ display: 'none' }}
                      />
                      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <button
                          type="button"
                          className="btn btn-outline"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isSubmitting}
                          style={{ flex: 1, padding: '0.6rem 1rem', fontSize: '0.875rem' }}
                        >
                          📂 {receipt ? 'Ubah File Struk' : 'Pilih Struk'}
                        </button>
                        {receipt && (
                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => {
                              setReceipt(null);
                              setReceiptPreview(null);
                              if (fileInputRef.current) fileInputRef.current.value = '';
                            }}
                            style={{ color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.2)', padding: '0.6rem 1rem', fontSize: '0.875rem' }}
                          >
                            ✕ Hapus
                          </button>
                        )}
                      </div>
                      
                      {/* Receipt Preview */}
                      {receiptPreview && (
                        <div
                          style={{
                            marginTop: '0.75rem',
                            width: '100%',
                            maxHeight: '150px',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--border-color)',
                            overflow: 'hidden',
                            backgroundColor: 'var(--bg-tertiary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <img src={receiptPreview} alt="Pratinjau Struk" style={{ maxWidth: '100%', maxHeight: '150px', objectFit: 'contain' }} />
                        </div>
                      )}
                    </div>

                    <button
                      type="submit"
                      className="btn btn-accent"
                      style={{ width: '100%', padding: '0.8rem', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? 'Mencatat...' : 'Catat Transaksi'}
                    </button>
                  </form>
                </div>
              </div>

              {/* Right Column: History List */}
              <div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1.25rem', borderLeft: '4px solid var(--primary)', paddingLeft: '0.75rem' }}>
                  📜 Riwayat Aliran Kas
                </h2>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {summary.records.length === 0 ? (
                    <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                      Belum ada transaksi keuangan yang tercatat.
                    </div>
                  ) : (
                    summary.records.map((rec) => (
                      <div
                        key={rec.id}
                        className="card animate-fade-in"
                        style={{
                          padding: '1.25rem 1.5rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: '1rem',
                        }}
                      >
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
                            <span
                              style={{
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                padding: '0.15rem 0.5rem',
                                borderRadius: 'var(--radius-sm)',
                                backgroundColor: rec.tipe === 'Kas Masuk' ? 'var(--success-light)' : 'var(--danger-light)',
                                color: rec.tipe === 'Kas Masuk' ? 'var(--success)' : 'var(--danger)',
                                border: `1px solid ${rec.tipe === 'Kas Masuk' ? 'rgba(46, 125, 50, 0.2)' : 'rgba(198, 40, 40, 0.2)'}`,
                              }}
                            >
                              {rec.tipe.toUpperCase()}
                            </span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                              {formatDate(rec.timestamp)}
                            </span>
                          </div>

                          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.25rem' }}>{rec.keterangan}</h3>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                            Dicatat oleh:{' '}
                            <strong style={{ color: 'var(--text-secondary)' }}>{rec.created_by_user?.username || 'Unknown'}</strong>
                          </div>
                          {rec.receipt_path && (
                            <div style={{ marginTop: '0.5rem' }}>
                              <button
                                type="button"
                                onClick={() => window.open(api.getMediaUrl(rec.receipt_path || ''), '_blank')}
                                className="btn btn-outline"
                                style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem', borderRadius: 'var(--radius-sm)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                              >
                                📄 Lihat Bukti Struk
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Amount */}
                        <div
                          style={{
                            fontSize: '1.3rem',
                            fontWeight: 800,
                            color: rec.tipe === 'Kas Masuk' ? 'var(--success)' : 'var(--danger)',
                          }}
                        >
                          {rec.tipe === 'Kas Masuk' ? '+' : '-'} {formatRupiah(rec.jumlah)}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @media (min-width: 768px) {
          .metrics-grid {
            grid-template-columns: repeat(3, 1fr) !important;
          }
        }
        @media (min-width: 1024px) {
          .main-grid {
            grid-template-columns: 1fr 2fr !important;
          }
        }
      `}</style>
    </div>
  );
}
