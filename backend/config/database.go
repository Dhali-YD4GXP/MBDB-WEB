package config

import (
	"crypto/rand"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/joho/godotenv"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/driver/mysql"
	"gorm.io/driver/postgres"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"mbdb-web-backend/models"
)

var DB *gorm.DB

// LoadEnv loads environment variables from a .env file if it exists
func LoadEnv() {
	if err := godotenv.Load(); err != nil {
		log.Println("Note: No .env file found, using system environment variables.")
	}
}

// InitDB initializes the database connection and runs auto migrations
func InitDB() *gorm.DB {
	var err error
	driver := os.Getenv("DB_DRIVER")
	if driver == "" {
		driver = "sqlite" // Default to SQLite for zero-config local development!
	}

	host := os.Getenv("DB_HOST")
	if host == "" {
		host = "localhost"
	}
	port := os.Getenv("DB_PORT")
	user := os.Getenv("DB_USER")
	password := os.Getenv("DB_PASSWORD")
	dbname := os.Getenv("DB_NAME")

	var dialector gorm.Dialector

	switch driver {
	case "sqlite":
		dbFile := dbname
		if dbFile == "" {
			dbFile = "mbdb.db"
		}
		if !strings.HasSuffix(dbFile, ".db") {
			dbFile = dbFile + ".db"
		}
		dialector = sqlite.Open(dbFile)
		log.Printf("Connecting to SQLite database file: %s...", dbFile)

	case "mysql":
		if port == "" {
			port = "3306"
		}
		dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?charset=utf8mb4&parseTime=True&loc=Local",
			user, password, host, port, dbname)
		dialector = mysql.Open(dsn)
		log.Printf("Connecting to MySQL on %s:%s/%s...", host, port, dbname)

	case "postgres":
		if port == "" {
			port = "5432"
		}
		sslmode := os.Getenv("DB_SSLMODE")
		if sslmode == "" {
			sslmode = "disable"
		}
		dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=%s TimeZone=Asia/Jakarta",
			host, user, password, dbname, port, sslmode)
		dialector = postgres.Open(dsn)
		log.Printf("Connecting to PostgreSQL on %s:%s/%s...", host, port, dbname)

	default:
		// Fallback to SQLite
		dialector = sqlite.Open("mbdb.db")
		log.Printf("Connecting to SQLite (default fallback) database file: mbdb.db...")
	}

	DB, err = gorm.Open(dialector, &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})

	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	log.Println("Database connection established successfully.")

	// Auto Migration
	log.Println("Running database migrations...")
	err = DB.AutoMigrate(
		&models.User{},
		&models.Applicant{},
		&models.Instrument{},
		&models.Session{},
		&models.SessionLog{},
		&models.Agenda{},
		&models.OrgStructure{},
		&models.FinanceRecord{},
		&models.PracticeSession{},
		&models.AttendanceRecord{},
		&models.Member{},
		&models.CompetitionSession{},
		&models.CompetitionRoster{},
	)
	if err != nil {
		log.Fatalf("Migration failed: %v", err)
	}
	log.Println("Database migration completed.")

	// Create directories if they don't exist
	uploadDir := os.Getenv("UPLOAD_DIR")
	if uploadDir == "" {
		uploadDir = "./uploads/photos"
	}
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		log.Printf("Warning: Failed to create upload directory %s: %v", uploadDir, err)
	} else {
		absPath, _ := filepath.Abs(uploadDir)
		log.Printf("Upload directory is ready at: %s", absPath)
	}

	// Ensure at least one admin user exists
	seedAdminUser()
	
	// Ensure organization structure exists
	seedOrgStructure()

	// Self-healing migration to create user accounts for existing members/alumni
	migrateExistingAlumniAccounts()

	return DB
}

func seedAdminUser() {
	var count int64
	DB.Model(&models.User{}).Count(&count)
	if count == 0 {
		adminUsername := os.Getenv("ADMIN_USERNAME")
		if adminUsername == "" {
			adminUsername = "admin"
		}
		adminPassword := os.Getenv("ADMIN_PASSWORD")
		if adminPassword == "" {
			adminPassword = "adminmbdb" // default fallback
		}

		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(adminPassword), bcrypt.DefaultCost)
		if err != nil {
			log.Fatalf("Failed to hash default admin password: %v", err)
		}

		admin := models.User{
			Username: adminUsername,
			Password: string(hashedPassword),
			Role:     "Admin",
		}

		if err := DB.Create(&admin).Error; err != nil {
			log.Fatalf("Failed to seed admin user: %v", err)
		}
		log.Printf("Successfully seeded default admin user: %s (Password: [configured in env or default])", adminUsername)
	}
}

func seedOrgStructure() {
	var count int64
	DB.Model(&models.OrgStructure{}).Count(&count)
	if count == 0 {
		org := models.OrgStructure{
			KetuaNama:      "Ketua MBDB",
			KetuaFoto:      "",
			Waka1Nama:      "Wakil Ketua 1",
			Waka1Foto:      "",
			Waka2Nama:      "Wakil Ketua 2",
			Waka2Foto:      "",
			SekretarisNama: "Sekretaris MBDB",
			SekretarisFoto: "",
			BendaharaNama:  "Bendahara MBDB",
			BendaharaFoto:  "",
			UpdatedAt:      time.Now(),
		}
		if err := DB.Create(&org).Error; err != nil {
			log.Printf("Warning: Failed to seed org structure: %v", err)
		} else {
			log.Println("Successfully seeded default Org Structure.")
		}
	}
}

// migrateExistingAlumniAccounts scans the database for any members (active/alumni)
// who do not have a NomorAnggota or User account, and generates them automatically.
func migrateExistingAlumniAccounts() {
	var members []models.Member
	if err := DB.Where("nomor_anggota = ? OR nomor_anggota IS NULL", "").Find(&members).Error; err != nil {
		log.Printf("Migration warning: failed to fetch members without nomor_anggota: %v", err)
		return
	}

	if len(members) == 0 {
		return
	}

	log.Printf("Found %d members without Nomor Anggota. Starting auto-migration...", len(members))

	for i := range members {
		m := &members[i]
		angkatanClean := strings.TrimSpace(m.Angkatan)
		if angkatanClean == "" {
			angkatanClean = "XX"
		}
		
		var count int64
		DB.Model(&models.Member{}).Where("angkatan = ? AND nomor_anggota != ? AND nomor_anggota IS NOT NULL", m.Angkatan, "").Count(&count)
		nomorUrut := fmt.Sprintf("%03d", count+1)
		m.NomorAnggota = fmt.Sprintf("MBDB-%s-%s", angkatanClean, nomorUrut)

		// Generate activation code
		const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
		bytes := make([]byte, 6)
		_, _ = rand.Read(bytes)
		for j, b := range bytes {
			bytes[j] = chars[b%byte(len(chars))]
		}
		m.KodePendaftaran = "REG-" + string(bytes)

		// Save the member
		if err := DB.Save(m).Error; err != nil {
			log.Printf("Migration error: failed to save member %s: %v", m.Nama, err)
			continue
		}

		// Create the corresponding User record
		newUser := models.User{
			Username:  m.NomorAnggota,
			Password:  "", // inactive until set by user
			Role:      "Member",
			CreatedAt: time.Now(),
		}
		if err := DB.Create(&newUser).Error; err != nil {
			log.Printf("Migration error: failed to create user account for member %s: %v", m.Nama, err)
		} else {
			log.Printf("Migration success: created account %s (activation code: %s) for %s", m.NomorAnggota, m.KodePendaftaran, m.Nama)
		}
	}
	log.Println("Database auto-migration for existing members completed.")
}
