package controllers

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"gorm.io/gorm"

	"mbdb-web-backend/middleware"
	"mbdb-web-backend/models"
)

type FinanceController struct {
	DB *gorm.DB
}

type FinanceListResponse struct {
	Records     []models.FinanceRecord `json:"records"`
	TotalMasuk  float64                `json:"total_masuk"`
	TotalKeluar float64                `json:"total_keluar"`
	Saldo       float64                `json:"saldo"`
}

// List returns all financial records and summary statistics (Bendahara & Admin only)
func (fc *FinanceController) List(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	currentUser, err := middleware.GetUserFromContext(r)
	if err != nil || (currentUser.Role != "Bendahara" && currentUser.Role != "Admin") {
		w.WriteHeader(http.StatusForbidden)
		json.NewEncoder(w).Encode(map[string]string{"error": "Akses ditolak: hanya Bendahara dan Admin yang dapat mengakses keuangan"})
		return
	}

	var records []models.FinanceRecord
	if err := fc.DB.Order("timestamp desc").Preload("User").Find(&records).Error; err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to fetch financial records"})
		return
	}

	// Calculate statistics
	var totalMasuk float64
	var totalKeluar float64

	for _, r := range records {
		if r.Tipe == "Kas Masuk" {
			totalMasuk += r.Jumlah
		} else if r.Tipe == "Kas Keluar" {
			totalKeluar += r.Jumlah
		}
	}

	saldo := totalMasuk - totalKeluar

	resp := FinanceListResponse{
		Records:     records,
		TotalMasuk:  totalMasuk,
		TotalKeluar: totalKeluar,
		Saldo:       saldo,
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(resp)
}

// Create registers a new financial record (Bendahara & Admin only)
func (fc *FinanceController) Create(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	currentUser, err := middleware.GetUserFromContext(r)
	if err != nil || (currentUser.Role != "Bendahara" && currentUser.Role != "Admin") {
		w.WriteHeader(http.StatusForbidden)
		json.NewEncoder(w).Encode(map[string]string{"error": "Akses ditolak: hanya Bendahara dan Admin yang dapat mencatat keuangan"})
		return
	}

	var req struct {
		Tipe       string  `json:"tipe"` // "Kas Masuk" or "Kas Keluar"
		Jumlah     float64 `json:"jumlah"`
		Keterangan string  `json:"keterangan"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request payload"})
		return
	}

	req.Tipe = strings.TrimSpace(req.Tipe)
	req.Keterangan = strings.TrimSpace(req.Keterangan)

	if req.Tipe == "" || req.Jumlah <= 0 || req.Keterangan == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Tipe (Kas Masuk/Kas Keluar), Jumlah (>0), dan Keterangan wajib diisi"})
		return
	}

	// Normalize Tipe
	tipe := strings.Title(strings.ToLower(req.Tipe))
	if tipe != "Kas Masuk" && tipe != "Kas Keluar" {
		// Try space replacement as fallbacks
		if strings.ToLower(req.Tipe) == "kas masuk" || req.Tipe == "KasMasuk" {
			tipe = "Kas Masuk"
		} else if strings.ToLower(req.Tipe) == "kas keluar" || req.Tipe == "KasKeluar" {
			tipe = "Kas Keluar"
		} else {
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(map[string]string{"error": "Tipe harus 'Kas Masuk' atau 'Kas Keluar'"})
			return
		}
	}

	newRecord := models.FinanceRecord{
		Tipe:       tipe,
		Jumlah:     req.Jumlah,
		Keterangan: req.Keterangan,
		CreatedBy:  currentUser.ID,
		Timestamp:  time.Now(),
	}

	if err := fc.DB.Create(&newRecord).Error; err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Gagal mencatat transaksi keuangan"})
		return
	}

	// Fetch record back with preloaded User for instant UI refresh support
	fc.DB.Preload("User").First(&newRecord, newRecord.ID)

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(newRecord)
}
