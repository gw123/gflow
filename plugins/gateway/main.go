package main

import (
    "bytes"
    "context"
    "crypto/hmac"
    "crypto/sha256"
    "encoding/hex"
    "encoding/json"
    "fmt"
    "io"
    "log"
    "net/http"
    "os"
    "strconv"
    "strings"
    "sync"
    "time"

	"github.com/google/uuid"
	"github.com/gw123/gflow/plugins/base-go"
	pb "github.com/gw123/gflow/plugins/base-go/proto"
)

// WorkflowResponse represents a response from workflow execution
type WorkflowResponse struct {
	Body       interface{}       `json:"body,omitempty"`
	StatusCode int               `json:"status_code,omitempty"`
	Headers    map[string]string `json:"headers,omitempty"`
	Error      string            `json:"error,omitempty"`
}

// ResponseChannel for receiving workflow responses
type ResponseChannel struct {
	EventID  string
	Response chan *WorkflowResponse
	Timeout  time.Duration
}

type GatewayPlugin struct {
	base.DefaultHandler
	mu        sync.Mutex
	httpSrv   *http.Server
	eventChan chan *pb.TriggerEvent
	started   bool
	// 存储当前的路由配置和安全配置
	currentRoutes []routeConfig
	currentSec    securityConfig
	// 用于向所有订阅者广播事件的通道列表
	subscribers []chan *pb.TriggerEvent
	// 用于同步响应的等待通道
	pendingResponses map[string]*ResponseChannel
}

func (p *GatewayPlugin) GetMetadata(ctx context.Context) (*pb.GetMetadataResponse, error) {
	// 自动启动 HTTP 服务器（如果尚未启动）
	if !p.started {
		go func() {
			// 使用默认配置启动
			defaultFilters := map[string]string{}
			if err := p.startHTTPServer(defaultFilters); err != nil {
				log.Printf("❌ 自动启动 HTTP 服务器失败: %v", err)
			}
		}()
	}
	return &pb.GetMetadataResponse{
		Name:        "http_gateway",
		DisplayName: "HTTP Gateway",
		Description: "监听指定路由的 HTTP 网关，推送触发事件，支持基础认证",
		Version:     "1.0.0",
		Icon:        "Globe",
		Category:    pb.NodeCategory_CATEGORY_TRIGGER,
		NodeType:    pb.NodeType_NODE_TYPE_TRIGGER,
		// 触发节点通常不定义输入输出参数
		InputParameters:  []*pb.ParameterDef{},
		OutputParameters: []*pb.ParameterDef{},
		Capabilities: &pb.PluginCapabilities{
			SupportsStreaming:  true,
			RequiresCredential: false,
			DefaultTimeoutMs:   30000,
		},
	}, nil
}

// Run is not used for trigger plugins; keep a minimal implementation
func (p *GatewayPlugin) Run(req *pb.RunRequest, stream pb.NodePluginService_RunServer) error {
	// No-op: trigger plugins use SubscribeTrigger
	return nil
}

// securityConfig holds basic auth configuration parsed from filters
type securityConfig struct {
	APIKey          string
	HMACSecret      string
	SignatureHeader string
	TimestampHeader string
	MaxSkewMs       int64
}

type routeConfig struct {
	Path            string   `json:"path"`
	Methods         []string `json:"methods"`
	TargetWorkflow  string   `json:"target_workflow,omitempty"`
	ResponseTimeout int64    `json:"response_timeout_ms,omitempty"` // Timeout in milliseconds for sync response
	SyncResponse    bool     `json:"sync_response,omitempty"`       // Whether to wait for workflow response
}

