package controllers

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"gorm.io/gorm"

	"mbdb-web-backend/models"
)

type LostReportsController struct {
	DB *gorm.DB
}

// Create registers a new lost instrument report
func (lrc *LostReportsController) Create(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	var req struct {
		NamaAlat       string `json:"nama_alat"`
		LokasiHilang   string `json:"lokasi_hilang"`
		PlayerTerakhir string `json:"player_terakhir"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request payload"})
		return
	}

	req.NamaAlat = strings.TrimSpace(req.NamaAlat)
	req.LokasiHilang = strings.TrimSpace(req.LokasiHilang)
	req.PlayerTerakhir = strings.TrimSpace(req.PlayerTerakhir)

	if req.NamaAlat == "" || req.LokasiHilang == "" || req.PlayerTerakhir == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Nama alat, lokasi hilang, dan player terakhir wajib diisi"})
		return
	}

	report := models.LostReport{
		NamaAlat:       req.NamaAlat,
		LokasiHilang:   req.LokasiHilang,
		PlayerTerakhir: req.PlayerTerakhir,
		CreatedAt:      time.Now(),
	}

	if err := lrc.DB.Create(&report).Error; err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Gagal menyimpan laporan alat hilang"})
		return
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(report)
}

// List returns all lost instrument reports
func (lrc *LostReportsController) List(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	var reports []models.LostReport
	if err := lrc.DB.Order("created_at desc").Find(&reports).Error; err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Gagal memuat laporan alat hilang"})
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(reports)
}
