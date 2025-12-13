package response

import (
	"sync"
	"time"

	"github.com/gw123/glog"
)

// WorkflowResponse represents a response from workflow execution
type WorkflowResponse struct {
	Body       interface{}       `json:"body,omitempty"`
	StatusCode int               `json:"status_code,omitempty"`
	Headers    map[string]string `json:"headers,omitempty"`
	Error      string            `json:"error,omitempty"`
}

// Manager handles synchronous workflow responses
type Manager struct {
	mu               sync.Mutex
	pendingResponses map[string]chan *WorkflowResponse
}

// NewManager creates a new response manager
func NewManager() *Manager {
	m := &Manager{
		pendingResponses: make(map[string]chan *WorkflowResponse),
	}
	go m.cleanupExpiredResponses()
	return m
}

// Register registers a pending response and returns a channel to wait on
func (m *Manager) Register(eventID string, timeout time.Duration) <-chan *WorkflowResponse {
	respChan := make(chan *WorkflowResponse, 1)

	m.mu.Lock()
	m.pendingResponses[eventID] = respChan
	m.mu.Unlock()

	return respChan
}

// Deliver delivers a response to a waiting request
func (m *Manager) Deliver(eventID string, response *WorkflowResponse) error {
	m.mu.Lock()
	respChan, exists := m.pendingResponses[eventID]
	if exists {
		delete(m.pendingResponses, eventID)
	}
	m.mu.Unlock()

	if !exists || respChan == nil {
		glog.Log().Warnf("No pending request found for event %s", eventID)
		return &NoPendingRequestError{EventID: eventID}
	}

	select {
	case respChan <- response:
		glog.Log().Infof("Response delivered for event %s", eventID)
		return nil
	case <-time.After(100 * time.Millisecond):
		glog.Log().Warnf("Response channel blocked for event %s", eventID)
		return &ResponseChannelBlockedError{EventID: eventID}
	}
}

// Unregister removes a pending response (e.g., on timeout)
func (m *Manager) Unregister(eventID string) {
	m.mu.Lock()
	delete(m.pendingResponses, eventID)
	m.mu.Unlock()
}

// cleanupExpiredResponses runs periodic cleanup
// Note: Currently a placeholder as cleanup is handled by timeout in handler
func (m *Manager) cleanupExpiredResponses() {
	// In production, you might track creation timestamps and clean up
	// responses that have exceeded their timeout period
	select {}
}

// NoPendingRequestError indicates no pending request was found
type NoPendingRequestError struct {
	EventID string
}

func (e *NoPendingRequestError) Error() string {
	return "no pending request for event: " + e.EventID
}

// ResponseChannelBlockedError indicates the response channel is blocked
type ResponseChannelBlockedError struct {
	EventID string
}

func (e *ResponseChannelBlockedError) Error() string {
	return "response channel blocked for event: " + e.EventID
}
