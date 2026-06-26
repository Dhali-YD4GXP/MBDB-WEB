package controllers

import (
	"crypto/rand"
	"encoding/csv"
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

type PracticeSessionsController struct {
	DB *gorm.DB
}

func generateToken() string {
	b := make([]byte, 8)
	if _, err := rand.Read(b); err != nil {
		return fmt.Sprintf("%d", time.Now().UnixNano())
	}
	return hex.EncodeToString(b)
}

// List returns all practice sessions (Admin only)
func (psc *PracticeSessionsController) List(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	currentUser, err := middleware.GetUserFromContext(r)
	if err != nil || currentUser.Role != "Admin" {
		w.WriteHeader(http.StatusForbidden)
		json.NewEncoder(w).Encode(map[string]string{"error": "Forbidden: Admin access required"})
		return
	}

	var sessions []models.PracticeSession
	if err := psc.DB.Order("created_at desc").Find(&sessions).Error; err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to fetch practice sessions"})
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(sessions)
}

// Create starts a new practice session and generates a QR token (Admin only)
func (psc *PracticeSessionsController) Create(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	currentUser, err := middleware.GetUserFromContext(r)
	if err != nil || currentUser.Role != "Admin" {
		w.WriteHeader(http.StatusForbidden)
		json.NewEncoder(w).Encode(map[string]string{"error": "Forbidden: Admin access required"})
		return
	}

	var req struct {
		Title        string `json:"title"`
		TanggalMulai string `json:"tanggal_mulai"`
		JamMulai     string `json:"jam_mulai"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request payload"})
		return
	}

	req.Title = strings.TrimSpace(req.Title)
	if req.Title == "" {
		req.Title = fmt.Sprintf("Latihan Rutin - %s", time.Now().Format("02 Jan 2006"))
	}

	req.TanggalMulai = strings.TrimSpace(req.TanggalMulai)
	if req.TanggalMulai == "" {
		req.TanggalMulai = time.Now().Format("2006-01-02")
	}

	req.JamMulai = strings.TrimSpace(req.JamMulai)
	if req.JamMulai == "" {
		req.JamMulai = time.Now().Format("15:04")
	}

	// Deactivate any active sessions first, so there is only one active attendance QR at a time
	psc.DB.Model(&models.PracticeSession{}).Where("is_active = ?", true).Updates(map[string]interface{}{
		"is_active": false,
		"closed_at": time.Now(),
	})

	newSession := models.PracticeSession{
		Title:        req.Title,
		Token:        generateToken(),
		IsActive:     true,
		TanggalMulai: req.TanggalMulai,
		JamMulai:     req.JamMulai,
		CreatedAt:    time.Now(),
	}

	if err := psc.DB.Create(&newSession).Error; err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Gagal memulai sesi latihan"})
		return
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(newSession)
}

// Get returns details of a single practice session including attendance logs (Admin only)
func (psc *PracticeSessionsController) Get(w http.ResponseWriter, r *http.Request) {
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

	var session models.PracticeSession
	if err := psc.DB.First(&session, sessionID).Error; err != nil {
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]string{"error": "Sesi tidak ditemukan"})
		return
	}

	var attendances []models.AttendanceRecord
	if err := psc.DB.Where("practice_session_id = ?", session.ID).Order("timestamp desc").Find(&attendances).Error; err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to fetch attendance records"})
		return
	}

	type DetailResponse struct {
		Session     models.PracticeSession    `json:"session"`
		Attendances []models.AttendanceRecord `json:"attendances"`
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(DetailResponse{
		Session:     session,
		Attendances: attendances,
	})
}

// Close deactivates a practice session (Admin only)
func (psc *PracticeSessionsController) Close(w http.ResponseWriter, r *http.Request) {
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

	var session models.PracticeSession
	if err := psc.DB.First(&session, sessionID).Error; err != nil {
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]string{"error": "Sesi tidak ditemukan"})
		return
	}

	now := time.Now()
	session.IsActive = false
	session.ClosedAt = &now

	if err := psc.DB.Save(&session).Error; err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Gagal menutup sesi latihan"})
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(session)
}

// GetByToken gets active session details via its QR token (Public - no auth)
func (psc *PracticeSessionsController) GetByToken(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	token := r.PathValue("token")
	var session models.PracticeSession
	if err := psc.DB.Where("token = ? AND is_active = ?", token, true).First(&session).Error; err != nil {
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]string{"error": "Sesi QR ini sudah ditutup atau tidak aktif"})
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(session)
}

// Attend marks attendance for a participant on a session token (Public - no auth)
func (psc *PracticeSessionsController) Attend(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	token := r.PathValue("token")
	var session models.PracticeSession
	if err := psc.DB.Where("token = ? AND is_active = ?", token, true).First(&session).Error; err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Sesi presensi latihan sudah ditutup atau tidak aktif"})
		return
	}

	var req struct {
		Nama            string `json:"nama"`
		Alat            string `json:"alat"`
		AlasanTerlambat string `json:"alasan_terlambat"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Payload request tidak valid"})
		return
	}

	req.Nama = strings.TrimSpace(req.Nama)
	req.Alat = strings.TrimSpace(req.Alat)
	req.AlasanTerlambat = strings.TrimSpace(req.AlasanTerlambat)

	if req.Nama == "" || req.Alat == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Nama dan Alat musik wajib diisi"})
		return
	}

	loc, err := time.LoadLocation("Asia/Jakarta")
	if err != nil {
		loc = time.Local
	}

	status := "Hadir"
	if session.TanggalMulai != "" && session.JamMulai != "" {
		scheduledStr := fmt.Sprintf("%s %s", session.TanggalMulai, session.JamMulai)
		scheduledTime, err := time.ParseInLocation("2006-01-02 15:04", scheduledStr, loc)
		if err == nil && time.Now().After(scheduledTime) {
			status = "Terlambat"
		}
	}

	newRecord := models.AttendanceRecord{
		PracticeSessionID: session.ID,
		Nama:              req.Nama,
		Alat:              req.Alat,
		Status:            status,
		AlasanTerlambat:   req.AlasanTerlambat,
		Timestamp:         time.Now(),
	}

	if err := psc.DB.Create(&newRecord).Error; err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Gagal mencatat presensi"})
		return
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(newRecord)
}

