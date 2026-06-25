package main

import (
	"log"
	"os"
	"path/filepath"

	"mbdb-web-backend/config"
	"mbdb-web-backend/models"
)

func main() {
	log.Println("Starting data purge script...")

	// 1. Initialize environment variables
	config.LoadEnv()

	// 2. Initialize Database connection
	db := config.InitDB()

	// 3. Purge GORM tables
	log.Println("Purging testing records from GORM database tables...")

	// Applicants
	if err := db.Unscoped().Where("1=1").Delete(&models.Applicant{}).Error; err != nil {
		log.Printf("Error deleting Applicants: %v", err)
	} else {
		log.Println("Purged Applicants successfully.")
	}

	// AttendanceRecords
	if err := db.Unscoped().Where("1=1").Delete(&models.AttendanceRecord{}).Error; err != nil {
		log.Printf("Error deleting AttendanceRecords: %v", err)
	} else {
		log.Println("Purged AttendanceRecords successfully.")
	}

	// CompetitionRosters
	if err := db.Unscoped().Where("1=1").Delete(&models.CompetitionRoster{}).Error; err != nil {
		log.Printf("Error deleting CompetitionRosters: %v", err)
	} else {
		log.Println("Purged CompetitionRosters successfully.")
	}

	// CompetitionSessions
	if err := db.Unscoped().Where("1=1").Delete(&models.CompetitionSession{}).Error; err != nil {
		log.Printf("Error deleting CompetitionSessions: %v", err)
	} else {
		log.Println("Purged CompetitionSessions successfully.")
	}

	// FinanceRecords
	if err := db.Unscoped().Where("1=1").Delete(&models.FinanceRecord{}).Error; err != nil {
		log.Printf("Error deleting FinanceRecords: %v", err)
	} else {
		log.Println("Purged FinanceRecords successfully.")
	}

	// Instruments
	if err := db.Unscoped().Where("1=1").Delete(&models.Instrument{}).Error; err != nil {
		log.Printf("Error deleting Instruments: %v", err)
	} else {
		log.Println("Purged Instruments successfully.")
	}

	// Members
	if err := db.Unscoped().Where("1=1").Delete(&models.Member{}).Error; err != nil {
		log.Printf("Error deleting Members: %v", err)
	} else {
		log.Println("Purged Members successfully.")
	}

	// PracticeSessions
	if err := db.Unscoped().Where("1=1").Delete(&models.PracticeSession{}).Error; err != nil {
		log.Printf("Error deleting PracticeSessions: %v", err)
	} else {
		log.Println("Purged PracticeSessions successfully.")
	}

	// Sessions
	if err := db.Unscoped().Where("1=1").Delete(&models.Session{}).Error; err != nil {
		log.Printf("Error deleting Sessions: %v", err)
	} else {
		log.Println("Purged Sessions successfully.")
	}

	// SessionLogs
	if err := db.Unscoped().Where("1=1").Delete(&models.SessionLog{}).Error; err != nil {
		log.Printf("Error deleting SessionLogs: %v", err)
	} else {
		log.Println("Purged SessionLogs successfully.")
	}

	// Users (keep Admin)
	if err := db.Unscoped().Where("role != ?", "Admin").Delete(&models.User{}).Error; err != nil {
		log.Printf("Error deleting non-admin Users: %v", err)
	} else {
		log.Println("Purged non-admin Users successfully.")
	}

	// OrgStructure (let InitDB re-seed it to defaults)
	if err := db.Unscoped().Where("1=1").Delete(&models.OrgStructure{}).Error; err != nil {
		log.Printf("Error deleting OrgStructures: %v", err)
	} else {
		log.Println("Purged OrgStructures successfully.")
	}

	// 4. Re-run seeding of default Admin & OrgStructure to ensure they exist
	log.Println("Re-seeding defaults...")
	// InitDB ran seeds, but let's call it or re-instantiate connection to ensure seeds run
	config.InitDB()

	// 5. Purge files in upload directories
	uploadDirs := []string{"./uploads/photos", "./uploads/receipts"}
	for _, dir := range uploadDirs {
		log.Printf("Cleaning uploads directory: %s...", dir)
		files, err := filepath.Glob(filepath.Join(dir, "*"))
		if err != nil {
			log.Printf("Error globbing %s: %v", dir, err)
			continue
		}
		for _, f := range files {
			// Don't delete directories, only files (e.g. photos/receipts)
			info, err := os.Stat(f)
			if err != nil {
				continue
			}
			if !info.IsDir() {
				if err := os.Remove(f); err != nil {
					log.Printf("Error removing file %s: %v", f, err)
				} else {
					log.Printf("Removed: %s", f)
				}
			}
		}
	}

	log.Println("Database and file purge completed successfully.")
}
