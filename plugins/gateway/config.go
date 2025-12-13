package main

import (
	"encoding/json"
	"fmt"
	"strings"
)

// ParseSecurityConfig parses security configuration from filters
func ParseSecurityConfig(filters map[string]string) SecurityConfig {
	sec := SecurityConfig{
		APIKey:          filters["api_key"],
		HMACSecret:      filters["hmac_secret"],
		SignatureHeader: filters["signature_header"],
		TimestampHeader: filters["timestamp_header"],
		MaxSkewMs:       300000, // Default 5 minutes
	}

	if sec.SignatureHeader == "" {
		sec.SignatureHeader = "X-Signature"
	}
	if sec.TimestampHeader == "" {
		sec.TimestampHeader = "X-Timestamp"
	}

	if v, ok := filters["timestamp_skew_ms"]; ok {
		var parsed int64
		fmt.Sscanf(v, "%d", &parsed)
		if parsed > 0 {
			sec.MaxSkewMs = parsed
		}
	}

	return sec
}

// ParseRouteConfig parses route configuration from filters
func ParseRouteConfig(filters map[string]string) ([]RouteConfig, error) {
	routes := []RouteConfig{}
	defaultWorkflow := filters["target_workflow"]

	// Try routes_json first
	if rj, ok := filters["routes_json"]; ok && strings.TrimSpace(rj) != "" {
		if err := json.Unmarshal([]byte(rj), &routes); err != nil {
			return nil, fmt.Errorf("failed to parse routes_json: %w", err)
		}
		return routes, nil
	}

	// Try routes field
	if rs, ok := filters["routes"]; ok && strings.TrimSpace(rs) != "" {
		rs = strings.TrimSpace(rs)
		// Support JSON format in routes field
		if strings.HasPrefix(rs, "[") || strings.HasPrefix(rs, "{") {
			if err := json.Unmarshal([]byte(rs), &routes); err == nil {
				return routes, nil
			}
			// Fall through to comma-separated parsing if JSON fails
		}

		// Parse comma-separated routes
		parts := strings.Split(rs, ",")
		for _, pth := range parts {
			pth = strings.TrimSpace(pth)
			method := "ANY"
			path := pth
			if idx := strings.Index(pth, ":"); idx > 0 {
				method = strings.ToUpper(strings.TrimSpace(pth[:idx]))
				path = strings.TrimSpace(pth[idx+1:])
			}
			routes = append(routes, RouteConfig{
				Path:           path,
				Methods:        []string{method},
				TargetWorkflow: defaultWorkflow,
			})
		}
		return routes, nil
	}

	// Default routes
	routes = append(routes, RouteConfig{
		Path:           "/webhook",
		Methods:        []string{"POST", "GET"},
		TargetWorkflow: defaultWorkflow,
	})
	routes = append(routes, RouteConfig{
		Path:           "/api/v1/orders",
		Methods:        []string{"POST"},
		TargetWorkflow: defaultWorkflow,
	})
	routes = append(routes, RouteConfig{
		Path:           "/api/v1/status",
		Methods:        []string{"GET"},
		TargetWorkflow: defaultWorkflow,
	})

	return routes, nil
}

// ParseServerConfig parses complete server configuration from filters
func ParseServerConfig(filters map[string]string) (*ServerConfig, error) {
	port := 8080
	if v, ok := filters["http_port"]; ok {
		var parsed int
		fmt.Sscanf(v, "%d", &parsed)
		if parsed > 0 {
			port = parsed
		}
	}

	routes, err := ParseRouteConfig(filters)
	if err != nil {
		return nil, err
	}

	security := ParseSecurityConfig(filters)

	return &ServerConfig{
		Port:     port,
		Routes:   routes,
		Security: security,
	}, nil
}
