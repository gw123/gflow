package auth

import (
	"net/http"
)

// Authenticator defines the authentication interface
type Authenticator interface {
	// Authenticate verifies if the request is authenticated
	// Returns nil if authentication passes, otherwise returns an error
	Authenticate(r *http.Request, body []byte) error
}

// NewAuthenticator creates an authenticator based on the security configuration
func NewAuthenticator(apiKey, hmacSecret, signatureHeader, timestampHeader string, maxSkewMs int64) Authenticator {
	if hmacSecret != "" {
		return &HMACAuthenticator{
			Secret:          hmacSecret,
			SignatureHeader: signatureHeader,
			TimestampHeader: timestampHeader,
			MaxSkewMs:       maxSkewMs,
		}
	}
	if apiKey != "" {
		return &APIKeyAuthenticator{
			APIKey: apiKey,
		}
	}
	return &NoAuthenticator{}
}