// startHTTPServer 启动或重启 HTTP 服务器
func (p *GatewayPlugin) startHTTPServer(filters map[string]string) error {
	p.mu.Lock()
	defer p.mu.Unlock()

	// Parse security
	sec := securityConfig{
		APIKey:          filters["api_key"],
		HMACSecret:      filters["hmac_secret"],
		SignatureHeader: filters["signature_header"],
		TimestampHeader: filters["timestamp_header"],
		MaxSkewMs:       300000,
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

	// Parse routes
	routes := []routeConfig{}
	defaultWorkflow := filters["target_workflow"]
	if rj, ok := filters["routes_json"]; ok && strings.TrimSpace(rj) != "" {
		if err := json.Unmarshal([]byte(rj), &routes); err != nil {
			return err
		}
	} else if rs, ok := filters["routes"]; ok && strings.TrimSpace(rs) != "" {
		parts := strings.Split(rs, ",")
		for _, pth := range parts {
			pth = strings.TrimSpace(pth)
			method := "ANY"
			path := pth
			if idx := strings.Index(pth, ":"); idx > 0 {
				method = strings.ToUpper(strings.TrimSpace(pth[:idx]))
				path = strings.TrimSpace(pth[idx+1:])
			}
			routes = append(routes, routeConfig{Path: path, Methods: []string{method}, TargetWorkflow: defaultWorkflow})
		}
	} else {
		// default: catch-all on /webhook
		routes = append(routes, routeConfig{Path: "/webhook", Methods: []string{"POST", "GET"}, TargetWorkflow: defaultWorkflow})
		// 添加默认的 API 路由
		routes = append(routes, routeConfig{Path: "/api/v1/orders", Methods: []string{"POST"}, TargetWorkflow: defaultWorkflow})
		routes = append(routes, routeConfig{Path: "/api/v1/status", Methods: []string{"GET"}, TargetWorkflow: defaultWorkflow})
	}

	// HTTP port
	port := 8080
	if v, ok := filters["http_port"]; ok {
		var parsed int
		fmt.Sscanf(v, "%d", &parsed)
		if parsed > 0 {
			port = parsed
		}
	}

	// 如果事件通道未初始化，初始化它
	if p.eventChan == nil {
		p.eventChan = make(chan *pb.TriggerEvent, 128)
		// 启动事件广播协程
		go p.broadcastEvents()
	}

	// 创建新的多路复用器
	mux := http.NewServeMux()

	// Register handlers
	for _, rc := range routes {
		methods := make(map[string]bool)
		for _, m := range rc.Methods {
			methods[strings.ToUpper(strings.TrimSpace(m))] = true
		}
		// If ANY present, allow all
		allowAny := methods["ANY"]
		// Default timeout is 30 seconds if sync response is enabled
		timeoutMs := rc.ResponseTimeout
		if rc.SyncResponse && timeoutMs <= 0 {
			timeoutMs = 30000
		}
		handler := p.makeHandler(methods, allowAny, rc.TargetWorkflow, sec, rc.SyncResponse, timeoutMs)
		mux.HandleFunc(rc.Path, handler)
		syncStr := ""
		if rc.SyncResponse {
			syncStr = fmt.Sprintf(", sync=%v, timeout=%dms", rc.SyncResponse, timeoutMs)
		}
		log.Printf("📥 HTTP Gateway route registered: %v %s (workflow=%s%s)", rc.Methods, rc.Path, rc.TargetWorkflow, syncStr)
	}

	// 创建新的 HTTP 服务器
	newSrv := &http.Server{
		Addr:    fmt.Sprintf(":%d", port),
		Handler: mux,
	}

	// 关闭旧服务器（如果存在）
	if p.httpSrv != nil {
		ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
		if err := p.httpSrv.Shutdown(ctx); err != nil {
			log.Printf("⚠️ 关闭旧 HTTP 服务器失败: %v", err)
		}
		cancel()
		log.Printf("🛑 旧 HTTP 服务器已关闭")
	}

	// 保存当前配置
	p.httpSrv = newSrv
	p.currentRoutes = routes
	p.currentSec = sec
	p.started = true

	// Start server in a goroutine
	go func() {
		log.Printf("🚪 HTTP Gateway 自动启动，监听端口 :%d", port)
		if err := p.httpSrv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Printf("❌ HTTP 服务器错误: %v", err)
			// 服务器崩溃后，尝试重启
			p.mu.Lock()
			p.started = false
			p.mu.Unlock()
			log.Printf("🔄 尝试重启 HTTP 服务器...")
			if err := p.startHTTPServer(filters); err != nil {
				log.Printf("❌ 重启 HTTP 服务器失败: %v", err)
			}
		}
	}()

	return nil
}

