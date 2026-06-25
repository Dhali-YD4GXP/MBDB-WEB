package controllers

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
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

	var tipeVal, keteranganVal string
	var jumlahVal float64
	var receiptPath string

	contentType := r.Header.Get("Content-Type")
	if strings.HasPrefix(contentType, "multipart/form-data") {
		err := r.ParseMultipartForm(10 * 1024 * 1024)
		if err != nil {
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(map[string]string{"error": "Failed to parse form data"})
			return
		}

		tipeVal = r.FormValue("tipe")
		keteranganVal = r.FormValue("keterangan")
		jumlahStr := r.FormValue("jumlah")
		if jumlahStr != "" {
			jumlahVal, _ = strconv.ParseFloat(jumlahStr, 64)
		}

		// Handle optional receipt file
		file, fileHeader, err := r.FormFile("receipt")
		if err == nil {
			defer file.Close()

			// Validate file size and type (Max 2MB)
			valid, _, err := middleware.ValidateImage(fileHeader)
			if !valid || err != nil {
				w.WriteHeader(http.StatusBadRequest)
				json.NewEncoder(w).Encode(map[string]string{"error": "Bukti struk tidak valid: " + err.Error()})
				return
			}

			// Generate a unique filename
			ext := strings.ToLower(filepath.Ext(fileHeader.Filename))
			uniqueFilename := fmt.Sprintf("%s%s", uuid.New().String(), ext)

			receiptDir := "./uploads/receipts"
			if err := os.MkdirAll(receiptDir, 0755); err != nil {
				w.WriteHeader(http.StatusInternalServerError)
				json.NewEncoder(w).Encode(map[string]string{"error": "Gagal membuat direktori bukti struk"})
				return
			}

			destPath := filepath.Join(receiptDir, uniqueFilename)
			destFile, err := os.OpenFile(destPath, os.O_WRONLY|os.O_CREATE, 0644)
			if err != nil {
				w.WriteHeader(http.StatusInternalServerError)
				json.NewEncoder(w).Encode(map[string]string{"error": "Gagal menyimpan file bukti struk"})
				return
			}
			defer destFile.Close()

			if _, err := io.Copy(destFile, file); err != nil {
				w.WriteHeader(http.StatusInternalServerError)
				json.NewEncoder(w).Encode(map[string]string{"error": "Gagal menulis file bukti struk"})
				return
			}

			receiptPath = fmt.Sprintf("/uploads/receipts/%s", uniqueFilename)
		}
	} else {
		var req struct {
			Tipe       string  `json:"tipe"`
			Jumlah     float64 `json:"jumlah"`
			Keterangan string  `json:"keterangan"`
		}

		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request payload"})
			return
		}
		tipeVal = req.Tipe
		keteranganVal = req.Keterangan
		jumlahVal = req.Jumlah
	}

	tipeVal = strings.TrimSpace(tipeVal)
	keteranganVal = strings.TrimSpace(keteranganVal)

	if tipeVal == "" || jumlahVal <= 0 || keteranganVal == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Tipe (Kas Masuk/Kas Keluar), Jumlah (>0), dan Keterangan wajib diisi"})
		return
	}

	// Normalize Tipe
	tipe := strings.Title(strings.ToLower(tipeVal))
	if tipe != "Kas Masuk" && tipe != "Kas Keluar" {
		if strings.ToLower(tipeVal) == "kas masuk" || tipeVal == "KasMasuk" {
			tipe = "Kas Masuk"
		} else if strings.ToLower(tipeVal) == "kas keluar" || tipeVal == "KasKeluar" {
			tipe = "Kas Keluar"
		} else {
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(map[string]string{"error": "Tipe harus 'Kas Masuk' atau 'Kas Keluar'"})
			return
		}
	}

	newRecord := models.FinanceRecord{
		Tipe:        tipe,
		Jumlah:      jumlahVal,
		Keterangan:  keteranganVal,
		ReceiptPath: receiptPath,
		CreatedBy:   currentUser.ID,
		Timestamp:   time.Now(),
	}

	if err := fc.DB.Create(&newRecord).Error; err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Gagal mencatat transaksi keuangan"})
		return
	}

	fc.DB.Preload("User").First(&newRecord, newRecord.ID)

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(newRecord)
}
