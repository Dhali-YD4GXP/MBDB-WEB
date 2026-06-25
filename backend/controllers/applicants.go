package controllers

import (
	"encoding/csv"
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

type ApplicantsController struct {
	DB *gorm.DB
}

// Register handles new applicant submissions (Public)
func (ac *ApplicantsController) Register(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	// Parse multipart form (max 10MB to accommodate overhead, but files are checked for 2MB max)
	err := r.ParseMultipartForm(10 * 1024 * 1024)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to parse form data"})
		return
	}

	nama := r.FormValue("nama")
	kelas := r.FormValue("kelas")
	pilihan1 := r.FormValue("pilihan1")
	pilihan2 := r.FormValue("pilihan2")
	pilihan3 := r.FormValue("pilihan3")

	if nama == "" || kelas == "" || pilihan1 == "" || pilihan2 == "" || pilihan3 == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "All text fields (nama, kelas, pilihan1, pilihan2, pilihan3) are required"})
		return
	}

	// Retrieve file from form
	file, fileHeader, err := r.FormFile("foto")
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Pas foto file ('foto') is required"})
		return
	}
	defer file.Close()

	// Validate file size, extension, and magic bytes
	valid, _, err := middleware.ValidateImage(fileHeader)
	if !valid || err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
		return
	}

	// Generate a unique filename to prevent overwriting/collisions
	ext := strings.ToLower(filepath.Ext(fileHeader.Filename))
	uniqueFilename := fmt.Sprintf("%s%s", uuid.New().String(), ext)

	// Determine upload directory
	uploadDir := os.Getenv("UPLOAD_DIR")
	if uploadDir == "" {
		uploadDir = "./uploads/photos"
	}

	// Create directory if not exists (safety fallback)
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to create photo storage directory"})
		return
	}

	destPath := filepath.Join(uploadDir, uniqueFilename)
	destFile, err := os.OpenFile(destPath, os.O_WRONLY|os.O_CREATE, 0644)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to save photo on server"})
		return
	}
	defer destFile.Close()

	// Copy file contents
	if _, err := io.Copy(destFile, file); err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to write photo file contents"})
		return
	}

	// Save applicant in database
	// We store a relative URL path to make it easy for frontend to request it
	fotoURL := fmt.Sprintf("/uploads/photos/%s", uniqueFilename)

	applicant := models.Applicant{
		Nama:      nama,
		Kelas:     kelas,
		FotoPath:  fotoURL,
		Pilihan1:  pilihan1,
		Pilihan2:  pilihan2,
		Pilihan3:  pilihan3,
		Status:    "Pending", // default
		CreatedAt: time.Now(),
	}

	if err := ac.DB.Create(&applicant).Error; err != nil {
		// Clean up uploaded file if DB insert fails
		os.Remove(destPath)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to save application to database"})
		return
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"message": "Application submitted successfully",
		"data":    applicant,
	})
}

// List handles listing applicants (Admin Only)
func (ac *ApplicantsController) List(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	// Verify Admin role (extra guard, though middleware should handle this)
	currentUser, err := middleware.GetUserFromContext(r)
	if err != nil || currentUser.Role != "Admin" {
		w.WriteHeader(http.StatusForbidden)
		json.NewEncoder(w).Encode(map[string]string{"error": "Only Admins can view the applicants list"})
		return
	}

	var applicants []models.Applicant
	statusFilter := r.URL.Query().Get("status")

	query := ac.DB.Order("created_at desc")
	if statusFilter != "" {
		query = query.Where("status = ?", statusFilter)
	}

	if err := query.Find(&applicants).Error; err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to fetch applicants list"})
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(applicants)
}

// UpdateStatus changes an applicant's status to Accepted or Rejected (Admin Only)
func (ac *ApplicantsController) UpdateStatus(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	currentUser, err := middleware.GetUserFromContext(r)
	if err != nil || currentUser.Role != "Admin" {
		w.WriteHeader(http.StatusForbidden)
		json.NewEncoder(w).Encode(map[string]string{"error": "Only Admins can update application status"})
		return
	}

	// Get applicant ID from URL query or path
	// Standard http library path extraction for Go 1.22: r.PathValue("id")
	idStr := r.PathValue("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid applicant ID"})
		return
	}

	var req struct {
		Status string `json:"status"` // "Accepted", "Rejected"
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request payload"})
		return
	}

	req.Status = strings.Title(strings.ToLower(req.Status)) // Normalize (Accepted, Rejected, Pending)
	if req.Status != "Accepted" && req.Status != "Rejected" && req.Status != "Pending" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Status must be 'Accepted' or 'Rejected'"})
		return
	}

	var applicant models.Applicant
	if err := ac.DB.First(&applicant, id).Error; err != nil {
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]string{"error": "Applicant not found"})
		return
	}

	oldStatus := applicant.Status
	applicant.Status = req.Status
	if err := ac.DB.Save(&applicant).Error; err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to update status"})
		return
	}

	// Auto-add to active members if status changed to Accepted
	if req.Status == "Accepted" && oldStatus != "Accepted" {
		newMember := models.Member{
			Nama:      applicant.Nama,
			Kelas:     applicant.Kelas,
			Alat:      applicant.Pilihan1, // Pilihan utama alat
			Status:    "Aktif",
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		}
		if err := ac.DB.Create(&newMember).Error; err != nil {
			fmt.Printf("Gagal menambahkan anggota aktif otomatis: %v\n", err)
		}
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"message":   fmt.Sprintf("Applicant status successfully updated to %s", req.Status),
		"applicant": applicant,
	})
}

// ExportCSV generates and returns a CSV file containing all applicants (Admin Only)
func (ac *ApplicantsController) ExportCSV(w http.ResponseWriter, r *http.Request) {
	currentUser, err := middleware.GetUserFromContext(r)
	if err != nil || currentUser.Role != "Admin" {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusForbidden)
		json.NewEncoder(w).Encode(map[string]string{"error": "Only Admins can export data"})
		return
	}

	var applicants []models.Applicant
	if err := ac.DB.Order("created_at asc").Find(&applicants).Error; err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to retrieve applicants for export"})
		return
	}

	// Set headers to trigger file download
	filename := fmt.Sprintf("applicants_mbdb_%s.csv", time.Now().Format("20060102_150405"))
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=%s", filename))
	w.Header().Set("Content-Type", "text/csv")
	w.Header().Set("Cache-Control", "no-store, no-cache, must-revalidate")

	writer := csv.NewWriter(w)
	defer writer.Flush()

	// Write header row
	header := []string{"ID", "Nama Lengkap", "Kelas", "Pilihan 1", "Pilihan 2", "Pilihan 3", "Status", "Foto Path", "Tanggal Daftar"}
	if err := writer.Write(header); err != nil {
		return
	}

	// Write data rows
	for _, app := range applicants {
		row := []string{
			strconv.Itoa(int(app.ID)),
			app.Nama,
			app.Kelas,
			app.Pilihan1,
			app.Pilihan2,
			app.Pilihan3,
			app.Status,
			app.FotoPath,
			app.CreatedAt.Format("2006-01-02 15:04:05"),
		}
		if err := writer.Write(row); err != nil {
			return
		}
	}
}
