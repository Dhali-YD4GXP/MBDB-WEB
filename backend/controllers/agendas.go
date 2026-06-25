package controllers

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
	"time"

	"gorm.io/gorm"

	"mbdb-web-backend/middleware"
	"mbdb-web-backend/models"
)

type AgendasController struct {
	DB *gorm.DB
}

// List returns all agendas ordered by date (Public)
func (ac *AgendasController) List(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	var agendas []models.Agenda
	// Order by Date ASC so that upcoming agendas appear first
	if err := ac.DB.Order("tanggal asc").Find(&agendas).Error; err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to fetch agendas"})
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(agendas)
}

// Create inserts a new agenda (Admin Only)
func (ac *AgendasController) Create(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	currentUser, err := middleware.GetUserFromContext(r)
	if err != nil || currentUser.Role != "Admin" {
		w.WriteHeader(http.StatusForbidden)
		json.NewEncoder(w).Encode(map[string]string{"error": "Only Admins can manage agendas"})
		return
	}

	var req struct {
		Judul      string `json:"judul"`
		Jenis      string `json:"jenis"` // "Lomba", "Penampilan", "Latihan"
		Tanggal    string `json:"tanggal"` // RFC3339 string: e.g. "2026-06-30T10:00:00Z"
		Tempat     string `json:"tempat"`
		Keterangan string `json:"keterangan"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request payload"})
		return
	}

	req.Judul = strings.TrimSpace(req.Judul)
	req.Jenis = strings.TrimSpace(req.Jenis)
	req.Tempat = strings.TrimSpace(req.Tempat)
	req.Keterangan = strings.TrimSpace(req.Keterangan)

	if req.Judul == "" || req.Jenis == "" || req.Tanggal == "" || req.Tempat == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Judul, Jenis, Tanggal, and Tempat are required"})
		return
	}

	jenis := strings.Title(strings.ToLower(req.Jenis))
	if jenis != "Lomba" && jenis != "Penampilan" && jenis != "Latihan" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Jenis must be 'Lomba', 'Penampilan', or 'Latihan'"})
		return
	}

	parsedDate, err := time.Parse(time.RFC3339, req.Tanggal)
	if err != nil {
		// Try fallback format "2006-01-02" or similar
		parsedDate, err = time.Parse("2006-01-02 15:04", req.Tanggal)
		if err != nil {
			parsedDate, err = time.Parse("2006-01-02", req.Tanggal)
			if err != nil {
				w.WriteHeader(http.StatusBadRequest)
				json.NewEncoder(w).Encode(map[string]string{"error": "Invalid date format; use YYYY-MM-DD or RFC3339 format"})
				return
			}
		}
	}

	newAgenda := models.Agenda{
		Judul:      req.Judul,
		Jenis:      jenis,
		Tanggal:    parsedDate,
		Tempat:     req.Tempat,
		Keterangan: req.Keterangan,
		CreatedAt:  time.Now(),
	}

	if err := ac.DB.Create(&newAgenda).Error; err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to create agenda"})
		return
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(newAgenda)
}

// Update modifies an existing agenda (Admin Only)
func (ac *AgendasController) Update(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	currentUser, err := middleware.GetUserFromContext(r)
	if err != nil || currentUser.Role != "Admin" {
		w.WriteHeader(http.StatusForbidden)
		json.NewEncoder(w).Encode(map[string]string{"error": "Only Admins can update agendas"})
		return
	}

	idStr := r.PathValue("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid agenda ID"})
		return
	}

	var req struct {
		Judul      string `json:"judul"`
		Jenis      string `json:"jenis"`
		Tanggal    string `json:"tanggal"`
		Tempat     string `json:"tempat"`
		Keterangan string `json:"keterangan"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request payload"})
		return
	}

	var agenda models.Agenda
	if err := ac.DB.First(&agenda, id).Error; err != nil {
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]string{"error": "Agenda not found"})
		return
	}

	if req.Judul != "" {
		agenda.Judul = strings.TrimSpace(req.Judul)
	}

	if req.Jenis != "" {
		jenis := strings.Title(strings.ToLower(strings.TrimSpace(req.Jenis)))
		if jenis != "Lomba" && jenis != "Penampilan" && jenis != "Latihan" {
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(map[string]string{"error": "Jenis must be 'Lomba', 'Penampilan', or 'Latihan'"})
			return
		}
		agenda.Jenis = jenis
	}

	if req.Tanggal != "" {
		parsedDate, err := time.Parse(time.RFC3339, req.Tanggal)
		if err != nil {
			parsedDate, err = time.Parse("2006-01-02 15:04", req.Tanggal)
			if err != nil {
				parsedDate, err = time.Parse("2006-01-02", req.Tanggal)
				if err != nil {
					w.WriteHeader(http.StatusBadRequest)
					json.NewEncoder(w).Encode(map[string]string{"error": "Invalid date format; use YYYY-MM-DD or RFC3339 format"})
					return
				}
			}
		}
		agenda.Tanggal = parsedDate
	}

	if req.Tempat != "" {
		agenda.Tempat = strings.TrimSpace(req.Tempat)
	}

	agenda.Keterangan = strings.TrimSpace(req.Keterangan)

	if err := ac.DB.Save(&agenda).Error; err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to update agenda"})
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(agenda)
}

// Delete removes an agenda (Admin Only)
func (ac *AgendasController) Delete(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	currentUser, err := middleware.GetUserFromContext(r)
	if err != nil || currentUser.Role != "Admin" {
		w.WriteHeader(http.StatusForbidden)
		json.NewEncoder(w).Encode(map[string]string{"error": "Only Admins can delete agendas"})
		return
	}

	idStr := r.PathValue("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid agenda ID"})
		return
	}

	var agenda models.Agenda
	if err := ac.DB.First(&agenda, id).Error; err != nil {
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]string{"error": "Agenda not found"})
		return
	}

	if err := ac.DB.Delete(&agenda).Error; err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to delete agenda"})
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "Agenda successfully deleted"})
}
