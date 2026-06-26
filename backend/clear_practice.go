package main

import (
	"log"

	"mbdb-web-backend/config"
	"mbdb-web-backend/models"
)

func main() {
	log.Println("Starting practice history purge script...")

	// 1. Initialize environment variables
	config.LoadEnv()

	// 2. Initialize Database connection
	db := config.InitDB()

	// 3. Purge GORM tables
	log.Println("Purging practice sessions and attendance records...")

	// AttendanceRecords
	if err := db.Unscoped().Where("1=1").Delete(&models.AttendanceRecord{}).Error; err != nil {
		log.Printf("Error deleting AttendanceRecords: %v", err)
	} else {
		log.Println("Purged all AttendanceRecords successfully.")
	}

	// PracticeSessions
	if err := db.Unscoped().Where("1=1").Delete(&models.PracticeSession{}).Error; err != nil {
		log.Printf("Error deleting PracticeSessions: %v", err)
	} else {
		log.Println("Purged all PracticeSessions successfully.")
	}

	log.Println("Practice history purge completed successfully.")
}
