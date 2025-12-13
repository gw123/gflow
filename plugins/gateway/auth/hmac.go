package auth

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"
)

// HMACAuthenticator implements HMAC signature authentication
type HMACAuthenticator struct {
	Secret          string
	SignatureHeader string
	TimestampHeader string
	MaxSkewMs       int64
}

// Authenticate verifies the HMAC signature
func (a *HMACAuthenticator) Authenticate(r *http.Request, body []byte) error {
	sig := r.Header.Get(a.SignatureHeader)
	tsStr := r.Header.Get(a.TimestampHeader)

	if sig == "" || tsStr == "" {
		return errors.New("missing signature or timestamp")
	}

	// Parse and validate timestamp
	var ts int64
	if _, err := fmt.Sscanf(tsStr, "%d", &ts); err != nil {
		return errors.New("invalid timestamp format")
	}

	now := time.Now().UnixMilli()
	if ts < now-a.MaxSkewMs || ts > now+a.MaxSkewMs {
		return errors.New("timestamp out of range")
	}

	// Compute expected signature
	mac := hmac.New(sha256.New, []byte(a.Secret))
	mac.Write([]byte(r.Method))
	mac.Write([]byte("|"))
	mac.Write([]byte(r.URL.Path))
	mac.Write([]byte("|"))
	mac.Write([]byte(tsStr))
	mac.Write([]byte("|"))
	mac.Write(body)
	expected := hex.EncodeToString(mac.Sum(nil))

	// Constant-time comparison
	if !secureCompare(expected, strings.TrimSpace(sig)) {
		return errors.New("invalid signature")
	}

	return nil
}

// secureCompare performs constant-time string comparison
func secureCompare(a, b string) bool {
	if len(a) != len(b) {
		return false
	}
	var result byte
	for i := 0; i < len(a); i++ {
		result |= a[i] ^ b[i]
	}
	return result == 0
}
