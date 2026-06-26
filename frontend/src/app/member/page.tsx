'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { jsPDF } from 'jspdf';
import { api } from '../../utils/api';
import QRScanner from '../../components/QRScanner';

interface Member {
  id: number;
  nomor_anggota: string;
  nama: string;
  kelas: string;
  alat: string;
  status: 'Aktif' | 'Alumni';
  angkatan?: string;
  kode_pendaftaran?: string;
  created_at: string;
  updated_at: string;
}

export default function MemberDashboard() {
  const router = useRouter();
  const [profile, setProfile] = useState<{ id: number; username: string; role: string; member?: Member } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Held Instruments State
  const [myInstruments, setMyInstruments] = useState<any[]>([]);
  const [isLoadingInstruments, setIsLoadingInstruments] = useState(false);

  // Scanner and Scan Results states
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isValidatingQR, setIsValidatingQR] = useState(false);
  const [scanResult, setScanResult] = useState<{
    type: 'success' | 'error' | 'info';
    title: string;
    message: string;
  } | null>(null);

  // Confirmation modal states
  const [confirmPractice, setConfirmPractice] = useState<{ session: any; token: string } | null>(null);
  const [confirmCompetition, setConfirmCompetition] = useState<{ session: any; rosterItem: any; token: string } | null>(null);
  const [isSubmittingAttendance, setIsSubmittingAttendance] = useState(false);
  const [alasanTerlambat, setAlasanTerlambat] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('mbdb_token');
    const role = localStorage.getItem('mbdb_role');

    if (!token || role !== 'Member') {
      router.push('/login');
      return;
    }

    fetchProfile();
    fetchMyInstruments();
  }, [router]);

  const fetchProfile = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.get<any>('/api/auth/me');
      setProfile(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Gagal memuat profil anggota');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMyInstruments = async () => {
    setIsLoadingInstruments(true);
    try {
      const data = await api.get<any[]>('/api/instruments/my');
      setMyInstruments(data);
    } catch (err) {
      console.error('Gagal mengambil data alat yang dipegang:', err);
    } finally {
      setIsLoadingInstruments(false);
    }
  };

  const handleReleaseInstrument = async (id: string) => {
    if (!window.confirm('Apakah Anda yakin ingin mengembalikan alat musik ini ke gudang?')) return;
    try {
      await api.post(`/api/instruments/${id}/release`, {});
      setScanResult({
        type: 'success',
        title: 'Alat Dikembalikan',
        message: 'Alat musik berhasil dikembalikan ke inventaris gudang.',
      });
      fetchMyInstruments();
    } catch (err: any) {
      setScanResult({
        type: 'error',
        title: 'Gagal Mengembalikan',
        message: err.message || 'Terjadi kesalahan saat mengembalikan alat musik.',
      });
    }
  };

  const handleDownloadNametag = () => {
    if (!profile?.member) return;
    const member = profile.member;

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

  const handleScanSuccess = async (decodedText: string) => {
    setIsScannerOpen(false);
    setScanResult(null);
    setConfirmPractice(null);
    setConfirmCompetition(null);
    setIsValidatingQR(true);

    // Extract token if scanned text is a URL
    let token = decodedText.trim();
    if (decodedText.startsWith('http://') || decodedText.startsWith('https://')) {
      try {
        const url = new URL(decodedText);
        token = url.searchParams.get('token') || decodedText;
      } catch (e) {
        // fallback to original string
      }
    }

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

      // 1. Check if token belongs to an active Practice Session
      const practiceRes = await fetch(`${baseUrl}/api/public/practice-sessions/${token}`);
      if (practiceRes.ok) {
        const session = await practiceRes.json();
        setAlasanTerlambat('');
        setConfirmPractice({ session, token });
        setIsValidatingQR(false);
        return;
      }

      // 2. Check if token belongs to an active Competition Session
      const competitionRes = await fetch(`${baseUrl}/api/public/competition-sessions/${token}`);
      if (competitionRes.ok) {
        const session = await competitionRes.json();
        const rosterItem = session.roster?.find(
          (r: any) => r.nama.toLowerCase() === profile?.member?.nama.toLowerCase()
        );

        if (!rosterItem) {
          setScanResult({
            type: 'error',
            title: 'Tidak Terdaftar',
            message: `Nama Anda tidak terdaftar dalam roster keberangkatan untuk lomba "${session.title}". Silakan hubungi admin.`,
          });
          setIsValidatingQR(false);
          return;
        }

        setConfirmCompetition({ session, rosterItem, token });
        setIsValidatingQR(false);
        return;
      }

      // 3. Neither session token matched. Assume this is an Instrument ID.
      const isAlreadyHeld = myInstruments.some((inst) => inst.id === token);
      if (isAlreadyHeld) {
        const releaseRes = await api.post<any>(`/api/instruments/${token}/release`, {});
        setScanResult({
          type: 'success',
          title: 'Alat Dikembalikan!',
          message: releaseRes.message || 'Alat musik berhasil dikembalikan ke inventaris gudang.',
        });
      } else {
        const claimRes = await api.post<any>(`/api/instruments/${token}/claim`, {});
        setScanResult({
          type: 'success',
          title: 'Klaim Alat Berhasil!',
          message: claimRes.message || `Anda sekarang terdaftar sebagai pemegang terakhir alat ini.`,
        });
      }
      fetchMyInstruments();
    } catch (err: any) {
      console.error('Scan handling failed:', err);
      setScanResult({
        type: 'error',
        title: 'Scan Gagal',
        message: err.message || 'QR Code tidak dikenali sebagai kode alat musik maupun sesi presensi aktif.',
      });
    } finally {
      setIsValidatingQR(false);
    }
  };

  const isLate = (sess: any) => {
    if (!sess || !sess.tanggal_mulai || !sess.jam_mulai) return false;
    const [year, month, day] = sess.tanggal_mulai.split('-').map(Number);
    const [hour, minute] = sess.jam_mulai.split(':').map(Number);
    const scheduledDate = new Date(year, month - 1, day, hour, minute, 0);
    const now = new Date();
    return now > scheduledDate;
  };

  const handleConfirmPracticeAttendance = async () => {
    if (!confirmPractice || !profile?.member) return;
    
    if (isLate(confirmPractice.session) && !alasanTerlambat.trim()) {
      alert('Anda terlambat! Harap masukkan alasan keterlambatan.');
      return;
    }

    setIsSubmittingAttendance(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
      const response = await fetch(`${baseUrl}/api/public/practice-sessions/${confirmPractice.token}/attend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nama: profile.member.nama,
          alat: profile.member.alat,
          alasan_terlambat: alasanTerlambat,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Gagal mengirim data presensi');
      }

      setScanResult({
        type: 'success',
        title: 'Presensi Selesai!',
        message: `Presensi Anda pada sesi latihan "${confirmPractice.session.title}" berhasil dicatat. Selamat berlatih!`,
      });
    } catch (err: any) {
      setScanResult({
        type: 'error',
        title: 'Gagal Presensi',
        message: err.message || 'Terjadi kesalahan saat memproses presensi latihan Anda.',
      });
    } finally {
      setIsSubmittingAttendance(false);
      setConfirmPractice(null);
    }
  };

  const handleConfirmCompetitionAttendance = async () => {
    if (!confirmCompetition) return;
    setIsSubmittingAttendance(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
      const response = await fetch(`${baseUrl}/api/public/competition-sessions/${confirmCompetition.token}/attend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roster_id: confirmCompetition.rosterItem.id,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Gagal mengirim data presensi');
      }

      setScanResult({
        type: 'success',
        title: 'Presensi Selesai!',
        message: `Keberangkatan Anda untuk lomba "${confirmCompetition.session.title}" berhasil dicatat. Selamat berjuang!`,
      });
    } catch (err: any) {
      setScanResult({
        type: 'error',
        title: 'Gagal Presensi',
        message: err.message || 'Terjadi kesalahan saat memproses presensi lomba Anda.',
      });
    } finally {
      setIsSubmittingAttendance(false);
      setConfirmCompetition(null);
    }
  };

  if (isLoading) {
    return (
      <div className="container" style={{ padding: '3rem 1rem', textAlign: 'center' }}>
        <div className="spinner"></div>
        <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>Memuat profil dashboard...</p>
      </div>
    );
  }

  if (error || !profile?.member) {
    return (
      <div className="container" style={{ padding: '3rem 1rem', textAlign: 'center' }}>
        <div className="glass" style={{ padding: '2rem', maxWidth: '480px', margin: '0 auto', borderRadius: 'var(--radius-md)' }}>
          <p style={{ color: 'var(--danger)', fontWeight: 600 }}>⚠️ {error || 'Data profil tidak lengkap.'}</p>
          <button onClick={fetchProfile} className="btn btn-outline" style={{ marginTop: '1rem' }}>Coba Lagi</button>
        </div>
      </div>
    );
  }

  const member = profile.member;

  return (
    <div className="container" style={{ padding: '2rem 1rem', maxWidth: '600px' }}>
      
      {/* Profile Info Glass Card */}
      <div
        className="glass animate-slide-up"
        style={{
          padding: '2.5rem 2rem',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg)',
          marginBottom: '2rem',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Sleek Golden Decorative Line */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '4px',
          background: 'linear-gradient(90deg, var(--accent) 0%, #ffb300 100%)',
        }} />

        {/* Member Initial Avatar */}
        <div
          style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            backgroundColor: 'var(--accent-light)',
            color: 'var(--accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2rem',
            fontWeight: 800,
            margin: '0 auto 1.5rem auto',
            border: '2px solid var(--accent)',
            boxShadow: 'var(--shadow-gold)',
          }}
        >
          {member.nama ? member.nama.charAt(0).toUpperCase() : 'M'}
        </div>

        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 0.25rem 0', fontFamily: 'var(--font-display)' }}>
          {member.nama}
        </h1>
        <p style={{ color: 'var(--accent)', fontWeight: 700, fontSize: '1rem', letterSpacing: '0.05em', margin: '0 0 1.5rem 0' }}>
          {member.nomor_anggota}
        </p>

        {/* Details Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '1.25rem',
            textAlign: 'left',
            padding: '1.5rem',
            backgroundColor: 'rgba(255, 255, 255, 0.03)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-color)',
            marginBottom: '2rem',
          }}
        >
          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block' }}>Kelas</span>
            <strong style={{ fontSize: '1rem' }}>{member.kelas}</strong>
          </div>
          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block' }}>Alat / Seksi</span>
            <strong style={{ fontSize: '1rem' }}>{member.alat}</strong>
          </div>
          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block' }}>Angkatan</span>
            <strong style={{ fontSize: '1rem' }}>{member.angkatan || '-'}</strong>
          </div>
          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block' }}>Status</span>
            <strong style={{ fontSize: '1rem', color: 'var(--success)' }}>{member.status}</strong>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <button
            onClick={() => setIsScannerOpen(true)}
            className="btn btn-primary"
            style={{
              padding: '1rem',
              fontSize: '1.1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              fontWeight: 700,
              boxShadow: 'var(--shadow-gold)',
            }}
          >
            📷 Pindai QR Code
          </button>
          
          <button
            onClick={handleDownloadNametag}
            className="btn btn-outline"
            style={{
              padding: '0.85rem',
              fontSize: '1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              borderColor: 'var(--accent)',
              color: 'var(--accent)',
            }}
          >
            📥 Unduh Name Tag (PDF)
          </button>
        </div>
      </div>

      {/* List of Held Instruments */}
      <div
        className="glass animate-slide-up"
        style={{
          padding: '2rem',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg)',
          marginBottom: '2rem',
          animationDelay: '0.1s',
        }}
      >
        <h2
          style={{
            fontSize: '1.25rem',
            fontWeight: 800,
            marginBottom: '1rem',
            fontFamily: 'var(--font-display)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          🎺 Alat yang Sedang Anda Pegang
        </h2>

        {isLoadingInstruments ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '1rem 0' }}>
            <div className="spinner"></div>
          </div>
        ) : myInstruments.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
            Anda sedang tidak memegang alat musik apa pun. Silakan scan QR code pada alat musik untuk mengklaim.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {myInstruments.map((inst) => (
              <div
                key={inst.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '1rem',
                  backgroundColor: 'rgba(255, 255, 255, 0.02)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                }}
              >
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>{inst.jenis_alat}</h4>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                    ID: {inst.id}
                  </span>
                  <div style={{ marginTop: '0.25rem' }}>
                    <span
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        padding: '0.1rem 0.5rem',
                        borderRadius: 'var(--radius-full)',
                        backgroundColor:
                          inst.kondisi === 'Bagus'
                            ? 'var(--success-light)'
                            : inst.kondisi === 'Butuh Perbaikan'
                            ? 'var(--warning-light)'
                            : 'var(--danger-light)',
                        color:
                          inst.kondisi === 'Bagus'
                            ? 'var(--success)'
                            : inst.kondisi === 'Butuh Perbaikan'
                            ? 'var(--warning)'
                            : 'var(--danger)',
                      }}
                    >
                      {inst.kondisi}
                    </span>
                  </div>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  🔒 Pindai QR Ulang untuk Mengembalikan
                </div>
              </div>
            ))}
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontStyle: 'italic', marginTop: '0.5rem', textAlign: 'center' }}>
              Untuk mengembalikan alat ke gudang, silakan pindai ulang QR Code pada fisik alat musik.
            </p>
          </div>
        )}
      </div>

      {/* QR Code Scan Result Modal */}
      {scanResult && (
        <div
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            padding: '1rem',
          }}
        >
          <div
            className="glass"
            style={{
              width: '100%',
              maxWidth: '420px',
              padding: '2rem',
              borderRadius: 'var(--radius-lg)',
              textAlign: 'center',
              boxShadow: 'var(--shadow-xl)',
              animation: 'scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
          >
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>
              {scanResult.type === 'success' ? '✅' : scanResult.type === 'error' ? '❌' : 'ℹ️'}
            </div>
            <h2
              style={{
                fontSize: '1.5rem',
                fontWeight: 800,
                color: scanResult.type === 'success' ? 'var(--success)' : scanResult.type === 'error' ? 'var(--danger)' : 'var(--primary)',
                marginBottom: '1rem',
                fontFamily: 'var(--font-display)',
              }}
            >
              {scanResult.title}
            </h2>
            <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '1.5rem' }}>
              {scanResult.message}
            </p>
            <button
              onClick={() => setScanResult(null)}
              className="btn btn-secondary"
              style={{ width: '100%' }}
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* QR Code Validation Pending Modal */}
      {isValidatingQR && (
        <div
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
          }}
        >
          <div className="glass" style={{ padding: '2.5rem', borderRadius: 'var(--radius-lg)', textAlign: 'center' }}>
            <div className="spinner"></div>
            <p style={{ marginTop: '1rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Memverifikasi QR Code...</p>
          </div>
        </div>
      )}

      {/* Practice Session Attendance Confirmation Modal */}
      {confirmPractice && (
        <div
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            padding: '1rem',
          }}
        >
          <div
            className="glass"
            style={{
              width: '100%',
              maxWidth: '420px',
              padding: '2rem',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-xl)',
            }}
          >
            <h3 style={{ fontSize: '1.35rem', fontWeight: 800, marginBottom: '1rem', fontFamily: 'var(--font-display)' }}>
              Konfirmasi Presensi Latihan
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '1.5rem' }}>
              Apakah Anda ingin mengirim data presensi untuk sesi latihan <strong>{confirmPractice.session.title}</strong>?
            </p>

            {isLate(confirmPractice.session) && (
              <div style={{ marginBottom: '1.5rem', textAlign: 'left' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--danger)' }}>
                  ⚠️ Anda Terlambat. Silakan isi alasan keterlambatan:
                </label>
                <textarea
                  required
                  placeholder="Tulis alasan keterlambatan Anda di sini..."
                  value={alasanTerlambat}
                  onChange={(e) => setAlasanTerlambat(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    minHeight: '80px',
                    fontSize: '0.9rem',
                    resize: 'vertical',
                  }}
                />
              </div>
            )}
            
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                onClick={() => setConfirmPractice(null)}
                className="btn btn-secondary"
                style={{ flex: 1 }}
                disabled={isSubmittingAttendance}
              >
                Batal
              </button>
              <button
                onClick={handleConfirmPracticeAttendance}
                className="btn btn-primary"
                style={{ flex: 1 }}
                disabled={isSubmittingAttendance}
              >
                {isSubmittingAttendance ? 'Mengirim...' : 'Ya, Hadir'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Competition Session Attendance Confirmation Modal */}
      {confirmCompetition && (
        <div
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            padding: '1rem',
          }}
        >
          <div
            className="glass"
            style={{
              width: '100%',
              maxWidth: '420px',
              padding: '2rem',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-xl)',
            }}
          >
            <h3 style={{ fontSize: '1.35rem', fontWeight: 800, marginBottom: '1rem', fontFamily: 'var(--font-display)' }}>
              Konfirmasi Keberangkatan Lomba
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '1.5rem' }}>
              Apakah Anda ingin mengirim presensi keberangkatan untuk lomba <strong>{confirmCompetition.session.title}</strong>?<br />
              Nama Anda terdaftar sebagai roster <strong>{confirmCompetition.rosterItem.nama}</strong> ({confirmCompetition.rosterItem.alat}).
            </p>
            
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                onClick={() => setConfirmCompetition(null)}
                className="btn btn-secondary"
                style={{ flex: 1 }}
                disabled={isSubmittingAttendance}
              >
                Batal
              </button>
              <button
                onClick={handleConfirmCompetitionAttendance}
                className="btn btn-primary"
                style={{ flex: 1 }}
                disabled={isSubmittingAttendance}
              >
                {isSubmittingAttendance ? 'Mengirim...' : 'Ya, Berangkat'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Camera QR Scanner Overlay */}
      <QRScanner
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={handleScanSuccess}
      />

      <style jsx global>{`
        @keyframes scaleIn {
          from {
            transform: scale(0.9);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
