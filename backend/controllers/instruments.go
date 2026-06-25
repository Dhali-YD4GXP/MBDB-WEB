package controllers

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"gorm.io/gorm"

	"mbdb-web-backend/middleware"
	"mbdb-web-backend/models"
)

type InstrumentsController struct {
	DB *gorm.DB
}

// Generate a random 8-character string for short IDs
func generateShortID() string {
	bytes := make([]byte, 4)
	if _, err := rand.Read(bytes); err != nil {
		// Fallback to time-based code if rand fails
		return fmt.Sprintf("%x", time.Now().UnixNano())[:8]
	}
	return strings.ToUpper(hex.EncodeToString(bytes))
}

// Create registers a new instrument (Official or Admin)
func (ic *InstrumentsController) Create(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	var req struct {
		JenisAlat            string `json:"jenis_alat"`
		Kondisi              string `json:"kondisi"`                 // "Bagus", "Butuh Perbaikan", "Rusak Total"
		NamaPenggunaTerakhir string `json:"nama_pengguna_terakhir"` // Optional
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request payload"})
		return
	}

	req.JenisAlat = strings.TrimSpace(req.JenisAlat)
	req.Kondisi = strings.TrimSpace(req.Kondisi)
	
	if req.JenisAlat == "" || req.Kondisi == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "JenisAlat and Kondisi are required"})
		return
	}

	// Validate Kondisi options
	kondisi := strings.Title(strings.ToLower(req.Kondisi))
	if kondisi != "Bagus" && kondisi != "Butuh Perbaikan" && kondisi != "Rusak Total" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Kondisi must be 'Bagus', 'Butuh Perbaikan', or 'Rusak Total'"})
		return
	}

	// Generate custom short ID: e.g. MBDB-XXXX
	var instrumentID string
	for {
		instrumentID = fmt.Sprintf("MBDB-%s", generateShortID())
		var count int64
		ic.DB.Model(&models.Instrument{}).Where("id = ?", instrumentID).Count(&count)
		if count == 0 {
			break
		}
	}

	instrument := models.Instrument{
		ID:                  instrumentID,
		JenisAlat:           req.JenisAlat,
		Kondisi:             kondisi,
		NamaPenggunaTerakhir: req.NamaPenggunaTerakhir,
		CreatedAt:           time.Now(),
	}

	if err := ic.DB.Create(&instrument).Error; err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to register instrument"})
		return
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(instrument)
}

// List fetches all registered instruments (Official or Admin)
func (ic *InstrumentsController) List(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	var instruments []models.Instrument
	query := ic.DB.Order("created_at desc")

	// Optional filters
	jenis := r.URL.Query().Get("jenis")
	if jenis != "" {
		query = query.Where("jenis_alat LIKE ?", "%"+jenis+"%")
	}

	kondisi := r.URL.Query().Get("kondisi")
	if kondisi != "" {
		query = query.Where("kondisi = ?", kondisi)
	}

	if err := query.Find(&instruments).Error; err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to fetch instruments"})
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(instruments)
}

// Detail fetches info for a single instrument by its ID (Official or Admin)
func (ic *InstrumentsController) Detail(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	id := r.PathValue("id")
	if id == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Instrument ID is required"})
		return
	}

	var instrument models.Instrument
	if err := ic.DB.First(&instrument, "id = ?", id).Error; err != nil {
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]string{"error": "Instrument not found"})
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(instrument)
}

// Update updates instrument information (Official or Admin)
func (ic *InstrumentsController) Update(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	id := r.PathValue("id")
	if id == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Instrument ID is required"})
		return
	}

	var req struct {
		JenisAlat            string `json:"jenis_alat"`
		Kondisi              string `json:"kondisi"`
		NamaPenggunaTerakhir string `json:"nama_pengguna_terakhir"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request payload"})
		return
	}

	var instrument models.Instrument
	if err := ic.DB.First(&instrument, "id = ?", id).Error; err != nil {
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]string{"error": "Instrument not found"})
		return
	}

	if req.JenisAlat != "" {
		instrument.JenisAlat = strings.TrimSpace(req.JenisAlat)
	}
	
	if req.Kondisi != "" {
		kondisi := strings.Title(strings.ToLower(strings.TrimSpace(req.Kondisi)))
		if kondisi != "Bagus" && kondisi != "Butuh Perbaikan" && kondisi != "Rusak Total" {
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(map[string]string{"error": "Kondisi must be 'Bagus', 'Butuh Perbaikan', or 'Rusak Total'"})
			return
		}
		instrument.Kondisi = kondisi
	}

	// Last user is optional and can be updated to empty
	instrument.NamaPenggunaTerakhir = req.NamaPenggunaTerakhir

	if err := ic.DB.Save(&instrument).Error; err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to update instrument info"})
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(instrument)
}

// Delete deletes an instrument from inventory (Admin Only)
func (ic *InstrumentsController) Delete(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	// Extra security layer for Admin role
	currentUser, err := middleware.GetUserFromContext(r)
	if err != nil || currentUser.Role != "Admin" {
		w.WriteHeader(http.StatusForbidden)
		json.NewEncoder(w).Encode(map[string]string{"error": "Only Admins can delete instruments"})
		return
	}

	id := r.PathValue("id")
	if id == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Instrument ID is required"})
		return
	}

	var instrument models.Instrument
	if err := ic.DB.First(&instrument, "id = ?", id).Error; err != nil {
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]string{"error": "Instrument not found"})
		return
	}

	if err := ic.DB.Delete(&instrument).Error; err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to delete instrument"})
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "Instrument successfully deleted from database"})
}
