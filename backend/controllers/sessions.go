package controllers

import (
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

type SessionsController struct {
	DB *gorm.DB
}

// SessionDetailResponse represents details of a session including calculations and logs
type SessionDetailResponse struct {
	Session          models.Session         `json:"session"`
	TotalOut         int                    `json:"total_out"`          // Distinct instruments brought out
	TotalReturned    int                    `json:"total_returned"`     // Instruments returned
	TotalRemaining   int                    `json:"total_remaining"`    // Out but not returned (selisih)
	RemainingDetails []models.Instrument    `json:"remaining_details"`   // List of instruments not returned yet
	Logs             []SessionLogSummary    `json:"logs"`                // Audit trail logs
}

type SessionLogSummary struct {
	LogID        uint      `json:"log_id"`
	InstrumentID string    `json:"instrument_id"`
	JenisAlat    string    `json:"jenis_alat"`
	Status       string    `json:"status"` // "Keluar" or "Masuk"
	ScannedBy    string    `json:"scanned_by"` // Username of Official
	Timestamp    time.Time `json:"timestamp"`
}

// Start initiates a new practice/event session (Official or Admin)
func (sc *SessionsController) Start(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	var req struct {
		NamaSesi string `json:"nama_sesi"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request payload"})
		return
	}

	req.NamaSesi = strings.TrimSpace(req.NamaSesi)
	if req.NamaSesi == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "NamaSesi is required"})
		return
	}

	// Check if there is an active session
	var activeSession models.Session
	err := sc.DB.Where("is_active = ?", true).First(&activeSession).Error
	if err == nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{
			"error": "Ada sesi latihan/event yang masih aktif. Tutup sesi tersebut terlebih dahulu.",
		})
		return
	}

	// Create new session
	newSession := models.Session{
		NamaSesi: req.NamaSesi,
		IsActive: true,
		StartAt:  time.Now(),
	}

	if err := sc.DB.Create(&newSession).Error; err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to start new session"})
		return
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(newSession)
}

// Scan handles checking out or checking in an instrument within the active session (Official or Admin)
func (sc *SessionsController) Scan(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	currentUser, err := middleware.GetUserFromContext(r)
	if err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"error": "Unauthorized user context"})
		return
	}

	var req struct {
		InstrumentID string `json:"instrument_id"`
		Status       string `json:"status"` // Optional: "Keluar" or "Masuk". If empty, toggles automatically.
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request payload"})
		return
	}

	req.InstrumentID = strings.TrimSpace(req.InstrumentID)
	if req.InstrumentID == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Instrument ID is required"})
		return
	}

	// 1. Get Active Session
	var activeSession models.Session
	if err := sc.DB.Where("is_active = ?", true).First(&activeSession).Error; err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Tidak ada sesi latihan/event yang aktif saat ini."})
		return
	}

	// 2. Verify Instrument exists
	var instrument models.Instrument
	if err := sc.DB.First(&instrument, "id = ?", req.InstrumentID).Error; err != nil {
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]string{"error": fmt.Sprintf("Alat dengan ID %s tidak ditemukan dalam database.", req.InstrumentID)})
		return
	}

	// 3. Determine scan status ("Keluar" / "Masuk")
	scanStatus := strings.Title(strings.ToLower(strings.TrimSpace(req.Status)))
	if scanStatus != "Keluar" && scanStatus != "Masuk" {
		// Auto-toggle: Check latest log in this active session
		var latestLog models.SessionLog
		err := sc.DB.Where("session_id = ? AND instrument_id = ?", activeSession.ID, instrument.ID).
			Order("timestamp desc").
			First(&latestLog).Error

		if err != nil {
			// No history in this session yet -> Check out (Keluar)
			scanStatus = "Keluar"
		} else {
			// Toggle based on previous state
			if latestLog.Status == "Keluar" {
				scanStatus = "Masuk"
			} else {
				scanStatus = "Keluar"
			}
		}
	}

	// 4. Save Log
	logEntry := models.SessionLog{
		SessionID:    activeSession.ID,
		InstrumentID: instrument.ID,
		Status:       scanStatus,
		ScannedBy:    currentUser.ID,
		Timestamp:    time.Now(),
	}

	if err := sc.DB.Create(&logEntry).Error; err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Gagal menyimpan log pemindaian."})
		return
	}

	// 5. Update last user of instrument if scanning OUT
	if scanStatus == "Keluar" {
		// Try to record scanner user or last user name if given
		instrument.NamaPenggunaTerakhir = currentUser.Username
		sc.DB.Save(&instrument)
	}

	// Return summary of response
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"message":       fmt.Sprintf("Alat [%s] %s berhasil dicatat sebagai %s.", instrument.ID, instrument.JenisAlat, scanStatus),
		"status":        scanStatus,
		"instrument_id": instrument.ID,
		"jenis_alat":     instrument.JenisAlat,
		"scanned_by":    currentUser.Username,
		"timestamp":     logEntry.Timestamp.Format("2006-01-02 15:04:05"),
	})
}

// GetActive fetches current active session info with statistics (Official or Admin)
func (sc *SessionsController) GetActive(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	var activeSession models.Session
	if err := sc.DB.Where("is_active = ?", true).First(&activeSession).Error; err != nil {
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(nil) // Return null if no active session
		return
	}

	detail, err := sc.calculateSessionDetails(activeSession)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to calculate session details"})
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(detail)
}

// Close terminates the current active session (Official or Admin)
func (sc *SessionsController) Close(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	var activeSession models.Session
	if err := sc.DB.Where("is_active = ?", true).First(&activeSession).Error; err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Tidak ada sesi latihan/event aktif untuk ditutup."})
		return
	}

	endTime := time.Now()
	activeSession.IsActive = false
	activeSession.EndAt = &endTime

	if err := sc.DB.Save(&activeSession).Error; err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to close active session"})
		return
	}

	detail, _ := sc.calculateSessionDetails(activeSession)
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"message": "Sesi berhasil ditutup.",
		"session": detail,
	})
}

// List lists all past and present sessions (Official or Admin)
func (sc *SessionsController) List(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	var sessions []models.Session
	if err := sc.DB.Order("start_at desc").Find(&sessions).Error; err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to fetch sessions"})
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(sessions)
}

// Detail fetches a specific session's details and logs (Official or Admin)
func (sc *SessionsController) Detail(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	idStr := r.PathValue("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid session ID"})
		return
	}

	var session models.Session
	if err := sc.DB.First(&session, id).Error; err != nil {
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]string{"error": "Session not found"})
		return
	}

	detail, err := sc.calculateSessionDetails(session)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to retrieve session details"})
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(detail)
}

// Helper: Calculates statistics for a session based on the logs
func (sc *SessionsController) calculateSessionDetails(session models.Session) (SessionDetailResponse, error) {
	// Fetch all logs with Instrument and User preloaded
	var rawLogs []models.SessionLog
	err := sc.DB.Where("session_id = ?", session.ID).
		Order("timestamp desc").
		Preload("Instrument").
		Preload("User").
		Find(&rawLogs).Error

	if err != nil {
		return SessionDetailResponse{}, err
	}

	// 1. Group logs by InstrumentID to get the latest status
	latestStatus := make(map[string]string)
	instrumentsMap := make(map[string]models.Instrument)

	for i := len(rawLogs) - 1; i >= 0; i-- { // Process chronological order (oldest to newest)
		logEntry := rawLogs[i]
		latestStatus[logEntry.InstrumentID] = logEntry.Status
		instrumentsMap[logEntry.InstrumentID] = logEntry.Instrument
	}

	// 2. Count distinct states
	totalOut := len(latestStatus) // Total instruments ever check-out in this session
	totalReturned := 0
	var remainingDetails []models.Instrument

	for instID, status := range latestStatus {
		if status == "Masuk" {
			totalReturned++
		} else if status == "Keluar" {
			remainingDetails = append(remainingDetails, instrumentsMap[instID])
		}
	}

	totalRemaining := totalOut - totalReturned

	// 3. Map to SessionLogSummary
	var logsSummary []SessionLogSummary
	for _, l := range rawLogs {
		username := "Unknown"
		if l.User.Username != "" {
			username = l.User.Username
		}
		logsSummary = append(logsSummary, SessionLogSummary{
			LogID:        l.ID,
			InstrumentID: l.InstrumentID,
			JenisAlat:    l.Instrument.JenisAlat,
			Status:       l.Status,
			ScannedBy:    username,
			Timestamp:    l.Timestamp,
		})
	}

	return SessionDetailResponse{
		Session:          session,
		TotalOut:         totalOut,
		TotalReturned:    totalReturned,
		TotalRemaining:   totalRemaining,
		RemainingDetails: remainingDetails,
		Logs:             logsSummary,
	}, nil
}
