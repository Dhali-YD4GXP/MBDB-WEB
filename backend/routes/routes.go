package routes

import (
	"net/http"
	"os"

	"gorm.io/gorm"

	"mbdb-web-backend/controllers"
	"mbdb-web-backend/middleware"
)

// SetupRoutes registers all routes and returns the server mux
func SetupRoutes(db *gorm.DB) *http.ServeMux {
	mux := http.NewServeMux()

	// Instantiate Controllers
	authCtrl := &controllers.AuthController{DB: db}
	appCtrl := &controllers.ApplicantsController{DB: db}
	instCtrl := &controllers.InstrumentsController{DB: db}
	sessCtrl := &controllers.SessionsController{DB: db}
	agendasCtrl := &controllers.AgendasController{DB: db}
	orgCtrl := &controllers.OrgStructureController{DB: db}
	financeCtrl := &controllers.FinanceController{DB: db}
	membersCtrl := &controllers.MembersController{DB: db}
	practiceSessCtrl := &controllers.PracticeSessionsController{DB: db}

	// 1. PUBLIC ROUTES
	mux.HandleFunc("POST /api/auth/login", authCtrl.Login)
	mux.HandleFunc("POST /api/applicants", appCtrl.Register)
	mux.HandleFunc("GET /api/agendas", agendasCtrl.List)
	mux.HandleFunc("GET /api/org-structure", orgCtrl.Get)
	mux.HandleFunc("GET /api/public/practice-sessions/{token}", practiceSessCtrl.GetByToken)
	mux.HandleFunc("POST /api/public/practice-sessions/{token}/attend", practiceSessCtrl.Attend)
	mux.HandleFunc("GET /api/applicants/status/{code}", appCtrl.GetStatus)

	// Static route for serving uploaded pas fotos securely
	uploadDir := os.Getenv("UPLOAD_DIR")
	if uploadDir == "" {
		uploadDir = "./uploads/photos"
	}
	// Strip prefix so FileServer looks in the actual uploadDir
	fileServer := http.FileServer(http.Dir(uploadDir))
	mux.Handle("GET /uploads/photos/", http.StripPrefix("/uploads/photos/", fileServer))

	// Static route for serving uploaded receipts securely
	receiptDir := "./uploads/receipts"
	if err := os.MkdirAll(receiptDir, 0755); err == nil {
		receiptServer := http.FileServer(http.Dir(receiptDir))
		mux.Handle("GET /uploads/receipts/", http.StripPrefix("/uploads/receipts/", receiptServer))
	}

	// 2. PROTECTED ROUTES (Admin Only)
	adminAuth := middleware.AuthMiddleware(db, "Admin")
	
	mux.Handle("POST /api/auth/register-official", adminAuth(http.HandlerFunc(authCtrl.RegisterOfficial)))
	mux.Handle("GET /api/applicants", adminAuth(http.HandlerFunc(appCtrl.List)))
	mux.Handle("PUT /api/applicants/{id}/status", adminAuth(http.HandlerFunc(appCtrl.UpdateStatus)))
	mux.Handle("DELETE /api/applicants/{id}", adminAuth(http.HandlerFunc(appCtrl.Delete)))
	mux.Handle("GET /api/applicants/export", adminAuth(http.HandlerFunc(appCtrl.ExportCSV)))
	mux.Handle("DELETE /api/instruments/{id}", adminAuth(http.HandlerFunc(instCtrl.Delete)))
	
	// Agendas management
	mux.Handle("POST /api/agendas", adminAuth(http.HandlerFunc(agendasCtrl.Create)))
	mux.Handle("PUT /api/agendas/{id}", adminAuth(http.HandlerFunc(agendasCtrl.Update)))
	mux.Handle("DELETE /api/agendas/{id}", adminAuth(http.HandlerFunc(agendasCtrl.Delete)))
	
	// Org structure update
	mux.Handle("PUT /api/org-structure", adminAuth(http.HandlerFunc(orgCtrl.Update)))

	// Practice Sessions management
	mux.Handle("POST /api/practice-sessions", adminAuth(http.HandlerFunc(practiceSessCtrl.Create)))
	mux.Handle("GET /api/practice-sessions", adminAuth(http.HandlerFunc(practiceSessCtrl.List)))
	mux.Handle("GET /api/practice-sessions/{id}", adminAuth(http.HandlerFunc(practiceSessCtrl.Get)))
	mux.Handle("PUT /api/practice-sessions/{id}/close", adminAuth(http.HandlerFunc(practiceSessCtrl.Close)))
	mux.Handle("GET /api/practice-sessions/{id}/export", adminAuth(http.HandlerFunc(practiceSessCtrl.Export)))

	// Members management
	mux.Handle("POST /api/members", adminAuth(http.HandlerFunc(membersCtrl.Create)))
	mux.Handle("PUT /api/members/{id}", adminAuth(http.HandlerFunc(membersCtrl.Update)))
	mux.Handle("DELETE /api/members/{id}", adminAuth(http.HandlerFunc(membersCtrl.Delete)))

	// 3. PROTECTED ROUTES (Official and Admin)
	staffAuth := middleware.AuthMiddleware(db, "Official", "Admin")

	// Members listing (both Official and Admin can view members)
	mux.Handle("GET /api/members", staffAuth(http.HandlerFunc(membersCtrl.List)))

	// Instruments CRUD
	mux.Handle("POST /api/instruments", staffAuth(http.HandlerFunc(instCtrl.Create)))
	mux.Handle("GET /api/instruments", staffAuth(http.HandlerFunc(instCtrl.List)))
	mux.Handle("GET /api/instruments/{id}", staffAuth(http.HandlerFunc(instCtrl.Detail)))
	mux.Handle("PUT /api/instruments/{id}", staffAuth(http.HandlerFunc(instCtrl.Update)))

	// Sessions Management (Practice/Event loading)
	mux.Handle("POST /api/sessions", staffAuth(http.HandlerFunc(sessCtrl.Start)))
	mux.Handle("POST /api/sessions/active/scan", staffAuth(http.HandlerFunc(sessCtrl.Scan)))
	mux.Handle("GET /api/sessions/active", staffAuth(http.HandlerFunc(sessCtrl.GetActive)))
	mux.Handle("POST /api/sessions/active/close", staffAuth(http.HandlerFunc(sessCtrl.Close)))
	mux.Handle("GET /api/sessions", staffAuth(http.HandlerFunc(sessCtrl.List)))
	mux.Handle("GET /api/sessions/{id}", staffAuth(http.HandlerFunc(sessCtrl.Detail)))

	// 4. PROTECTED ROUTES (Bendahara and Admin)
	financeAuth := middleware.AuthMiddleware(db, "Bendahara", "Admin")
	
	mux.Handle("GET /api/finance", financeAuth(http.HandlerFunc(financeCtrl.List)))
	mux.Handle("POST /api/finance", financeAuth(http.HandlerFunc(financeCtrl.Create)))

	return mux
}
