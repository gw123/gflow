package auth

import (
	"net/http"
)

// NoAuthenticator implements Authenticator with no authentication
type NoAuthenticator struct{}

// Authenticate always returns nil (no authentication required)
func (a *NoAuthenticator) Authenticate(r *http.Request, body []byte) error {
	return nil
}
