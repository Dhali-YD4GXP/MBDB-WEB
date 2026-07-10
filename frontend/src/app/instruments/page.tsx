'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import QRCode from 'qrcode';
import { jsPDF } from 'jspdf';
import { api } from '../../utils/api';
import { Instrument } from '../../types';

export default function InstrumentsPage() {
  const router = useRouter();
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [role, setRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Registration Form
  const [jenisAlat, setJenisAlat] = useState('');
  const [kondisi, setKondisi] = useState('Bagus');
  const [namaPengguna, setNamaPengguna] = useState('');
  const [catatanKerusakan, setCatatanKerusakan] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Edit Modal State
  const [editingInstrument, setEditingInstrument] = useState<Instrument | null>(null);
  const [editJenisAlat, setEditJenisAlat] = useState('');
  const [editKondisi, setEditKondisi] = useState('Bagus');
  const [editNamaPengguna, setEditNamaPengguna] = useState('');
  const [editCatatanKerusakan, setEditCatatanKerusakan] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  
  // QR Code Generation Modal
  const [generatedInstrument, setGeneratedInstrument] = useState<Instrument | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  
  // Search / Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterKondisi, setFilterKondisi] = useState('');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isPrintingBluetooth, setIsPrintingBluetooth] = useState(false);

  useEffect(() => {
    // Auth Guard
    const token = localStorage.getItem('mbdb_token');
    const storedRole = localStorage.getItem('mbdb_role');
    if (!token) {
      router.push('/login');
      return;
    }
    setRole(storedRole);
    fetchInstruments();
  }, [router, filterKondisi]);

  const fetchInstruments = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      let path = '/api/instruments';
      const params = [];
      if (filterKondisi) params.push(`kondisi=${filterKondisi}`);
      if (params.length > 0) {
        path += `?${params.join('&')}`;
      }
      
      const data = await api.get<Instrument[]>(path);
      setInstruments(data);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal mengambil data inventaris alat.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    if (!jenisAlat || !kondisi) {
      setErrorMsg('Jenis Alat dan Kondisi wajib diisi.');
      setIsSubmitting(false);
      return;
    }

    try {
      const newInst = await api.post<Instrument>('/api/instruments', {
        jenis_alat: jenisAlat,
        kondisi: kondisi,
        nama_pengguna_terakhir: namaPengguna || undefined,
        catatan_kerusakan: catatanKerusakan || undefined,
      });

      // Generate QR Code data URL
      const qrDataUrl = await QRCode.toDataURL(newInst.id, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      });

      setGeneratedInstrument(newInst);
      setQrCodeUrl(qrDataUrl);

      // Reset Form
      setJenisAlat('');
      setKondisi('Bagus');
      setNamaPengguna('');
      setCatatanKerusakan('');

      // Refresh list
      fetchInstruments();
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal mendaftarkan alat baru.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrintBluetooth = async (inst: Instrument) => {
    const nav = navigator as any;
    if (!nav.bluetooth) {
      alert('Browser Anda tidak mendukung Web Bluetooth. Silakan gunakan Google Chrome di Android atau Desktop.');
      return;
    }

    setIsPrintingBluetooth(true);
    try {
      // 1. Request Bluetooth Device (accept all devices, support standard printer services)
      const device = await nav.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [
          '000018f0-0000-1000-8000-00805f9b34fb', // Standard BLE Printer UUID
          'e7e1a190-273d-11e6-8e5d-0002a5d5c51b', // Common BLE printer UUID
          '4953544c-5b73-4341-4d41-4348494e4553'  // Another common service
        ]
      });

      // 2. Connect to GATT Server
      const server = await device.gatt?.connect();
      if (!server) throw new Error('Gagal terhubung ke server GATT printer.');

      // 3. Find primary service
      const services = await server.getPrimaryServices();
      if (services.length === 0) {
        throw new Error('Tidak ada service primary ditemukan di printer.');
      }
      const service = services[0];

      // 4. Get write characteristic
      const characteristics = await service.getCharacteristics();
      const characteristic = characteristics.find(
        (c: any) => c.properties.write || c.properties.writeWithoutResponse
      );

      if (!characteristic) {
        throw new Error('Karakteristik write printer tidak ditemukan.');
      }

      // 5. Build ESC/POS payload
      const encoder = new TextEncoder();
      const init = new Uint8Array([0x1B, 0x40]); // Initialize printer
      const center = new Uint8Array([0x1B, 0x61, 0x01]); // Align center
      const boldOn = new Uint8Array([0x1B, 0x45, 0x01]); // Bold ON
      const boldOff = new Uint8Array([0x1B, 0x45, 0x00]); // Bold OFF

      // Header Text
      const headerBytes = encoder.encode("MBDB SMANSAAGUNG\nINVENTARIS ALAT\n================================\n");

      // QR Code native printer command
      const qrData = inst.id;
      const qrBytes = encoder.encode(qrData);
      const dataLen = qrBytes.length;

      // GS ( k: model 2 (type 1D 28 6B 04 00 31 41 32 00)
      const qrModel = new Uint8Array([0x1D, 0x28, 0x6B, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00]);
      // GS ( k: set size (type 1D 28 6B 03 00 31 43 size) - using size 8
      const qrSize = new Uint8Array([0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x43, 0x08]);
      // GS ( k: error correction level L (type 1D 28 6B 03 00 31 44 30)
      const qrEC = new Uint8Array([0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x44, 0x30]);
      // GS ( k: store QR data (type 1D 28 6B dataLen+3 00 31 50 30 data)
      const storeLen = dataLen + 3;
      const qrStoreHeader = new Uint8Array([0x1D, 0x28, 0x6B, storeLen & 0xFF, (storeLen >> 8) & 0xFF, 0x31, 0x50, 0x30]);
      // GS ( k: print QR (type 1D 28 6B 03 00 31 51 30)
      const qrPrint = new Uint8Array([0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x51, 0x30]);

      // Instrument Details text
      const idBytes = encoder.encode(`\nID: ${inst.id}\n`);
      const nameBytes = encoder.encode(`ALAT: ${inst.jenis_alat}\n`);
      const footerBytes = encoder.encode("================================\n\n\n\n");

      // Merge all buffers
      const totalLen = init.length + center.length + headerBytes.length +
                       qrModel.length + qrSize.length + qrEC.length +
                       qrStoreHeader.length + qrBytes.length + qrPrint.length +
                       boldOn.length + idBytes.length + boldOff.length +
                       nameBytes.length + footerBytes.length;
      
      const payload = new Uint8Array(totalLen);
      let offset = 0;
      const addChunk = (chunk: Uint8Array) => {
        payload.set(chunk, offset);
        offset += chunk.length;
      };

      addChunk(init);
      addChunk(center);
      addChunk(headerBytes);
      addChunk(qrModel);
      addChunk(qrSize);
      addChunk(qrEC);
      addChunk(qrStoreHeader);
      addChunk(qrBytes);
      addChunk(qrPrint);
      addChunk(boldOn);
      addChunk(idBytes);
      addChunk(boldOff);
      addChunk(nameBytes);
      addChunk(footerBytes);

      // Write in chunks to accommodate BLE MTU size limit (20 bytes safely)
      const chunkSize = 20;
      for (let i = 0; i < payload.length; i += chunkSize) {
        const chunk = payload.slice(i, i + chunkSize);
        await characteristic.writeValue(chunk);
      }

      alert('Berhasil mengirim data cetak ke printer Bluetooth!');
    } catch (err: any) {
      console.error(err);
      alert('Gagal mencetak via Bluetooth: ' + (err.message || err));
    } finally {
      setIsPrintingBluetooth(false);
    }
  };

  const handleOpenEditModal = (inst: Instrument) => {
    setEditingInstrument(inst);
    setEditJenisAlat(inst.jenis_alat);
    setEditKondisi(inst.kondisi);
    setEditNamaPengguna(inst.nama_pengguna_terakhir || '');
    setEditCatatanKerusakan(inst.catatan_kerusakan || '');
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingInstrument) return;
    setIsUpdating(true);
    setErrorMsg(null);

    try {
      await api.put(`/api/instruments/${editingInstrument.id}`, {
        jenis_alat: editJenisAlat,
        kondisi: editKondisi,
        nama_pengguna_terakhir: editNamaPengguna || '',
        catatan_kerusakan: editCatatanKerusakan || '',
      });

      // Close modal
      setEditingInstrument(null);
      // Refresh list
      fetchInstruments();
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal memperbarui data alat.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(`Apakah Anda yakin ingin menghapus alat ${id} dari inventaris?`)) return;

    setErrorMsg(null);
    try {
      await api.delete(`/api/instruments/${id}`);
      setInstruments((prev) => prev.filter((inst) => inst.id !== id));
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menghapus alat.');
    }
  };

  const handleDownloadQR = () => {
    if (!qrCodeUrl || !generatedInstrument) return;
    const a = document.createElement('a');
    a.href = qrCodeUrl;
    a.download = `QR_${generatedInstrument.id}_${generatedInstrument.jenis_alat.replace(/\s+/g, '_')}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const handleDownloadAllQR = async () => {
    if (filteredInstruments.length === 0) return;
    setIsGeneratingPdf(true);
    try {
      const qrPromises = filteredInstruments.map(async (inst) => {
        const qrUrl = await QRCode.toDataURL(inst.id, {
          width: 200,
          margin: 1
        });
        return { inst, qrUrl };
      });
      const qrCodes = await Promise.all(qrPromises);
      
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'cm',
        format: 'a4'
      });
      
      const colCount = 4;
      const rowCount = 6;
      const itemsPerPage = colCount * rowCount;
      
      qrCodes.forEach((item, index) => {
        if (index > 0 && index % itemsPerPage === 0) {
          doc.addPage();
        }
        
        const pageIndex = index % itemsPerPage;
        const col = pageIndex % colCount;
        const row = Math.floor(pageIndex / colCount);
        
        // Col width 4.0cm, spacing 0.6cm, margins 1.6cm left/right
        const x = 1.6 + col * (4.0 + 0.6);
        // Row height 4.2cm, spacing 0.4cm, margins 1.25cm top
        const y = 1.25 + row * (4.2 + 0.4);
        
        // Add QR image (centered in the 4.0cm column box, so offset x by 0.5cm)
        doc.addImage(item.qrUrl, 'PNG', x + 0.5, y, 3, 3);
        
        // Draw centered caption text under QR code
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.text(item.inst.id, x + 2.0, y + 3.4, { align: 'center' });
        
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(6.5);
        let labelText = item.inst.jenis_alat;
        if (labelText.length > 22) {
          labelText = labelText.substring(0, 19) + '...';
        }
        doc.text(labelText, x + 2.0, y + 3.9, { align: 'center' });
      });
      
      doc.save('inventaris_qr_codes.pdf');
    } catch (err) {
      console.error('Failed to generate QR PDF', err);
      alert('Gagal membuat file PDF QR Code.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // View QR Code for existing instrument
  const handleViewQR = async (inst: Instrument) => {
    try {
      const qrDataUrl = await QRCode.toDataURL(inst.id, {
        width: 300,
        margin: 2,
      });
      setGeneratedInstrument(inst);
      setQrCodeUrl(qrDataUrl);
    } catch (err) {
      console.error('Failed to generate QR Code', err);
    }
  };

  const getKondisiStyle = (k: string) => {
    switch (k) {
      case 'Bagus':
        return { backgroundColor: 'var(--success-light)', color: 'var(--success)' };
      case 'Butuh Perbaikan':
        return { backgroundColor: 'var(--warning-light)', color: 'var(--warning)' };
      case 'Rusak Total':
        return { backgroundColor: 'var(--danger-light)', color: 'var(--danger)' };
      default:
        return {};
    }
  };

  const filteredInstruments = instruments.filter(
    (inst) =>
      inst.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inst.jenis_alat.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (inst.nama_pengguna_terakhir || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ padding: '3rem 0', minHeight: '80vh' }}>
      <div className="container">
        {/* Title */}
        <div style={{ marginBottom: '2.5rem' }}>
          <h1 style={{ fontSize: '2.25rem', fontWeight: 800, marginBottom: '0.5rem' }}>
            Inventaris Alat Musik
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Daftarkan alat musik baru, buat QR Code label, dan kelola kondisi logistik peralatan marching band.
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
            {errorMsg}
          </div>
        )}

        <div style={{ display: 'grid', gap: '2rem' }} className="main-grid">
          {/* Left Column: Register New Instrument */}
          <div>
            <div className="card glass" style={{ position: 'sticky', top: '100px' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem', color: 'var(--accent)' }}>
                Registrasi Alat Baru
              </h2>
              
              <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div className="form-group">
                  <label className="form-label">Jenis / Nama Alat</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Contoh: Snare Drum Pearl, Trumpet Yamaha"
                    value={jenisAlat}
                    onChange={(e) => setJenisAlat(e.target.value)}
                    required
                    disabled={isSubmitting}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Kondisi Awal</label>
                  <select
                    className="form-input"
                    value={kondisi}
                    onChange={(e) => setKondisi(e.target.value)}
                    required
                    disabled={isSubmitting}
                  >
                    <option value="Bagus">Bagus (Siap Pakai)</option>
                    <option value="Butuh Perbaikan">Butuh Perbaikan</option>
                    <option value="Rusak Total">Rusak Total</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Pengguna Terakhir (Opsional)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Nama pemegang alat saat ini"
                    value={namaPengguna}
                    onChange={(e) => setNamaPengguna(e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Catatan Kerusakan (Bila ada)</label>
                  <textarea
                    className="form-input"
                    placeholder="Tulis detail kerusakan alat musik jika ada..."
                    value={catatanKerusakan}
                    onChange={(e) => setCatatanKerusakan(e.target.value)}
                    disabled={isSubmitting}
                    rows={2}
                    style={{ resize: 'vertical' }}
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-accent"
                  style={{ width: '100%', padding: '0.8rem', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Memproses...' : 'Daftarkan & Dapatkan QR'}
                </button>
              </form>
            </div>
          </div>

          {/* Right Column: Inventory List */}
          <div>
            {/* Search and filter bar */}
            <div
              className="card glass"
              style={{
                padding: '1.25rem 1.5rem',
                marginBottom: '1.5rem',
                display: 'flex',
                gap: '1rem',
                flexWrap: 'wrap',
                alignItems: 'center',
              }}
            >
              <div style={{ flex: 1, minWidth: '200px' }} className="form-group">
                <input
                  type="text"
                  className="form-input"
                  placeholder="Cari alat (ID, Jenis, Pengguna)..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ margin: 0 }}
                />
              </div>

              <div style={{ minWidth: '150px' }}>
                <select
                  className="form-input"
                  value={filterKondisi}
                  onChange={(e) => setFilterKondisi(e.target.value)}
                  style={{ margin: 0 }}
                >
                  <option value="">Semua Kondisi</option>
                  <option value="Bagus">Bagus</option>
                  <option value="Butuh Perbaikan">Butuh Perbaikan</option>
                  <option value="Rusak Total">Rusak Total</option>
                </select>
              </div>

              {filteredInstruments.length > 0 && (
                <button
                  type="button"
                  onClick={handleDownloadAllQR}
                  className="btn btn-primary"
                  disabled={isGeneratingPdf}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.65rem 1.25rem',
                    margin: 0,
                    fontSize: '0.875rem',
                    fontWeight: 600,
                  }}
                  title="Unduh semua QR Code hasil pencarian/saringan dalam satu file PDF"
                >
                  {isGeneratingPdf ? (
                    <>
                      <svg
                        style={{ animation: 'spin 1s linear infinite' }}
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                      >
                        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                      </svg>
                      <span>Memproses...</span>
                    </>
                  ) : (
                    <>
                      <span>📥 Unduh QR PDF ({filteredInstruments.length})</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {/* List */}
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
            ) : filteredInstruments.length === 0 ? (
              <div className="card" style={{ padding: '3rem 2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                Tidak ada alat musik yang cocok dengan pencarian Anda.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {filteredInstruments.map((inst) => (
                  <div
                    key={inst.id}
                    className="card animate-fade-in flex-row-desktop"
                    style={{
                      padding: '1.25rem 1.5rem',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                        <span style={{ fontSize: '0.825rem', fontFamily: 'var(--font-mono)', padding: '0.15rem 0.5rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', fontWeight: 600, wordBreak: 'break-all' }}>
                          {inst.id}
                        </span>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>{inst.jenis_alat}</h3>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
                        <div>
                          Kondisi:{' '}
                          <span style={{ padding: '0.1rem 0.5rem', borderRadius: 'var(--radius-full)', fontWeight: 600, ...getKondisiStyle(inst.kondisi) }}>
                            {inst.kondisi}
                          </span>
                        </div>
                        {inst.nama_pengguna_terakhir && (
                          <div>
                            Pemegang: <strong>{inst.nama_pengguna_terakhir}</strong>
                          </div>
                        )}
                      </div>
                      
                      {inst.catatan_kerusakan && (
                        <div style={{ marginTop: '0.75rem', fontSize: '0.825rem', color: 'var(--text-secondary)', padding: '0.5rem 0.75rem', backgroundColor: 'var(--danger-light)', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--danger)', textAlign: 'left' }}>
                          ⚠️ <strong>Catatan Kerusakan:</strong> {inst.catatan_kerusakan}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => handleViewQR(inst)}
                        className="btn btn-outline"
                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.825rem' }}
                      >
                        👁 QR Code
                      </button>

                      <button
                        onClick={() => handleOpenEditModal(inst)}
                        className="btn btn-outline"
                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.825rem', borderColor: 'var(--accent)', color: 'var(--accent)' }}
                      >
                        ✏️ Edit
                      </button>
                      
                      {role === 'Admin' && (
                        <button
                          onClick={() => handleDelete(inst.id)}
                          className="btn btn-secondary"
                          style={{ padding: '0.4rem 0.8rem', fontSize: '0.825rem', color: 'var(--danger)' }}
                        >
                          Hapus
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* QR Code Viewer / Download Modal */}
      {generatedInstrument && qrCodeUrl && (
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
          <div className="card glass" style={{ width: '100%', maxWidth: '380px', padding: '2rem', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Label QR Code</h2>
              <button
                onClick={() => {
                  setGeneratedInstrument(null);
                  setQrCodeUrl(null);
                }}
                style={{ fontSize: '1.5rem', color: 'var(--text-secondary)', cursor: 'pointer', lineHeight: 1 }}
              >
                &times;
              </button>
            </div>

            <div
              style={{
                backgroundColor: '#ffffff',
                padding: '1.5rem',
                borderRadius: 'var(--radius-md)',
                display: 'inline-block',
                marginBottom: '1.5rem',
                border: '1px solid var(--border-color)',
                boxShadow: 'var(--shadow-md)',
              }}
            >
              <img src={qrCodeUrl} alt="QR Code Label" style={{ width: '200px', height: '200px' }} />
              <div style={{ marginTop: '0.5rem', color: '#000000', fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '0.9rem' }}>
                {generatedInstrument.id}
              </div>
              <div style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 600 }}>
                {generatedInstrument.jenis_alat}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%' }}>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button onClick={handleDownloadQR} className="btn btn-accent" style={{ flex: 1, padding: '0.65rem 0.5rem', fontSize: '0.85rem' }}>
                  📥 Unduh PNG
                </button>
                <button
                  onClick={() => handlePrintBluetooth(generatedInstrument)}
                  className="btn btn-primary"
                  style={{ flex: 1, backgroundColor: '#0284c7', borderColor: '#0284c7', padding: '0.65rem 0.5rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}
                  disabled={isPrintingBluetooth}
                >
                  {isPrintingBluetooth ? '🔄 Menghubungkan...' : '🖨️ Cetak Bluetooth'}
                </button>
              </div>
              <button
                onClick={() => {
                  setGeneratedInstrument(null);
                  setQrCodeUrl(null);
                }}
                className="btn btn-secondary"
                style={{ width: '100%', padding: '0.65rem' }}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Instrument Modal */}
      {editingInstrument && (
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
          <div className="card glass" style={{ width: '100%', maxWidth: '420px', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--accent)' }}>Edit Data & Kondisi Alat</h2>
              <button
                onClick={() => setEditingInstrument(null)}
                style={{ fontSize: '1.5rem', color: 'var(--text-secondary)', cursor: 'pointer', lineHeight: 1, background: 'none', border: 'none' }}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="form-group">
                <label className="form-label">ID Alat</label>
                <input
                  type="text"
                  className="form-input"
                  value={editingInstrument.id}
                  disabled
                  style={{ opacity: 0.6 }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Jenis / Nama Alat</label>
                <input
                  type="text"
                  className="form-input"
                  value={editJenisAlat}
                  onChange={(e) => setEditJenisAlat(e.target.value)}
                  required
                  disabled={isUpdating}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Kondisi Alat</label>
                <select
                  className="form-input"
                  value={editKondisi}
                  onChange={(e) => setEditKondisi(e.target.value)}
                  required
                  disabled={isUpdating}
                >
                  <option value="Bagus">Bagus (Siap Pakai)</option>
                  <option value="Butuh Perbaikan">Butuh Perbaikan</option>
                  <option value="Rusak Total">Rusak Total</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Pengguna Terakhir (Opsional)</label>
                <input
                  type="text"
                  className="form-input"
                  value={editNamaPengguna}
                  onChange={(e) => setEditNamaPengguna(e.target.value)}
                  disabled={isUpdating}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Catatan Kerusakan (Bila ada)</label>
                <textarea
                  className="form-input"
                  value={editCatatanKerusakan}
                  onChange={(e) => setEditCatatanKerusakan(e.target.value)}
                  disabled={isUpdating}
                  rows={3}
                  style={{ resize: 'vertical' }}
                  placeholder="Deskripsikan kerusakan jika ada..."
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="submit"
                  className="btn btn-accent"
                  style={{ flex: 1, padding: '0.75rem' }}
                  disabled={isUpdating}
                >
                  {isUpdating ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingInstrument(null)}
                  className="btn btn-secondary"
                  style={{ flex: 1, padding: '0.75rem' }}
                  disabled={isUpdating}
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
        .flex-row-desktop {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        @media (min-width: 640px) {
          .flex-row-desktop {
            flex-direction: row;
            align-items: center;
            justify-content: space-between;
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
