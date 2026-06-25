package middleware

import (
	"errors"
	"mime/multipart"
	"net/http"
	"path/filepath"
	"strings"
)

const MaxFileSize = 2 * 1024 * 1024 // 2MB

// ValidateImage performs strict file checks including size, extension, and magic bytes
func ValidateImage(fileHeader *multipart.FileHeader) (bool, string, error) {
	// 1. Check File Size
	if fileHeader.Size > MaxFileSize {
		return false, "", errors.New("file size exceeds the maximum limit of 2MB")
	}

	// 2. Check File Extension (Sanity Check)
	ext := strings.ToLower(filepath.Ext(fileHeader.Filename))
	if ext != ".jpg" && ext != ".jpeg" && ext != ".png" {
		return false, "", errors.New("invalid file extension; only JPG, JPEG, and PNG are allowed")
	}

	// 3. Check Magic Bytes (Content Type Detection)
	file, err := fileHeader.Open()
	if err != nil {
		return false, "", errors.New("failed to open upload file for verification")
	}
	defer file.Close()

	// Read the first 512 bytes to determine the content type
	buffer := make([]byte, 512)
	n, err := file.Read(buffer)
	if err != nil && n == 0 {
		return false, "", errors.New("failed to read file magic bytes")
	}

	// Detect content type
	contentType := http.DetectContentType(buffer[:n])
	
	// We only allow image/jpeg and image/png
	if contentType != "image/jpeg" && contentType != "image/png" {
		return false, "", errors.New("invalid file content type; file must be a real JPEG or PNG image")
	}

	return true, contentType, nil
}