// broadcastEvents 广播事件到所有订阅者
func (p *GatewayPlugin) broadcastEvents() {
	for {
		select {
		case ev := <-p.eventChan:
			p.mu.Lock()
			// 向所有订阅者发送事件
			for _, subChan := range p.subscribers {
				select {
				case subChan <- ev:
					// ok
				case <-time.After(100 * time.Millisecond):
					log.Printf("⚠️ 订阅者通道阻塞，跳过事件 %s", ev.EventId)
				}
			}
			p.mu.Unlock()
		}
	}
}

// SubscribeTrigger 订阅触发事件
func (p *GatewayPlugin) SubscribeTrigger(req *pb.SubscribeTriggerRequest, stream pb.NodePluginService_SubscribeTriggerServer) error {
    filters := req.GetFilters()

    // 根据当前 filters 启动/重启 HTTP 服务器（允许动态更新配置）
    if err := p.startHTTPServer(filters); err != nil {
        return err
    }

	// 创建订阅者通道
	subChan := make(chan *pb.TriggerEvent, 64)

	// 添加到订阅者列表
	p.mu.Lock()
	p.subscribers = append(p.subscribers, subChan)
	p.mu.Unlock()

	// 清理函数
	defer func() {
		p.mu.Lock()
		// 从订阅者列表中移除
		for i, ch := range p.subscribers {
			if ch == subChan {
				p.subscribers = append(p.subscribers[:i], p.subscribers[i+1:]...)
				break
			}
		}
		p.mu.Unlock()
		close(subChan)
	}()

	// Stream events to server
	for {
		select {
		case ev := <-subChan:
			if err := stream.Send(ev); err != nil {
				return err
			}
		case <-stream.Context().Done():
			log.Printf("👋 订阅者断开连接")
			return nil
		}
	}
}

