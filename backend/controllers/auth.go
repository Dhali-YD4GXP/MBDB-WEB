package controllers

import (
	"encoding/json"
	"net/http"
	"strings"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"

	"mbdb-web-backend/middleware"
	"mbdb-web-backend/models"
)

type AuthController struct {
	DB *gorm.DB
}

type LoginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type LoginResponse struct {
	Token    string `json:"token"`
	Username string `json:"username"`
	Role     string `json:"role"`
	UserID   uint   `json:"user_id"`
}

type RegisterOfficialRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

// Login handles user authentication
func (ac *AuthController) Login(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request payload"})
		return
	}

	if req.Username == "" || req.Password == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Username and password are required"})
		return
	}

	var user models.User
	if err := ac.DB.Where("username = ?", req.Username).First(&user).Error; err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid username or password"})
		return
	}

	// Check if account has been activated
	if user.Password == "" {
		w.WriteHeader(http.StatusForbidden)
		json.NewEncoder(w).Encode(map[string]string{"error": "Akun Anda belum diaktivasi. Silakan lakukan aktivasi akun terlebih dahulu."})
		return
	}

	// Compare passwords
	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid username or password"})
		return
	}

	// Generate JWT token
	token, err := middleware.GenerateToken(user.ID, user.Username, user.Role)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to generate session token"})
		return
	}

	resp := LoginResponse{
		Token:    token,
		Username: user.Username,
		Role:     user.Role,
		UserID:   user.ID,
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(resp)
}

// RegisterOfficial allows Admins to create new Official accounts
func (ac *AuthController) RegisterOfficial(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	// Get current user from context to verify admin status
	currentUser, err := middleware.GetUserFromContext(r)
	if err != nil || currentUser.Role != "Admin" {
		w.WriteHeader(http.StatusForbidden)
		json.NewEncoder(w).Encode(map[string]string{"error": "Only Admins can register new Official accounts"})
		return
	}

	var req RegisterOfficialRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request payload"})
		return
	}

	if len(req.Username) < 3 || len(req.Password) < 6 {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{
			"error": "Username must be at least 3 characters and password at least 6 characters",
		})
		return
	}

	// Check if username already exists
	var count int64
	ac.DB.Model(&models.User{}).Where("username = ?", req.Username).Count(&count)
	if count > 0 {
		w.WriteHeader(http.StatusConflict)
		json.NewEncoder(w).Encode(map[string]string{"error": "Username is already taken"})
		return
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to hash password"})
		return
	}

	newOfficial := models.User{
		Username: req.Username,
		Password: string(hashedPassword),
		Role:     "Official",
	}

	if err := ac.DB.Create(&newOfficial).Error; err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to create official account"})
		return
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"message": "Official account successfully created",
		"user": map[string]interface{}{
			"id":       newOfficial.ID,
			"username": newOfficial.Username,
			"role":     newOfficial.Role,
		},
	})
}

type ActivateRequest struct {
	NomorAnggota    string `json:"nomor_anggota"`
	KodePendaftaran string `json:"kode_pendaftaran"`
	Password        string `json:"password"`
}

// Activate handles first-time account activation for active members
func (ac *AuthController) Activate(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	var req ActivateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request payload"})
		return
	}

	req.NomorAnggota = strings.TrimSpace(req.NomorAnggota)
	req.KodePendaftaran = strings.TrimSpace(req.KodePendaftaran)
	req.Password = strings.TrimSpace(req.Password)

	if req.NomorAnggota == "" || req.KodePendaftaran == "" || req.Password == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Nomor Anggota, Kode Pendaftaran, dan Password wajib diisi"})
		return
	}

	if len(req.Password) < 6 {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Password minimal harus 6 karakter"})
		return
	}

	// Find the member record
	var member models.Member
	if err := ac.DB.Where("nomor_anggota = ? AND kode_pendaftaran = ?", req.NomorAnggota, req.KodePendaftaran).First(&member).Error; err != nil {
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]string{"error": "Nomor Anggota atau Kode Pendaftaran tidak cocok/ditemukan"})
		return
	}

	// Find the corresponding User record
	var user models.User
	if err := ac.DB.Where("username = ?", req.NomorAnggota).First(&user).Error; err != nil {
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]string{"error": "Akun login untuk Nomor Anggota tersebut tidak ditemukan"})
		return
	}

	// Check if already activated
	if user.Password != "" {
		w.WriteHeader(http.StatusConflict)
		json.NewEncoder(w).Encode(map[string]string{"error": "Akun Anda sudah diaktivasi sebelumnya. Silakan langsung login."})
		return
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Gagal memproses password"})
		return
	}

	user.Password = string(hashedPassword)
	if err := ac.DB.Save(&user).Error; err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Gagal mengaktivasi akun"})
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "Akun berhasil diaktivasi! Silakan login menggunakan Nomor Anggota Anda."})
}

// Me returns the details of the currently logged-in user
func (ac *AuthController) Me(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	currentUser, err := middleware.GetUserFromContext(r)
	if err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"error": "Unauthorized"})
		return
	}

	response := map[string]interface{}{
		"id":       currentUser.ID,
		"username": currentUser.Username,
		"role":     currentUser.Role,
	}

	if currentUser.Role == "Member" {
		var member models.Member
		if err := ac.DB.Where("nomor_anggota = ?", currentUser.Username).First(&member).Error; err == nil {
			response["member"] = member
		}
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}
