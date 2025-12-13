package handler

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/gw123/gflow/plugins/base-go"
	pb "github.com/gw123/gflow/plugins/base-go/proto"
	"github.com/gw123/gflow/plugins/gateway/event"
	"github.com/gw123/gflow/plugins/gateway/response"
	"github.com/gw123/glog"
)

// WorkflowHandler handles HTTP requests and converts them to workflow events
type WorkflowHandler struct {
	eventManager    *event.Manager
	responseManager *response.Manager
	authenticator   Authenticator
}

// Authenticator interface for authentication
type Authenticator interface {
	Authenticate(r *http.Request, body []byte) error
}

// NewWorkflowHandler creates a new workflow handler
func NewWorkflowHandler(eventMgr *event.Manager, respMgr *response.Manager, auth Authenticator) *WorkflowHandler {
	return &WorkflowHandler{
		eventManager:    eventMgr,
		responseManager: respMgr,
		authenticator:   auth,
	}
}

// Handle processes an HTTP request and triggers workflow execution
func (h *WorkflowHandler) Handle(w http.ResponseWriter, r *http.Request, workflow string, syncResponse bool, responseTimeoutMs int64) {
	// Create logger for this request
	logger := glog.Log().Named("gateway").
		WithField("method", r.Method).
		WithField("path", r.URL.Path).
		WithField("remote_addr", r.RemoteAddr).
		WithField("workflow", workflow)

	// Read request body
	rawBody, _ := io.ReadAll(r.Body)
	r.Body = io.NopCloser(bytes.NewBuffer(rawBody))

	// Authenticate
	if err := h.authenticator.Authenticate(r, rawBody); err != nil {
		h.sendErrorResponse(w, http.StatusUnauthorized, "unauthorized", err.Error(), "")
		return
	}
	// Build headers map
	headers := buildHeadersMap(r)
	logger.Debugf("构建的headers: %v", headers)

	// Build query map
	query := buildQueryMap(r)

	// Parse body
	bodyVal := parseBody(rawBody, r.Header.Get("Content-Type"))

	// Build payload
	payload := map[string]interface{}{
		"method":      r.Method,
		"path":        r.URL.Path,
		"headers":     headers,
		"query":       query,
		"body":        bodyVal,
		"raw_body":    string(rawBody),
		"remote_addr": r.RemoteAddr,
	}

	// Create trigger event
	ev := &pb.TriggerEvent{
		EventId:        uuid.NewString(),
		Source:         fmt.Sprintf("%s %s", r.Method, r.URL.Path),
		Payload:        base.GoToValue(payload),
		TimestampMs:    time.Now().UnixMilli(),
		TargetWorkflow: workflow,
	}

	// Add event_id to logger for tracing
	logger = logger.WithField("event_id", ev.EventId)

	// Check if sync response is requested via query param or header
	wantSync, timeoutMs := h.checkSyncRequest(r, syncResponse, responseTimeoutMs)

	// Register for sync response if needed
	var respChan <-chan *response.WorkflowResponse
	if wantSync && timeoutMs > 0 {
		respChan = h.responseManager.Register(ev.EventId, time.Duration(timeoutMs)*time.Millisecond)
	}

	// Publish event
	logger.Debug("Publishing event to workflow")
	if err := h.eventManager.Publish(ev); err != nil {
		if respChan != nil {
			h.responseManager.Unregister(ev.EventId)
		}
		logger.Errorf("Event publish failed: %v", err)
		h.sendErrorResponse(w, http.StatusServiceUnavailable, "service_unavailable", "Event channel blocked", ev.EventId)
		return
	}

	// Handle sync response
	if respChan != nil {
		h.handleSyncResponse(w, respChan, ev.EventId, timeoutMs)
		return
	}

	// Default async response
	h.sendAsyncResponse(w, ev.EventId)
}

// checkSyncRequest checks if synchronous response is requested
func (h *WorkflowHandler) checkSyncRequest(r *http.Request, syncResponse bool, responseTimeoutMs int64) (bool, int64) {
	wantSync := syncResponse
	timeoutMs := responseTimeoutMs

	// Check query param
	if q := r.URL.Query().Get("sync_response"); q != "" {
		if strings.EqualFold(q, "true") || q == "1" {
			wantSync = true
		}
	}

	// Check header
	if h := r.Header.Get("X-Sync-Response"); h != "" {
		if strings.EqualFold(h, "true") || h == "1" {
			wantSync = true
		}
	}

	// Get timeout from query param
	if q := r.URL.Query().Get("response_timeout_ms"); q != "" {
		if v, err := strconv.ParseInt(q, 10, 64); err == nil && v > 0 {
			timeoutMs = v
		}
	}

	// Get timeout from header
	if h := r.Header.Get("X-Response-Timeout-Ms"); h != "" {
		if v, err := strconv.ParseInt(h, 10, 64); err == nil && v > 0 {
			timeoutMs = v
		}
	}

	// Default timeout for sync requests
	if wantSync && timeoutMs <= 0 {
		timeoutMs = 30000
	}

	return wantSync, timeoutMs
}