func (p *GatewayPlugin) makeHandler(methods map[string]bool, allowAny bool, workflow string, sec securityConfig, syncResponse bool, responseTimeoutMs int64) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Method check
		if !allowAny {
			if !methods[strings.ToUpper(r.Method)] {
				w.WriteHeader(http.StatusMethodNotAllowed)
				_ = json.NewEncoder(w).Encode(map[string]interface{}{"error": "method_not_allowed"})
				return
			}
		}

		// Read body early and restore Body for safety
		rawBody, _ := io.ReadAll(r.Body)
		r.Body = io.NopCloser(bytes.NewBuffer(rawBody))

		// Authentication: HMAC if provided, otherwise API Key
		if sec.HMACSecret != "" {
			sig := r.Header.Get(sec.SignatureHeader)
			tsStr := r.Header.Get(sec.TimestampHeader)
			if sig == "" || tsStr == "" {
				w.WriteHeader(http.StatusUnauthorized)
				_ = json.NewEncoder(w).Encode(map[string]interface{}{"error": "missing_signature_or_timestamp"})
				return
			}
			var ts int64
			if _, err := fmt.Sscanf(tsStr, "%d", &ts); err != nil {
				w.WriteHeader(http.StatusUnauthorized)
				_ = json.NewEncoder(w).Encode(map[string]interface{}{"error": "invalid_timestamp"})
				return
			}
			now := time.Now().UnixMilli()
			if ts < now-sec.MaxSkewMs || ts > now+sec.MaxSkewMs {
				w.WriteHeader(http.StatusUnauthorized)
				_ = json.NewEncoder(w).Encode(map[string]interface{}{"error": "timestamp_out_of_range"})
				return
			}
			mac := hmac.New(sha256.New, []byte(sec.HMACSecret))
			mac.Write([]byte(r.Method))
			mac.Write([]byte("|"))
			mac.Write([]byte(r.URL.Path))
			mac.Write([]byte("|"))
			mac.Write([]byte(tsStr))
			mac.Write([]byte("|"))
			mac.Write(rawBody)
			expected := hex.EncodeToString(mac.Sum(nil))
			// Accept hex or base64? We use hex here.
			if !secureCompare(expected, strings.TrimSpace(sig)) {
				w.WriteHeader(http.StatusUnauthorized)
				_ = json.NewEncoder(w).Encode(map[string]interface{}{"error": "invalid_signature"})
				return
			}
		} else if sec.APIKey != "" {
			provided := r.Header.Get("X-API-Key")
			if provided == "" {
				auth := r.Header.Get("Authorization")
				if strings.HasPrefix(strings.ToLower(auth), "bearer ") {
					provided = strings.TrimSpace(auth[7:])
				}
			}
			if strings.TrimSpace(provided) != sec.APIKey {
				w.WriteHeader(http.StatusUnauthorized)
				_ = json.NewEncoder(w).Encode(map[string]interface{}{"error": "unauthorized"})
				return
			}
		}

		// Build headers map - preserve original case where possible
		headers := map[string]interface{}{}
		// Get all headers
		originalHeaders := r.Header.Clone()
		// For each key, check if it has multiple values
		for k, vals := range originalHeaders {
			// Skip the auto-cased X-Api-Key since we'll explicitly add X-API-Key later
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
		// Explicitly add X-API-Key with correct case for authentication
		if apiKey := r.Header.Get("X-API-Key"); apiKey != "" {
			headers["X-API-Key"] = apiKey
		}

		// Debug: log headers before sending to workflow
		log.Printf("📋 最终构建的headers: %v", headers)

		// Build query map
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

		// Try to parse JSON body; fallback to string
		var bodyVal interface{}
		if len(rawBody) > 0 && isJSONContent(r.Header.Get("Content-Type")) {
			var obj interface{}
			if err := json.Unmarshal(rawBody, &obj); err == nil {
				bodyVal = obj
			} else {
				bodyVal = string(rawBody)
			}
		} else {
			bodyVal = string(rawBody)
		}

		payload := map[string]interface{}{
			"method":      r.Method,
			"path":        r.URL.Path,
			"headers":     headers,
			"query":       query,
			"body":        bodyVal,
			"raw_body":    string(rawBody),
			"remote_addr": r.RemoteAddr,
		}

		ev := &pb.TriggerEvent{
			EventId:        uuid.NewString(),
			Source:         fmt.Sprintf("%s %s", r.Method, r.URL.Path),
			Payload:        base.GoToValue(payload),
			TimestampMs:    time.Now().UnixMilli(),
			TargetWorkflow: workflow,
		}

        // For synchronous responses, create a response channel
        // Allow enabling sync via query param `sync_response=true|1`
        // and override timeout via `response_timeout_ms=<number>`
        var respChan *ResponseChannel
        wantSync := syncResponse
        if q := r.URL.Query().Get("sync_response"); q != "" {
            if strings.EqualFold(q, "true") || q == "1" { wantSync = true }
        }
        // Optional header to enable sync: X-Sync-Response: true
        if h := r.Header.Get("X-Sync-Response"); h != "" {
            if strings.EqualFold(h, "true") || h == "1" { wantSync = true }
        }

        timeoutMs := responseTimeoutMs
        if q := r.URL.Query().Get("response_timeout_ms"); q != "" {
            if v, err := strconv.ParseInt(q, 10, 64); err == nil && v > 0 { timeoutMs = v }
        }
        if h := r.Header.Get("X-Response-Timeout-Ms"); h != "" {
            if v, err := strconv.ParseInt(h, 10, 64); err == nil && v > 0 { timeoutMs = v }
        }
        // If sync is requested at request-time but no timeout provided via route or request,
        // default to 30s to ensure per-request sync works without route config.
        if wantSync && timeoutMs <= 0 {
            timeoutMs = 30000
        }

        if wantSync && timeoutMs > 0 {
            respChan = &ResponseChannel{
                EventID:  ev.EventId,
                Response: make(chan *WorkflowResponse, 1),
                Timeout:  time.Duration(timeoutMs) * time.Millisecond,
            }
            p.mu.Lock()
            p.pendingResponses[ev.EventId] = respChan
            p.mu.Unlock()
        }

		// push to channel
		select {
		case p.eventChan <- ev:
			// ok
		case <-time.After(2 * time.Second):
			log.Printf("⚠️ 事件通道阻塞，丢弃事件 %s", ev.EventId)
			// Clean up pending response if we couldn't send the event
			if respChan != nil {
				p.mu.Lock()
				delete(p.pendingResponses, ev.EventId)
				p.mu.Unlock()
			}
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusServiceUnavailable)
			_ = json.NewEncoder(w).Encode(map[string]interface{}{
				"error":    "service_unavailable",
				"message":  "Event channel blocked",
				"event_id": ev.EventId,
			})
			return
		}

        // If synchronous response is enabled, wait for the response
        if respChan != nil {
            select {
            case resp := <-respChan.Response:
				// Set response headers
				w.Header().Set("Content-Type", "application/json")
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
						"event_id": ev.EventId,
					})
					return
				}

				// Set status code (default 200)
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
						"event_id": ev.EventId,
					})
				}
				return

            case <-time.After(time.Duration(respChan.Timeout)):
                // Timeout - clean up and return 504
                p.mu.Lock()
                delete(p.pendingResponses, ev.EventId)
                p.mu.Unlock()

                log.Printf("⚠️ Response timeout for event %s after %dms", ev.EventId, timeoutMs)
                w.Header().Set("Content-Type", "application/json")
                w.WriteHeader(http.StatusGatewayTimeout)
                _ = json.NewEncoder(w).Encode(map[string]interface{}{
                    "error":    "gateway_timeout",
                    "message":  "Workflow execution timed out",
                    "event_id": ev.EventId,
                })
                return
            }
        }

		// Async response (default behavior)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusAccepted)
		_ = json.NewEncoder(w).Encode(map[string]interface{}{
			"accepted":  true,
			"event_id":  ev.EventId,
			"forwarded": true,
		})
	}
}

