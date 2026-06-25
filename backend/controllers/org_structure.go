package controllers

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"mbdb-web-backend/middleware"
	"mbdb-web-backend/models"
)

type OrgStructureController struct {
	DB *gorm.DB
}

// Get retrieves the organization structure (Public)
func (oc *OrgStructureController) Get(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	var org models.OrgStructure
	if err := oc.DB.First(&org).Error; err != nil {
		org = models.OrgStructure{
			KetuaNama:      "Ketua MBDB",
			KetuaFoto:      "",
			Waka1Nama:      "Wakil Ketua 1",
			Waka1Foto:      "",
			Waka2Nama:      "Wakil Ketua 2",
			Waka2Foto:      "",
			SekretarisNama: "Sekretaris MBDB",
			SekretarisFoto: "",
			BendaharaNama:  "Bendahara MBDB",
			BendaharaFoto:  "",
			UpdatedAt:      time.Now(),
		}
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(org)
}

// Update modifies the organization structure names and photos (Admin Only)
func (oc *OrgStructureController) Update(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	currentUser, err := middleware.GetUserFromContext(r)
	if err != nil || currentUser.Role != "Admin" {
		w.WriteHeader(http.StatusForbidden)
		json.NewEncoder(w).Encode(map[string]string{"error": "Only Admins can update organization structure"})
		return
	}

	// Parse multipart form (max 10MB to accommodate overhead of up to 5 photos)
	err = r.ParseMultipartForm(15 * 1024 * 1024)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to parse multipart form data"})
		return
	}

	var org models.OrgStructure
	if err := oc.DB.First(&org).Error; err != nil {
		// Create default if missing
		org = models.OrgStructure{
			KetuaNama:      "Ketua MBDB",
			Waka1Nama:      "Wakil Ketua 1",
			Waka2Nama:      "Wakil Ketua 2",
			SekretarisNama: "Sekretaris MBDB",
			BendaharaNama:  "Bendahara MBDB",
		}
		oc.DB.Create(&org)
	}

	// Text Fields
	ketuaNama := r.FormValue("nama_ketua")
	waka1Nama := r.FormValue("nama_waka1")
	waka2Nama := r.FormValue("nama_waka2")
	sekretarisNama := r.FormValue("nama_sekretaris")
	bendaharaNama := r.FormValue("nama_bendahara")

	if ketuaNama != "" {
		org.KetuaNama = strings.TrimSpace(ketuaNama)
	}
	if waka1Nama != "" {
		org.Waka1Nama = strings.TrimSpace(waka1Nama)
	}
	if waka2Nama != "" {
		org.Waka2Nama = strings.TrimSpace(waka2Nama)
	}
	if sekretarisNama != "" {
		org.SekretarisNama = strings.TrimSpace(sekretarisNama)
	}
	if bendaharaNama != "" {
		org.BendaharaNama = strings.TrimSpace(bendaharaNama)
	}

	// Setup upload dir
	uploadDir := os.Getenv("UPLOAD_DIR")
	if uploadDir == "" {
		uploadDir = "./uploads/photos"
	}
	os.MkdirAll(uploadDir, 0755)

	// Helper to process photo uploads for each position
	processPhoto := func(fieldName string) (string, error) {
		file, fileHeader, err := r.FormFile(fieldName)
		if err != nil {
			if errors.Is(err, http.ErrMissingFile) {
				return "", nil // No file was uploaded for this field, ignore
			}
			return "", err
		}
		defer file.Close()

		// Validate magic bytes and size (2MB max)
		valid, _, err := middleware.ValidateImage(fileHeader)
		if !valid || err != nil {
			return "", fmt.Errorf("file %s tidak valid: %v", fieldName, err)
		}

		// Save file
		ext := strings.ToLower(filepath.Ext(fileHeader.Filename))
		filename := fmt.Sprintf("org_%s_%s%s", fieldName, uuid.New().String()[:8], ext)
		destPath := filepath.Join(uploadDir, filename)

		destFile, err := os.OpenFile(destPath, os.O_WRONLY|os.O_CREATE, 0644)
		if err != nil {
			return "", err
		}
		defer destFile.Close()

		if _, err := io.Copy(destFile, file); err != nil {
			return "", err
		}

		return fmt.Sprintf("/uploads/photos/%s", filename), nil
	}

	// Update Photos
	if foto, err := processPhoto("foto_ketua"); err == nil && foto != "" {
		org.KetuaFoto = foto
	} else if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
		return
	}

	if foto, err := processPhoto("foto_waka1"); err == nil && foto != "" {
		org.Waka1Foto = foto
	} else if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
		return
	}

	if foto, err := processPhoto("foto_waka2"); err == nil && foto != "" {
		org.Waka2Foto = foto
	} else if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
		return
	}

	if foto, err := processPhoto("foto_sekretaris"); err == nil && foto != "" {
		org.SekretarisFoto = foto
	} else if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
		return
	}

	if foto, err := processPhoto("foto_bendahara"); err == nil && foto != "" {
		org.BendaharaFoto = foto
	} else if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
		return
	}

	org.UpdatedAt = time.Now()

	if err := oc.DB.Save(&org).Error; err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to update org structure in database"})
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(org)
}
