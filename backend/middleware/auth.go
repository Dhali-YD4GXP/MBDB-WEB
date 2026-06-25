package middleware

import (
	"context"
	"errors"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"gorm.io/gorm"

	"mbdb-web-backend/models"
)

type contextKey string

const UserContextKey contextKey = "user"

// Claims represents JWT payload
type Claims struct {
	UserID   uint   `json:"user_id"`
	Username string `json:"username"`
	Role     string `json:"role"`
	jwt.RegisteredClaims
}

// GetJWTSecret retrieves JWT secret from env or returns default
func GetJWTSecret() []byte {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		secret = "mbdb_smansaagung_super_secret_key" // default fallback
	}
	return []byte(secret)
}

// GenerateToken generates a JWT token for a user
func GenerateToken(userID uint, username string, role string) (string, error) {
	claims := Claims{
		UserID:   userID,
		Username: username,
		Role:     role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(GetJWTSecret())
}

// ValidateToken parses and validates JWT token string
func ValidateToken(tokenStr string) (*Claims, error) {
	claims := &Claims{}
	token, err := jwt.ParseWithClaims(tokenStr, claims, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return GetJWTSecret(), nil
	})

	if err != nil {
		return nil, err
	}

	if !token.Valid {
		return nil, errors.New("invalid token")
	}

	return claims, nil
}

// AuthMiddleware authenticates requests and verifies user roles
func AuthMiddleware(db *gorm.DB, requiredRoles ...string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			authHeader := r.Header.Get("Authorization")
			if authHeader == "" {
				http.Error(w, `{"error":"Authorization header required"}`, http.StatusUnauthorized)
				return
			}

			// Format should be "Bearer <token>"
			parts := strings.Split(authHeader, " ")
			if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
				http.Error(w, `{"error":"Invalid authorization header format (Bearer <token>)"}`, http.StatusUnauthorized)
				return
			}

			tokenStr := parts[1]
			claims, err := ValidateToken(tokenStr)
			if err != nil {
				http.Error(w, `{"error":"Invalid or expired token"}`, http.StatusUnauthorized)
				return
			}

			// Verify user exists in database (to handle deleted/disabled accounts)
			var user models.User
			if err := db.First(&user, claims.UserID).Error; err != nil {
				http.Error(w, `{"error":"User no longer exists"}`, http.StatusUnauthorized)
				return
			}

			// Role verification
			if len(requiredRoles) > 0 {
				roleAllowed := false
				for _, role := range requiredRoles {
					if user.Role == role {
						roleAllowed = true
						break
					}
				}
				if !roleAllowed {
					http.Error(w, `{"error":"Forbidden: insufficient permissions"}`, http.StatusForbidden)
					return
				}
			}

			// Inject user info into request context
			ctx := context.WithValue(r.Context(), UserContextKey, &user)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// GetUserFromContext extracts the authenticated user from request context
func GetUserFromContext(r *http.Request) (*models.User, error) {
	val := r.Context().Value(UserContextKey)
	if val == nil {
		return nil, errors.New("user not found in context")
	}
	user, ok := val.(*models.User)
	if !ok {
		return nil, errors.New("invalid user context value")
	}
	return user, nil
}
