package middleware

import (
	"net/http"
	"os"
)

// CORSMiddleware handles CORS permissions dynamically based on the ALLOWED_ORIGIN env var
func CORSMiddleware() func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			origin := r.Header.Get("Origin")
			allowedOrigin := os.Getenv("ALLOWED_ORIGIN")
			if allowedOrigin == "" {
				allowedOrigin = "*"
			}

			actualOrigin := allowedOrigin
			if origin != "" {
				// Dynamically allow localhost origins in dev environment
				if origin == allowedOrigin || (len(origin) >= 17 && origin[:17] == "http://localhost:") || (len(origin) >= 17 && origin[:17] == "http://127.0.0.1:") {
					actualOrigin = origin
				}
			}

			w.Header().Set("Access-Control-Allow-Origin", actualOrigin)
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

			// Handle preflight OPTIONS requests
			if r.Method == "OPTIONS" {
				w.WriteHeader(http.StatusOK)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}
