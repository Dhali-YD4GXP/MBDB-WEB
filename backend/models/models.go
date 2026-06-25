package models

import (
	"time"
)

// User represents internal application users (Admin, Official, or Bendahara)
type User struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	Username  string    `gorm:"unique;not null;type:varchar(100)" json:"username"`
	Password  string    `gorm:"not null;type:varchar(255)" json:"-"` // Hashed, omitted from JSON responses
	Role      string    `gorm:"not null;type:varchar(20)" json:"role"` // "Admin", "Official", "Bendahara"
	CreatedAt time.Time `json:"created_at"`
}

// Applicant represents public registrations for new members
type Applicant struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	Nama      string    `gorm:"not null;type:varchar(150)" json:"nama"`
	Kelas     string    `gorm:"not null;type:varchar(50)" json:"kelas"`
	FotoPath  string    `gorm:"not null;type:text" json:"foto_path"` // Static path to Pas Foto on VPS
	Pilihan1  string    `gorm:"not null;type:varchar(100)" json:"pilihan1"` // Dropdown 1
	Pilihan2  string    `gorm:"not null;type:varchar(100)" json:"pilihan2"` // Dropdown 2
	Pilihan3  string    `gorm:"not null;type:varchar(100)" json:"pilihan3"` // Dropdown 3
	Status          string    `gorm:"not null;type:varchar(20);default:'Pending'" json:"status"` // "Pending", "Accepted", "Rejected"
	KodePendaftaran string    `gorm:"type:varchar(50);unique" json:"kode_pendaftaran"`
	AlatDiterima    string    `gorm:"type:varchar(100)" json:"alat_diterima"`
	CreatedAt       time.Time `json:"created_at"`
}

// Instrument represents marching band / drumband instruments
type Instrument struct {
	ID                  string    `gorm:"primaryKey;type:varchar(50)" json:"id"` // UUID/ShortID for QR
	JenisAlat           string    `gorm:"not null;type:varchar(100)" json:"jenis_alat"`
	Kondisi             string    `gorm:"not null;type:varchar(50)" json:"kondisi"` // "Bagus", "Butuh Perbaikan", "Rusak Total"
	NamaPenggunaTerakhir string    `gorm:"type:varchar(150)" json:"nama_pengguna_terakhir"` // Optional last user
	CreatedAt           time.Time `json:"created_at"`
}

// Session represents a practice or event loading session
type Session struct {
	ID        uint       `gorm:"primaryKey" json:"id"`
	NamaSesi  string     `gorm:"not null;type:varchar(150)" json:"nama_sesi"`
	IsActive  bool       `gorm:"not null;default:true" json:"is_active"`
	StartAt   time.Time  `gorm:"not null" json:"start_at"`
	EndAt     *time.Time `json:"end_at,omitempty"`
}

// SessionLog records check-out and check-in transactions for instruments in a session
type SessionLog struct {
	ID           uint       `gorm:"primaryKey" json:"id"`
	SessionID    uint       `gorm:"not null" json:"session_id"`
	Session      Session    `gorm:"foreignKey:SessionID;constraint:OnDelete:CASCADE" json:"-"`
	InstrumentID string     `gorm:"not null;type:varchar(50)" json:"instrument_id"`
	Instrument   Instrument `gorm:"foreignKey:InstrumentID;constraint:OnDelete:CASCADE" json:"instrument"`
	Status       string     `gorm:"not null;type:varchar(20)" json:"status"` // "Keluar" (Check-Out), "Masuk" (Check-In)
	ScannedBy    uint       `gorm:"not null" json:"scanned_by"`
	User         User       `gorm:"foreignKey:ScannedBy" json:"scanned_by_user"`
	Timestamp    time.Time  `gorm:"not null" json:"timestamp"`
}

// Agenda represents MBDB events like competitions, performances, and practices
type Agenda struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	Judul       string    `gorm:"not null;type:varchar(200)" json:"judul"`
	Jenis       string    `gorm:"not null;type:varchar(50)" json:"jenis"` // "Lomba", "Penampilan", "Latihan"
	Tanggal     time.Time `gorm:"not null" json:"tanggal"`
	Tempat      string    `gorm:"not null;type:varchar(200)" json:"tempat"`
	Keterangan  string    `gorm:"type:text" json:"keterangan"`
	CreatedAt   time.Time `json:"created_at"`
}

