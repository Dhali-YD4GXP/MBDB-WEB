package main

import (
	"fmt"
	"log"
	"net/http"
	"os"

	"mbdb-web-backend/config"
	"mbdb-web-backend/middleware"
	"mbdb-web-backend/routes"
)

func main() {
	// 1. Load configuration and environment variables
	config.LoadEnv()

	// 2. Initialize Database connection & auto migrations
	db := config.InitDB()

	// 3. Setup router mapping
	mux := routes.SetupRoutes(db)

	// 4. Apply CORS middleware to the entire router
	corsHandler := middleware.CORSMiddleware()(mux)

	// 5. Start Server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080" // default port
	}

	log.Printf("Server is starting on port %s...", port)
	log.Printf("API documentation/endpoints registered successfully.")
	
	addr := fmt.Sprintf(":%s", port)
	if err := http.ListenAndServe(addr, corsHandler); err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}
