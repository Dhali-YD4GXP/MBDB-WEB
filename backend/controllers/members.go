package controllers

import (
	"crypto/rand"
	"encoding/json"
	"fmt"
	"log"
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

// List returns all members with their attendance statistics (Admin & Official)
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

	// Calculate total practice sessions
	var totalSessions int64
	if err := mc.DB.Model(&models.PracticeSession{}).Count(&totalSessions).Error; err != nil {
		totalSessions = 0
	}

	// Calculate attendance stats grouped by lowercase name
	type AttendanceStats struct {
		Nama  string
		Count int64
	}
	var stats []AttendanceStats
	if err := mc.DB.Model(&models.AttendanceRecord{}).
		Select("LOWER(nama) as nama, COUNT(DISTINCT(practice_session_id)) as count").
		Group("LOWER(nama)").
		Scan(&stats).Error; err != nil {
		log.Printf("Warning: failed to calculate member attendance stats: %v", err)
	}

	statsMap := make(map[string]int64)
	for _, s := range stats {
		statsMap[strings.ToLower(s.Nama)] = s.Count
	}

	// Construct response
	type MemberWithStats struct {
		models.Member
		TotalLatihan int64 `json:"total_latihan"`
		HadirLatihan int64 `json:"hadir_latihan"`
	}

	response := make([]MemberWithStats, len(members))
	for i, m := range members {
		hadir := statsMap[strings.ToLower(m.Nama)]
		response[i] = MemberWithStats{
			Member:       m,
			TotalLatihan: totalSessions,
			HadirLatihan: hadir,
		}
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
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
		Nama     string `json:"nama"`
		Kelas    string `json:"kelas"`
		Alat     string `json:"alat"`
		Status   string `json:"status"` // "Aktif" or "Alumni"
		Angkatan string `json:"angkatan"`
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
	req.Angkatan = strings.TrimSpace(req.Angkatan)

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

	activationCode := ""
	var nomorAnggota string
	if req.Status == "Aktif" || req.Status == "Alumni" {
		angkatanClean := strings.TrimSpace(req.Angkatan)
		if angkatanClean == "" {
			angkatanClean = "XX"
		}
		var count int64
		mc.DB.Model(&models.Member{}).Where("angkatan = ?", req.Angkatan).Count(&count)
		nomorUrut := fmt.Sprintf("%03d", count+1)
		nomorAnggota = fmt.Sprintf("MBDB-%s-%s", angkatanClean, nomorUrut)

		// generate a random unique registration code for activation
		const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
		bytes := make([]byte, 6)
		_, _ = rand.Read(bytes)
		for i, b := range bytes {
			bytes[i] = chars[b%byte(len(chars))]
		}
		activationCode = "REG-" + string(bytes)
	}

	newMember := models.Member{
		NomorAnggota:    nomorAnggota,
		Nama:            req.Nama,
		Kelas:           req.Kelas,
		Alat:            req.Alat,
		Status:          req.Status,
		Angkatan:        req.Angkatan,
		KodePendaftaran: activationCode,
		CreatedAt:       time.Now(),
		UpdatedAt:       time.Now(),
	}

	if err := mc.DB.Create(&newMember).Error; err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Gagal menambahkan anggota"})
		return
	}

	if req.Status == "Aktif" || req.Status == "Alumni" {
		newUser := models.User{
			Username:  nomorAnggota,
			Password:  "", // inactive until set by user
			Role:      "Member",
			CreatedAt: time.Now(),
		}
		if err := mc.DB.Create(&newUser).Error; err != nil {
			fmt.Printf("Gagal membuat akun user anggota manual: %v\n", err)
		}
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
		Nama     string `json:"nama"`
		Kelas    string `json:"kelas"`
		Alat     string `json:"alat"`
		Status   string `json:"status"` // "Aktif" or "Alumni"
		Angkatan string `json:"angkatan"`
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
	if req.Angkatan != "" {
		member.Angkatan = strings.TrimSpace(req.Angkatan)
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

// Lookup looks up a member's NomorAnggota and activation code (Public)
func (mc *MembersController) Lookup(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	var req struct {
		Nama     string `json:"nama"`
		Angkatan string `json:"angkatan"`
		Alat     string `json:"alat"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Payload request tidak valid"})
		return
	}

	req.Nama = strings.TrimSpace(req.Nama)
	req.Angkatan = strings.TrimSpace(req.Angkatan)
	req.Alat = strings.TrimSpace(req.Alat)

	if req.Nama == "" || req.Angkatan == "" || req.Alat == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Nama, Angkatan, dan Alat musik wajib diisi"})
		return
	}

	var member models.Member
	if err := mc.DB.Where("LOWER(nama) = LOWER(?) AND angkatan = ? AND LOWER(alat) = LOWER(?)", req.Nama, req.Angkatan, req.Alat).First(&member).Error; err != nil {
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]string{"error": "Data anggota tidak ditemukan. Periksa kembali keselarasan nama, angkatan, dan alat musik Anda."})
		return
	}

	var user models.User
	if err := mc.DB.Where("username = ?", member.NomorAnggota).First(&user).Error; err != nil {
		// If user doesn't exist, create it as inactive
		user = models.User{
			Username:  member.NomorAnggota,
			Password:  "",
			Role:      "Member",
			CreatedAt: time.Now(),
		}
		_ = mc.DB.Create(&user)
	}

	if user.Password != "" {
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"status":        "active",
			"nomor_anggota": member.NomorAnggota,
			"message":       "Akun Anda sudah aktif. Silakan gunakan Nomor Anggota Anda untuk login.",
		})
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status":           "inactive",
		"nomor_anggota":    member.NomorAnggota,
		"kode_pendaftaran": member.KodePendaftaran,
		"message":          "Akun Anda belum diaktivasi. Silakan catat Nomor Anggota dan Kode Aktivasi di bawah untuk melakukan aktivasi.",
	})
}

// ListAlumni returns all alumni (Public - no auth)
func (mc *MembersController) ListAlumni(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	var alumni []models.Member
	if err := mc.DB.Where("status = ?", "Alumni").Order("angkatan desc, nama asc").Find(&alumni).Error; err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to fetch alumni"})
		return
	}

	// Return a simplified list of public alumni info
	type PublicAlumni struct {
		ID       uint   `json:"id"`
		Nama     string `json:"nama"`
		Angkatan string `json:"angkatan"`
		Alat     string `json:"alat"`
	}

	response := make([]PublicAlumni, len(alumni))
	for i, a := range alumni {
		response[i] = PublicAlumni{
			ID:       a.ID,
			Nama:     a.Nama,
			Angkatan: a.Angkatan,
			Alat:     a.Alat,
		}
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}