// Export dumps the attendance list to CSV format (Admin only)
func (psc *PracticeSessionsController) Export(w http.ResponseWriter, r *http.Request) {
	currentUser, err := middleware.GetUserFromContext(r)
	if err != nil || currentUser.Role != "Admin" {
		w.WriteHeader(http.StatusForbidden)
		w.Write([]byte("Forbidden: Admin access required"))
		return
	}

	sessionIDStr := r.PathValue("id")
	sessionID, err := strconv.ParseUint(sessionIDStr, 10, 64)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte("Invalid session ID"))
		return
	}

	var session models.PracticeSession
	if err := psc.DB.First(&session, sessionID).Error; err != nil {
		w.WriteHeader(http.StatusNotFound)
		w.Write([]byte("Sesi tidak ditemukan"))
		return
	}

	var attendances []models.AttendanceRecord
	if err := psc.DB.Where("practice_session_id = ?", session.ID).Order("timestamp asc").Find(&attendances).Error; err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte("Failed to fetch attendance data"))
		return
	}

	filename := fmt.Sprintf("presensi_latihan_%s_%d.csv", strings.ReplaceAll(session.Title, " ", "_"), session.ID)

	w.Header().Set("Content-Type", "text/csv; charset=utf-8")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", filename))
	w.WriteHeader(http.StatusOK)

	// UTF-8 BOM for Excel compatibility
	w.Write([]byte{0xEF, 0xBB, 0xBF})

	writer := csv.NewWriter(w)
	defer writer.Flush()

	writer.Write([]string{"No", "Nama Peserta", "Pilihan Alat/Alat", "Waktu Presensi", "Status", "Alasan Keterlambatan"})

	for i, att := range attendances {
		writer.Write([]string{
			strconv.Itoa(i + 1),
			att.Nama,
			att.Alat,
			att.Timestamp.Format("2006-01-02 15:04:05"),
			att.Status,
			att.AlasanTerlambat,
		})
	}
}
