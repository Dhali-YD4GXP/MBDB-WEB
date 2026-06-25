export interface User {
  id: number;
  username: string;
  role: 'Admin' | 'Official' | 'Bendahara';
  created_at?: string;
}

export interface Applicant {
  id: number;
  nama: string;
  kelas: string;
  foto_path: string;
  pilihan1: string;
  pilihan2: string;
  pilihan3: string;
  status: 'Pending' | 'Accepted' | 'Rejected';
  kode_pendaftaran?: string;
  alat_diterima?: string;
  created_at: string;
}

export interface Instrument {
  id: string; // e.g. MBDB-XXXX
  jenis_alat: string;
  kondisi: 'Bagus' | 'Butuh Perbaikan' | 'Rusak Total';
  nama_pengguna_terakhir?: string;
  created_at: string;
}

export interface Session {
  id: number;
  nama_sesi: string;
  is_active: boolean;
  start_at: string;
  end_at?: string;
}

export interface SessionLogSummary {
  log_id: number;
  instrument_id: string;
  jenis_alat: string;
  status: 'Keluar' | 'Masuk';
  scanned_by: string; // username
  timestamp: string;
}

export interface SessionDetail {
  session: Session;
  total_out: number;
  total_returned: number;
  total_remaining: number;
  remaining_details: Instrument[];
  logs: SessionLogSummary[];
}

export interface AuthState {
  token: string | null;
  username: string | null;
  role: 'Admin' | 'Official' | 'Bendahara' | null;
  userId: number | null;
}

export interface Agenda {
  id: number;
  judul: string;
  jenis: 'Lomba' | 'Penampilan' | 'Latihan';
  tanggal: string;
  tempat: string;
  keterangan?: string;
  created_at?: string;
}

export interface OrgStructure {
  id: number;
  ketua_nama: string;
  ketua_foto: string;
  waka1_nama: string;
  waka1_foto: string;
  waka2_nama: string;
  waka2_foto: string;
  sekretaris_nama: string;
  sekretaris_foto: string;
  bendahara_nama: string;
  bendahara_foto: string;
  updated_at?: string;
}

export interface FinanceRecord {
  id: number;
  tipe: 'Kas Masuk' | 'Kas Keluar';
  jumlah: number;
  keterangan: string;
  receipt_path?: string;
  created_by: number;
  created_by_user?: User;
  timestamp: string;
}

export interface FinanceSummary {
  records: FinanceRecord[];
  total_masuk: number;
  total_keluar: number;
  saldo: number;
}
