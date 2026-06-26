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

// Claim updates the last user holder of an instrument (Member, Official, Admin)
func (ic *InstrumentsController) Claim(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	id := r.PathValue("id")
	if id == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Instrument ID is required"})
		return
	}

	// Get logged-in user from context
	currentUser, err := middleware.GetUserFromContext(r)
	if err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"error": "Unauthorized"})
		return
	}

	var instrument models.Instrument
	if err := ic.DB.First(&instrument, "id = ?", id).Error; err != nil {
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]string{"error": "Instrument not found"})
		return
	}

	// Determine the holder name
	var holderName string
	if currentUser.Role == "Member" {
		// Fetch the member record using their Username (NomorAnggota) to get their full name
		var member models.Member
		if err := ic.DB.Where("nomor_anggota = ?", currentUser.Username).First(&member).Error; err != nil {
			// Fallback to username
			holderName = currentUser.Username
		} else {
			holderName = member.Nama
		}
	} else {
		// Admin / Official: they can also claim
		holderName = currentUser.Username
	}

	instrument.NamaPenggunaTerakhir = holderName

	if err := ic.DB.Save(&instrument).Error; err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to update instrument holder"})
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"message":    fmt.Sprintf("Berhasil memegang alat! Pengguna terakhir diubah menjadi: %s", holderName),
		"instrument": instrument,
	})
}

// MyInstruments returns the list of instruments held by the logged-in member
func (ic *InstrumentsController) MyInstruments(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	currentUser, err := middleware.GetUserFromContext(r)
	if err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"error": "Unauthorized"})
		return
	}

	var holderName string
	if currentUser.Role == "Member" {
		var member models.Member
		if err := ic.DB.Where("nomor_anggota = ?", currentUser.Username).First(&member).Error; err != nil {
			holderName = currentUser.Username
		} else {
			holderName = member.Nama
		}
	} else {
		holderName = currentUser.Username
	}

	var instruments []models.Instrument
	if err := ic.DB.Where("nama_pengguna_terakhir = ?", holderName).Order("jenis_alat asc").Find(&instruments).Error; err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to fetch instruments"})
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(instruments)
}

// Release clears the last user holder of an instrument
func (ic *InstrumentsController) Release(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	id := r.PathValue("id")
	if id == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Instrument ID is required"})
		return
	}

	currentUser, err := middleware.GetUserFromContext(r)
	if err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"error": "Unauthorized"})
		return
	}

	var instrument models.Instrument
	if err := ic.DB.First(&instrument, "id = ?", id).Error; err != nil {
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]string{"error": "Instrument not found"})
		return
	}

	// Security check: if Member, verify they are indeed the one holding it
	if currentUser.Role == "Member" {
		var member models.Member
		var holderName string
		if err := ic.DB.Where("nomor_anggota = ?", currentUser.Username).First(&member).Error; err == nil {
			holderName = member.Nama
		} else {
			holderName = currentUser.Username
		}

		if instrument.NamaPenggunaTerakhir != holderName {
			w.WriteHeader(http.StatusForbidden)
			json.NewEncoder(w).Encode(map[string]string{"error": "Anda tidak memiliki wewenang untuk mengembalikan alat ini"})
			return
		}
	}

	instrument.NamaPenggunaTerakhir = ""

	if err := ic.DB.Save(&instrument).Error; err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to release instrument"})
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "Berhasil mengembalikan alat musik!"})
}
