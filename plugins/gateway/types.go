package main

type RouteConfig struct {
	Path            string   `json:"path"`
	Methods         []string `json:"methods"`
	TargetWorkflow  string   `json:"target_workflow,omitempty"`
	ResponseTimeout int64    `json:"response_timeout_ms,omitempty"` // Timeout in milliseconds for sync response
	SyncResponse    bool     `json:"sync_response,omitempty"`       // Whether to wait for workflow response
}

// SecurityConfig holds authentication configuration
type SecurityConfig struct {
	APIKey          string
	HMACSecret      string
	SignatureHeader string
	TimestampHeader string
	MaxSkewMs       int64
}

// ServerConfig holds HTTP server configuration
type ServerConfig struct {
	Port     int
	Routes   []RouteConfig
	Security SecurityConfig
}