func secureCompare(a, b string) bool {
	if len(a) != len(b) {
		return false
	}
	// constant-time compare
	var result byte
	for i := 0; i < len(a); i++ {
		result |= a[i] ^ b[i]
	}
	return result == 0
}

func isJSONContent(ct string) bool {
	ct = strings.ToLower(strings.TrimSpace(ct))
	return strings.Contains(ct, "application/json") || strings.Contains(ct, "+json")
}

// deliverPendingResponse delivers a workflow response to a waiting HTTP request
func (p *GatewayPlugin) deliverPendingResponse(eventID string, response *WorkflowResponse) bool {
    p.mu.Lock()
    respChan, exists := p.pendingResponses[eventID]
    if exists {
        delete(p.pendingResponses, eventID)
    }
    p.mu.Unlock()

	if !exists || respChan == nil {
		log.Printf("⚠️ No pending request found for event %s", eventID)
		return false
	}

	select {
	case respChan.Response <- response:
		log.Printf("✅ Response delivered for event %s", eventID)
		return true
	case <-time.After(100 * time.Millisecond):
		log.Printf("⚠️ Response channel blocked for event %s", eventID)
		return false
	}
}

// DeliverResponse implements the gRPC RPC to deliver synchronous workflow response back to HTTP client
func (p *GatewayPlugin) DeliverResponse(ctx context.Context, req *pb.DeliverResponseRequest) (*pb.DeliverResponseResponse, error) {
    // Build WorkflowResponse from proto
    var body interface{}
    if req.HasResponse && req.Body != nil {
        body = base.ValueToGo(req.Body)
    }

    resp := &WorkflowResponse{
        Body:       body,
        StatusCode: int(req.StatusCode),
        Headers:    req.Headers,
        Error:      req.Error,
    }

    ok := p.deliverPendingResponse(req.EventId, resp)
    if !ok {
        return &pb.DeliverResponseResponse{Success: false, Error: fmt.Sprintf("no pending request for event_id=%s", req.EventId)}, nil
    }
    return &pb.DeliverResponseResponse{Success: true}, nil
}

// cleanupExpiredResponses removes expired pending responses
func (p *GatewayPlugin) cleanupExpiredResponses() {
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	for range ticker.C {
		p.mu.Lock()
		// Note: In a production system, you'd track creation time
		// For now, we rely on the timeout in makeHandler
		p.mu.Unlock()
	}
}

func main() {
	plugin := &GatewayPlugin{}
	// 初始化订阅者列表
	plugin.subscribers = []chan *pb.TriggerEvent{}
	// 初始化等待响应的映射
	plugin.pendingResponses = make(map[string]*ResponseChannel)
	// 启动清理协程
	go plugin.cleanupExpiredResponses()
	// 启动插件服务，使用指定的50053端口
	// 通过命令行参数传递端口号给base.Serve
	os.Args = append(os.Args, "--port", "50053")
	base.Serve(plugin)
}
