package controllers

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"gorm.io/gorm"

	"mbdb-web-backend/middleware"
	"mbdb-web-backend/models"
)

type CompetitionSessionsController struct {
	DB *gorm.DB
}

func generateCompetToken() string {
	b := make([]byte, 8)
	if _, err := rand.Read(b); err != nil {
		return fmt.Sprintf("lomba-%d", time.Now().UnixNano())
	}
	return hex.EncodeToString(b)
}

// List returns all competition sessions (Admin only)
func (csc *CompetitionSessionsController) List(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	currentUser, err := middleware.GetUserFromContext(r)
	if err != nil || currentUser.Role != "Admin" {
		w.WriteHeader(http.StatusForbidden)
		json.NewEncoder(w).Encode(map[string]string{"error": "Forbidden: Admin access required"})
		return
	}

	var sessions []models.CompetitionSession
	if err := csc.DB.Order("created_at desc").Find(&sessions).Error; err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to fetch competition sessions"})
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(sessions)
}

// Create starts a new competition session and populates the roster (Admin only)
func (csc *CompetitionSessionsController) Create(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	currentUser, err := middleware.GetUserFromContext(r)
	if err != nil || currentUser.Role != "Admin" {
		w.WriteHeader(http.StatusForbidden)
		json.NewEncoder(w).Encode(map[string]string{"error": "Forbidden: Admin access required"})
		return
	}

	var req struct {
		Title  string                     `json:"title"`
		Roster []models.CompetitionRoster `json:"roster"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request payload"})
		return
	}

	req.Title = strings.TrimSpace(req.Title)
	if req.Title == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Nama lomba wajib diisi"})
		return
	}

	if len(req.Roster) == 0 {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Daftar anggota yang berangkat lomba tidak boleh kosong"})
		return
	}

	// Deactivate any currently active competition sessions to avoid multiple active scans
	csc.DB.Model(&models.CompetitionSession{}).Where("is_active = ?", true).Updates(map[string]interface{}{
		"is_active": false,
		"closed_at": time.Now(),
	})

	newSession := models.CompetitionSession{
		Title:     req.Title,
		Token:     generateCompetToken(),
		IsActive:  true,
		CreatedAt: time.Now(),
	}

	// Begin transaction to ensure session and roster are both saved
	tx := csc.DB.Begin()
	if err := tx.Create(&newSession).Error; err != nil {
		tx.Rollback()
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Gagal membuat sesi presensi lomba"})
		return
	}

	for _, item := range req.Roster {
		rosterItem := models.CompetitionRoster{
			CompetitionSessionID: newSession.ID,
			Nama:                 strings.TrimSpace(item.Nama),
			Kelas:                strings.TrimSpace(item.Kelas),
			Alat:                 strings.TrimSpace(item.Alat),
			Source:               strings.TrimSpace(item.Source),
			HasAttended:          false,
		}

		if rosterItem.Nama == "" || rosterItem.Alat == "" {
			tx.Rollback()
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(map[string]string{"error": "Nama dan Alat pada daftar pendaftar wajib diisi"})
			return
		}

		if err := tx.Create(&rosterItem).Error; err != nil {
			tx.Rollback()
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"error": "Gagal menyimpan daftar anggota lomba"})
			return
		}
	}

	tx.Commit()

	// Load roster items to return complete object
	csc.DB.Preload("Roster").First(&newSession, newSession.ID)

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(newSession)
}

// Get returns details of a single competition session including its full roster status (Admin only)
func (csc *CompetitionSessionsController) Get(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	currentUser, err := middleware.GetUserFromContext(r)
	if err != nil || currentUser.Role != "Admin" {
		w.WriteHeader(http.StatusForbidden)
		json.NewEncoder(w).Encode(map[string]string{"error": "Forbidden: Admin access required"})
		return
	}

	sessionIDStr := r.PathValue("id")
	sessionID, err := strconv.ParseUint(sessionIDStr, 10, 64)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid session ID"})
		return
	}

	var session models.CompetitionSession
	if err := csc.DB.Preload("Roster").First(&session, sessionID).Error; err != nil {
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]string{"error": "Sesi lomba tidak ditemukan"})
		return
	}

	// Calculate counts
	totalCount := len(session.Roster)
	attendedCount := 0
	for _, item := range session.Roster {
		if item.HasAttended {
			attendedCount++
		}
	}

	isComplete := attendedCount == totalCount

	type DetailResponse struct {
		Session       models.CompetitionSession `json:"session"`
		TotalCount    int                       `json:"total_count"`
		AttendedCount int                       `json:"attended_count"`
		IsComplete    bool                      `json:"is_complete"`
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(DetailResponse{
		Session:       session,
		TotalCount:    totalCount,
		AttendedCount: attendedCount,
		IsComplete:    isComplete,
	})
}

// Close deactivates a competition session (Admin only)
func (csc *CompetitionSessionsController) Close(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	currentUser, err := middleware.GetUserFromContext(r)
	if err != nil || currentUser.Role != "Admin" {
		w.WriteHeader(http.StatusForbidden)
		json.NewEncoder(w).Encode(map[string]string{"error": "Forbidden: Admin access required"})
		return
	}

	sessionIDStr := r.PathValue("id")
	sessionID, err := strconv.ParseUint(sessionIDStr, 10, 64)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid session ID"})
		return
	}

	var session models.CompetitionSession
	if err := csc.DB.First(&session, sessionID).Error; err != nil {
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]string{"error": "Sesi tidak ditemukan"})
		return
	}

	now := time.Now()
	session.IsActive = false
	session.ClosedAt = &now

	if err := csc.DB.Save(&session).Error; err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Gagal menutup sesi presensi"})
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(session)
}

// GetByToken gets active session details and roster via its QR token (Public - no auth)
func (csc *CompetitionSessionsController) GetByToken(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	token := r.PathValue("token")
	var session models.CompetitionSession
	if err := csc.DB.Preload("Roster", func(db *gorm.DB) *gorm.DB {
		return db.Order("nama asc")
	}).Where("token = ? AND is_active = ?", token, true).First(&session).Error; err != nil {
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]string{"error": "Sesi QR ini sudah ditutup atau tidak aktif"})
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(session)
}

// Attend marks attendance for a roster member (Public - no auth)
func (csc *CompetitionSessionsController) Attend(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	token := r.PathValue("token")
	var session models.CompetitionSession
	if err := csc.DB.Where("token = ? AND is_active = ?", token, true).First(&session).Error; err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Sesi presensi lomba sudah ditutup atau tidak aktif"})
		return
	}

	var req struct {
		RosterID uint `json:"roster_id"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Payload request tidak valid"})
		return
	}

	var roster models.CompetitionRoster
	if err := csc.DB.Where("id = ? AND competition_session_id = ?", req.RosterID, session.ID).First(&roster).Error; err != nil {
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]string{"error": "Anggota tidak terdaftar dalam kepesertaan lomba ini"})
		return
	}

	if roster.HasAttended {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Anda sudah melakukan presensi sebelumnya"})
		return
	}

	now := time.Now()
	roster.HasAttended = true
	roster.AttendedAt = &now

	if err := csc.DB.Save(&roster).Error; err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Gagal mencatat presensi"})
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"message": "Presensi berhasil!",
		"roster":  roster,
	})
}