// handleSyncResponse waits for and sends the workflow response
func (h *WorkflowHandler) handleSyncResponse(w http.ResponseWriter, respChan <-chan *response.WorkflowResponse, eventID string, timeoutMs int64) {
	select {
	case resp := <-respChan:
		h.sendWorkflowResponse(w, resp, eventID)
	case <-time.After(time.Duration(timeoutMs) * time.Millisecond):
		h.responseManager.Unregister(eventID)
		// Log timeout with eventID
		glog.Log().Named("gateway").
			WithField("event_id", eventID).
			WithField("timeout_ms", timeoutMs).
			Warn("Response timeout for event")
		h.sendErrorResponse(w, http.StatusGatewayTimeout, "gateway_timeout", "Workflow execution timed out", eventID)
	}
}

// sendWorkflowResponse sends the workflow response to the client
func (h *WorkflowHandler) sendWorkflowResponse(w http.ResponseWriter, resp *response.WorkflowResponse, eventID string) {
	w.Header().Set("Content-Type", "application/json")

	// Set custom headers
	if resp.Headers != nil {
		for k, v := range resp.Headers {
			w.Header().Set(k, v)
		}
	}

	// Handle error response
	if resp.Error != "" {
		w.WriteHeader(http.StatusInternalServerError)
		_ = json.NewEncoder(w).Encode(map[string]interface{}{
			"error":    "workflow_error",
			"message":  resp.Error,
			"event_id": eventID,
		})
		return
	}

	// Set status code
	statusCode := resp.StatusCode
	if statusCode == 0 {
		statusCode = http.StatusOK
	}
	w.WriteHeader(statusCode)

	// Write response body
	if resp.Body != nil {
		_ = json.NewEncoder(w).Encode(resp.Body)
	} else {
		_ = json.NewEncoder(w).Encode(map[string]interface{}{
			"success":  true,
			"event_id": eventID,
		})
	}
}

// sendAsyncResponse sends async acceptance response
func (h *WorkflowHandler) sendAsyncResponse(w http.ResponseWriter, eventID string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusAccepted)
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"accepted":  true,
		"event_id":  eventID,
		"forwarded": true,
	})
}

// sendErrorResponse sends an error response
func (h *WorkflowHandler) sendErrorResponse(w http.ResponseWriter, statusCode int, errorCode, message, eventID string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"error":    errorCode,
		"message":  message,
		"event_id": eventID,
	})
}

// buildHeadersMap builds a map of headers from the request
func buildHeadersMap(r *http.Request) map[string]interface{} {
	headers := map[string]interface{}{}
	originalHeaders := r.Header.Clone()

	for k, vals := range originalHeaders {
		// Skip the auto-cased X-Api-Key
		if strings.EqualFold(k, "X-API-Key") {
			continue
		}
		li := make([]interface{}, 0, len(vals))
		for _, v := range vals {
			li = append(li, v)
		}
		if len(li) == 1 {
			headers[k] = li[0]
		} else {
			headers[k] = li
		}
	}

	// Explicitly add X-API-Key with correct case
	if apiKey := r.Header.Get("X-API-Key"); apiKey != "" {
		headers["X-API-Key"] = apiKey
	}

	return headers
}

// buildQueryMap builds a map of query parameters from the request
func buildQueryMap(r *http.Request) map[string]interface{} {
	query := map[string]interface{}{}
	for k, vals := range r.URL.Query() {
		li := make([]interface{}, 0, len(vals))
		for _, v := range vals {
			li = append(li, v)
		}
		if len(li) == 1 {
			query[k] = li[0]
		} else {
			query[k] = li
		}
	}
	return query
}

// parseBody parses the request body
func parseBody(rawBody []byte, contentType string) interface{} {
	if len(rawBody) == 0 {
		return ""
	}

	if isJSONContent(contentType) {
		var obj interface{}
		if err := json.Unmarshal(rawBody, &obj); err == nil {
			return obj
		}
	}

	return string(rawBody)
}

// isJSONContent checks if the content type is JSON
func isJSONContent(ct string) bool {
	ct = strings.ToLower(strings.TrimSpace(ct))
	return strings.Contains(ct, "application/json") || strings.Contains(ct, "+json")
}