// OrgStructure represents the organization chart nodes
type OrgStructure struct {
	ID             uint      `gorm:"primaryKey" json:"id"`
	KetuaNama      string    `gorm:"not null;type:varchar(150)" json:"ketua_nama"`
	KetuaFoto      string    `gorm:"type:text" json:"ketua_foto"`
	Waka1Nama      string    `gorm:"not null;type:varchar(150)" json:"waka1_nama"`
	Waka1Foto      string    `gorm:"type:text" json:"waka1_foto"`
	Waka2Nama      string    `gorm:"not null;type:varchar(150)" json:"waka2_nama"`
	Waka2Foto      string    `gorm:"type:text" json:"waka2_foto"`
	SekretarisNama string    `gorm:"not null;type:varchar(150)" json:"sekretaris_nama"`
	SekretarisFoto string    `gorm:"type:text" json:"sekretaris_foto"`
	BendaharaNama  string    `gorm:"not null;type:varchar(150)" json:"bendahara_nama"`
	BendaharaFoto  string    `gorm:"type:text" json:"bendahara_foto"`
	UpdatedAt      time.Time `json:"updated_at"`
}

// FinanceRecord represents money flowing in or out of MBDB treasury
type FinanceRecord struct {
	ID           uint      `gorm:"primaryKey" json:"id"`
	Tipe         string    `gorm:"not null;type:varchar(20)" json:"tipe"` // "Kas Masuk" or "Kas Keluar"
	Jumlah       float64   `gorm:"not null;type:decimal(15,2)" json:"jumlah"`
	Keterangan   string    `gorm:"not null;type:text" json:"keterangan"`
	ReceiptPath  string    `gorm:"type:text" json:"receipt_path"` // Optional receipt image url
	CreatedBy    uint      `gorm:"not null" json:"created_by"`
	User         User      `gorm:"foreignKey:CreatedBy" json:"created_by_user"`
	Timestamp    time.Time `gorm:"not null" json:"timestamp"`
}

// PracticeSession represents a practice session started by the admin
type PracticeSession struct {
	ID        uint       `gorm:"primaryKey" json:"id"`
	Title     string     `gorm:"not null;type:varchar(150)" json:"title"`
	Token     string     `gorm:"unique;not null;type:varchar(100)" json:"token"` // Unique QR token
	IsActive  bool       `gorm:"not null;default:true" json:"is_active"`
	CreatedAt time.Time  `json:"created_at"`
	ClosedAt  *time.Time `json:"closed_at,omitempty"`
}

// AttendanceRecord represents a participant's attendance log in a practice session
type AttendanceRecord struct {
	ID                uint            `gorm:"primaryKey" json:"id"`
	PracticeSessionID uint            `gorm:"not null" json:"practice_session_id"`
	PracticeSession   PracticeSession `gorm:"foreignKey:PracticeSessionID;constraint:OnDelete:CASCADE" json:"-"`
	Nama              string          `gorm:"not null;type:varchar(150)" json:"nama"`
	Alat              string          `gorm:"not null;type:varchar(100)" json:"alat"`
	Timestamp         time.Time       `gorm:"not null" json:"timestamp"`
}

// Member represents the active and alumni members of the marching band
type Member struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	Nama      string    `gorm:"not null;type:varchar(150)" json:"nama"`
	Kelas     string    `gorm:"not null;type:varchar(50)" json:"kelas"`
	Alat      string    `gorm:"not null;type:varchar(100)" json:"alat"`
	Status    string    `gorm:"not null;type:varchar(20);default:'Aktif'" json:"status"` // "Aktif" or "Alumni"
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// CompetitionSession represents a competition event with attendance roster
type CompetitionSession struct {
	ID        uint                 `gorm:"primaryKey" json:"id"`
	Title     string               `gorm:"not null;type:varchar(150)" json:"title"`
	Token     string               `gorm:"unique;not null;type:varchar(100)" json:"token"` // Unique QR token
	IsActive  bool                 `gorm:"not null;default:true" json:"is_active"`
	CreatedAt time.Time            `json:"created_at"`
	ClosedAt  *time.Time           `json:"closed_at,omitempty"`
	Roster    []CompetitionRoster `gorm:"foreignKey:CompetitionSessionID;constraint:OnDelete:CASCADE" json:"roster,omitempty"`
}

// CompetitionRoster represents a member registered to participate in a competition session
type CompetitionRoster struct {
	ID                   uint       `gorm:"primaryKey" json:"id"`
	CompetitionSessionID uint       `gorm:"not null" json:"competition_session_id"`
	Nama                 string     `gorm:"not null;type:varchar(150)" json:"nama"`
	Kelas                string     `gorm:"type:varchar(50)" json:"kelas"`
	Alat                 string     `gorm:"not null;type:varchar(100)" json:"alat"`
	Source               string     `gorm:"type:varchar(50);default:'Manual'" json:"source"` // "Aktif", "Alumni", "Manual"
	HasAttended          bool       `gorm:"not null;default:false" json:"has_attended"`
	AttendedAt           *time.Time `json:"attended_at,omitempty"`
}
