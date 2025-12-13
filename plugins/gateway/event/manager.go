package event

import (
	"sync"
	"time"

	pb "github.com/gw123/gflow/plugins/base-go/proto"
	"github.com/gw123/glog"
)

// Manager implements event broadcasting to multiple subscribers
type Manager struct {
	mu          sync.Mutex
	eventChan   chan *pb.TriggerEvent
	subscribers []chan *pb.TriggerEvent
}

// NewManager creates a new event manager
func NewManager() *Manager {
	m := &Manager{
		eventChan:   make(chan *pb.TriggerEvent, 128),
		subscribers: []chan *pb.TriggerEvent{},
	}
	go m.broadcastEvents()
	return m
}

// Publish sends an event to all subscribers
func (m *Manager) Publish(event *pb.TriggerEvent) error {
	select {
	case m.eventChan <- event:
		return nil
	case <-time.After(3 * time.Second):
		return &EventChannelBlockedError{EventID: event.EventId}
	}
}

// Subscribe adds a new subscriber and returns a channel to receive events
// The returned cleanup function should be called when the subscriber disconnects
func (m *Manager) Subscribe() (<-chan *pb.TriggerEvent, func()) {
	subChan := make(chan *pb.TriggerEvent, 64)

	m.mu.Lock()
	m.subscribers = append(m.subscribers, subChan)
	m.mu.Unlock()

	cleanup := func() {
		m.mu.Lock()
		defer m.mu.Unlock()
		for i, ch := range m.subscribers {
			if ch == subChan {
				m.subscribers = append(m.subscribers[:i], m.subscribers[i+1:]...)
				break
			}
		}
		close(subChan)
	}

	return subChan, cleanup
}

// broadcastEvents continuously broadcasts events to all subscribers
func (m *Manager) broadcastEvents() {
	for ev := range m.eventChan {
		m.mu.Lock()
		for _, subChan := range m.subscribers {
			select {
			case subChan <- ev:
				// ok
			case <-time.After(100 * time.Millisecond):
				glog.Log().Warnf("订阅者通道阻塞，跳过事件 %s", ev.EventId)
			}
		}
		m.mu.Unlock()
	}
}

// Close closes the event manager
func (m *Manager) Close() error {
	close(m.eventChan)
	return nil
}

// EventChannelBlockedError indicates the event channel is blocked
type EventChannelBlockedError struct {
	EventID string
}

func (e *EventChannelBlockedError) Error() string {
	return "event channel blocked for event: " + e.EventID
}
