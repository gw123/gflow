package auth

import (
	"errors"
	"net/http"
	"strings"
)

// APIKeyAuthenticator implements API key authentication
type APIKeyAuthenticator struct {
	APIKey string
}

// Authenticate verifies the API key from request headers
func (a *APIKeyAuthenticator) Authenticate(r *http.Request, body []byte) error {
	provided := r.Header.Get("X-API-Key")
	if provided == "" {
		// Also check Authorization header with Bearer token
		auth := r.Header.Get("Authorization")
		if strings.HasPrefix(strings.ToLower(auth), "bearer ") {
			provided = strings.TrimSpace(auth[7:])
		}
	}

	if strings.TrimSpace(provided) != a.APIKey {
		return errors.New("unauthorized: invalid API key")
	}

	return nil
}
