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

type MembersController struct {
	DB *gorm.DB
}

// List returns all members (Admin & Official)
func (mc *MembersController) List(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	_, err := middleware.GetUserFromContext(r)
	if err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"error": "Unauthorized"})
		return
	}

	var members []models.Member
	statusQuery := r.URL.Query().Get("status") // "Aktif" or "Alumni"

	query := mc.DB.Order("nama asc")
	if statusQuery != "" {
		query = query.Where("status = ?", statusQuery)
	}

	if err := query.Find(&members).Error; err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to fetch members"})
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(members)
}

// Create manually registers a member (Admin only)
func (mc *MembersController) Create(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	currentUser, err := middleware.GetUserFromContext(r)
	if err != nil || currentUser.Role != "Admin" {
		w.WriteHeader(http.StatusForbidden)
		json.NewEncoder(w).Encode(map[string]string{"error": "Forbidden: Admin access required"})
		return
	}

	var req struct {
		Nama   string `json:"nama"`
		Kelas  string `json:"kelas"`
		Alat   string `json:"alat"`
		Status string `json:"status"` // "Aktif" or "Alumni"
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request body"})
		return
	}

	req.Nama = strings.TrimSpace(req.Nama)
	req.Kelas = strings.TrimSpace(req.Kelas)
	req.Alat = strings.TrimSpace(req.Alat)
	req.Status = strings.TrimSpace(req.Status)

	if req.Nama == "" || req.Kelas == "" || req.Alat == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Nama, Kelas, dan Alat wajib diisi"})
		return
	}

	if req.Status == "" {
		req.Status = "Aktif"
	} else if req.Status != "Aktif" && req.Status != "Alumni" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Status harus 'Aktif' atau 'Alumni'"})
		return
	}

	newMember := models.Member{
		Nama:      req.Nama,
		Kelas:     req.Kelas,
		Alat:      req.Alat,
		Status:    req.Status,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	if err := mc.DB.Create(&newMember).Error; err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Gagal menambahkan anggota"})
		return
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(newMember)
}

// Update updates a member's information or status (Admin only)
func (mc *MembersController) Update(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	currentUser, err := middleware.GetUserFromContext(r)
	if err != nil || currentUser.Role != "Admin" {
		w.WriteHeader(http.StatusForbidden)
		json.NewEncoder(w).Encode(map[string]string{"error": "Forbidden: Admin access required"})
		return
	}

	memberIDStr := r.PathValue("id")
	memberID, err := strconv.ParseUint(memberIDStr, 10, 64)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid member ID"})
		return
	}

	var member models.Member
	if err := mc.DB.First(&member, memberID).Error; err != nil {
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]string{"error": "Anggota tidak ditemukan"})
		return
	}

	var req struct {
		Nama   string `json:"nama"`
		Kelas  string `json:"kelas"`
		Alat   string `json:"alat"`
		Status string `json:"status"` // "Aktif" or "Alumni"
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request body"})
		return
	}

	if req.Nama != "" {
		member.Nama = strings.TrimSpace(req.Nama)
	}
	if req.Kelas != "" {
		member.Kelas = strings.TrimSpace(req.Kelas)
	}
	if req.Alat != "" {
		member.Alat = strings.TrimSpace(req.Alat)
	}
	if req.Status != "" {
		req.Status = strings.TrimSpace(req.Status)
		if req.Status != "Aktif" && req.Status != "Alumni" {
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(map[string]string{"error": "Status harus 'Aktif' atau 'Alumni'"})
			return
		}
		member.Status = req.Status
	}
	member.UpdatedAt = time.Now()

	if err := mc.DB.Save(&member).Error; err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Gagal memperbarui data anggota"})
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(member)
}

// Delete removes a member (Admin only)
func (mc *MembersController) Delete(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	currentUser, err := middleware.GetUserFromContext(r)
	if err != nil || currentUser.Role != "Admin" {
		w.WriteHeader(http.StatusForbidden)
		json.NewEncoder(w).Encode(map[string]string{"error": "Forbidden: Admin access required"})
		return
	}

	memberIDStr := r.PathValue("id")
	memberID, err := strconv.ParseUint(memberIDStr, 10, 64)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid member ID"})
		return
	}

	var member models.Member
	if err := mc.DB.First(&member, memberID).Error; err != nil {
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]string{"error": "Anggota tidak ditemukan"})
		return
	}

	if err := mc.DB.Delete(&member).Error; err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Gagal menghapus anggota"})
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "Anggota berhasil dihapus"})
}
