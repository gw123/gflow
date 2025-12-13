package server

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"github.com/gw123/gflow/plugins/gateway/handler"
	"github.com/gw123/glog"
)

// RouteConfig defines a single route configuration
type RouteConfig struct {
	Path            string   `json:"path"`
	Methods         []string `json:"methods"`
	TargetWorkflow  string   `json:"target_workflow,omitempty"`
	ResponseTimeout int64    `json:"response_timeout_ms,omitempty"`
	SyncResponse    bool     `json:"sync_response,omitempty"`
}

// ServerConfig holds HTTP server configuration
type ServerConfig struct {
	Port     int
	Routes   []RouteConfig
	Security SecurityConfig
}

// SecurityConfig holds authentication configuration
type SecurityConfig struct {
	APIKey          string
	HMACSecret      string
	SignatureHeader string
	TimestampHeader string
	MaxSkewMs       int64
}

// Server manages the HTTP server
type Server struct {
	httpSrv         *http.Server
	workflowHandler *handler.WorkflowHandler
}

// NewServer creates a new HTTP server
func NewServer(workflowHandler *handler.WorkflowHandler) *Server {
	return &Server{
		workflowHandler: workflowHandler,
	}
}

// Start starts the HTTP server with the given configuration
func (s *Server) Start(config *ServerConfig) error {
	// Note: authenticator is already in the workflow handler
	// Create router
	mux := http.NewServeMux()

	// Register routes
	for _, route := range config.Routes {
		s.registerRoute(mux, route)
	}

	// Create HTTP server
	s.httpSrv = &http.Server{
		Addr:    fmt.Sprintf(":%d", config.Port),
		Handler: mux,
	}

	// Start server in goroutine
	go func() {
		glog.Log().Infof("HTTP Gateway 启动，监听端口 :%d", config.Port)
		if err := s.httpSrv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			glog.Log().Errorf("HTTP 服务器错误: %v", err)
		}
	}()

	return nil
}

// Stop stops the HTTP server
func (s *Server) Stop(ctx context.Context) error {
	if s.httpSrv == nil {
		return nil
	}

	glog.Log().Info("正在关闭 HTTP 服务器...")
	if err := s.httpSrv.Shutdown(ctx); err != nil {
		glog.Log().Warnf("关闭 HTTP 服务器失败: %v", err)
		return err
	}

	glog.Log().Info("HTTP 服务器已关闭")
	return nil
}

// registerRoute registers a single route
func (s *Server) registerRoute(mux *http.ServeMux, route RouteConfig) {
	// Build method map
	methods := make(map[string]bool)
	for _, m := range route.Methods {
		methods[strings.ToUpper(strings.TrimSpace(m))] = true
	}
	allowAny := methods["ANY"]

	// Default timeout
	timeoutMs := route.ResponseTimeout
	if route.SyncResponse && timeoutMs <= 0 {
		timeoutMs = 30000
	}

	// Create handler
	handlerFunc := s.makeRouteHandler(methods, allowAny, route.TargetWorkflow, route.SyncResponse, timeoutMs)
	mux.HandleFunc(route.Path, handlerFunc)

	// Log route registration
	syncStr := ""
	if route.SyncResponse {
		syncStr = fmt.Sprintf(", sync=%v, timeout=%dms", route.SyncResponse, timeoutMs)
	}
	glog.Log().Named("gateway").
		WithField("path", route.Path).
		WithField("methods", route.Methods).
		WithField("workflow", route.TargetWorkflow).
		Infof("HTTP Gateway route registered%s", syncStr)
}

// makeRouteHandler creates an HTTP handler for a route
func (s *Server) makeRouteHandler(methods map[string]bool, allowAny bool, workflow string, syncResponse bool, responseTimeoutMs int64) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Method check
		if !allowAny && !methods[strings.ToUpper(r.Method)] {
			w.WriteHeader(http.StatusMethodNotAllowed)
			_ = json.NewEncoder(w).Encode(map[string]interface{}{"error": "method_not_allowed"})
			return
		}

		// Read body once for authentication (handler will read it again)
		// Authentication happens in the handler which reads the body
		// We just delegate to the handler directly
		s.workflowHandler.Handle(w, r, workflow, syncResponse, responseTimeoutMs)
	}
}
