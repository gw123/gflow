package main

import (
	"context"
	"reflect"
	"sync"

	"github.com/gw123/gflow/plugins/base-go"
	pb "github.com/gw123/gflow/plugins/base-go/proto"
	"github.com/gw123/gflow/plugins/gateway/auth"
	"github.com/gw123/gflow/plugins/gateway/event"
	"github.com/gw123/gflow/plugins/gateway/handler"
	"github.com/gw123/gflow/plugins/gateway/response"
	"github.com/gw123/gflow/plugins/gateway/server"
	"github.com/gw123/glog"
)

// GatewayPlugin implements the gateway plugin
type GatewayPlugin struct {
	base.DefaultHandler
	eventManager    *event.Manager
	responseManager *response.Manager
	httpServer      *server.Server
	currentConfig   *ServerConfig
	serverStarted   bool       // 标记服务器是否已启动
	mu              sync.Mutex // 保护serverStarted标志
}

// NewGatewayPlugin creates a new gateway plugin instance
func NewGatewayPlugin() *GatewayPlugin {
	// Create managers
	eventMgr := event.NewManager()
	respMgr := response.NewManager()

	return &GatewayPlugin{
		eventManager:    eventMgr,
		responseManager: respMgr,
	}
}

// GetMetadata returns plugin metadata
func (p *GatewayPlugin) GetMetadata(ctx context.Context) (*pb.GetMetadataResponse, error) {
	return &pb.GetMetadataResponse{
		Name:             "http_gateway",
		DisplayName:      "HTTP Gateway",
		Description:      "监听指定路由的 HTTP 网关，推送触发事件，支持基础认证",
		Version:          "2.0.0",
		Icon:             "Globe",
		Category:         pb.NodeCategory_CATEGORY_TRIGGER,
		NodeType:         pb.NodeType_NODE_TYPE_TRIGGER,
		InputParameters:  []*pb.ParameterDef{},
		OutputParameters: []*pb.ParameterDef{},
		Capabilities: &pb.PluginCapabilities{
			SupportsStreaming:  true,
			RequiresCredential: false,
			DefaultTimeoutMs:   30000,
		},
	}, nil
}

// Run is not used for trigger plugins
func (p *GatewayPlugin) Run(req *pb.RunRequest, stream pb.NodePluginService_RunServer) error {
	// No-op: trigger plugins use SubscribeTrigger
	return nil
}

// SubscribeTrigger handles trigger event subscriptions
func (p *GatewayPlugin) SubscribeTrigger(req *pb.SubscribeTriggerRequest, stream pb.NodePluginService_SubscribeTriggerServer) error {
	filters := req.GetFilters()

	// Parse configuration
	config, err := ParseServerConfig(filters)
	if err != nil {
		return err
	}

	// Start HTTP server only once (first SubscribeTrigger caller wins)
	if err := p.startHTTPServerOnce(config); err != nil {
		return err
	}

	// Subscribe to events
	eventChan, cleanup := p.eventManager.Subscribe()
	defer cleanup()

	// Stream events to server
	for {
		select {
		case ev := <-eventChan:
			if err := stream.Send(ev); err != nil {
				return err
			}
		case <-stream.Context().Done():
			glog.Log().Info("订阅者断开连接")
			return nil
		}
	}
}

// startHTTPServerOnce ensures the HTTP server is started only once
func (p *GatewayPlugin) startHTTPServerOnce(config *ServerConfig) error {
	p.mu.Lock()
	defer p.mu.Unlock()

	// If server already started, check config changes and restart if needed
	if p.serverStarted {
		if p.currentConfig != nil && reflect.DeepEqual(*p.currentConfig, *config) {
			glog.Log().Named("gateway").Debug("HTTP服务器已启动，配置未变更，跳过重复启动")
			return nil
		}
		// Config changed - restart server with new config
		glog.Log().Named("gateway").Info("检测到配置变更，重启 HTTP 服务器以应用新路由")
		if err := p.startHTTPServer(config); err != nil {
			return err
		}
		p.currentConfig = config
		return nil
	}

	// Start server
	if err := p.startHTTPServer(config); err != nil {
		return err
	}

	p.serverStarted = true
	p.currentConfig = config
	return nil
}

// startHTTPServer starts or restarts the HTTP server
func (p *GatewayPlugin) startHTTPServer(config *ServerConfig) error {
	// Check if we need to restart
	if p.httpServer != nil && p.currentConfig != nil {
		// For simplicity, we always create a new server
		// In production, you might want to check if config actually changed
		ctx := context.Background()
		_ = p.httpServer.Stop(ctx)
	}

	// Create authenticator
	authenticator := auth.NewAuthenticator(
		config.Security.APIKey,
		config.Security.HMACSecret,
		config.Security.SignatureHeader,
		config.Security.TimestampHeader,
		config.Security.MaxSkewMs,
	)

	// Create workflow handler
	workflowHandler := handler.NewWorkflowHandler(p.eventManager, p.responseManager, authenticator)

	// Create HTTP server
	p.httpServer = server.NewServer(workflowHandler)

	// Convert config to server.ServerConfig
	srvConfig := &server.ServerConfig{
		Port:   config.Port,
		Routes: make([]server.RouteConfig, len(config.Routes)),
		Security: server.SecurityConfig{
			APIKey:          config.Security.APIKey,
			HMACSecret:      config.Security.HMACSecret,
			SignatureHeader: config.Security.SignatureHeader,
			TimestampHeader: config.Security.TimestampHeader,
			MaxSkewMs:       config.Security.MaxSkewMs,
		},
	}
	for i, r := range config.Routes {
		srvConfig.Routes[i] = server.RouteConfig{
			Path:            r.Path,
			Methods:         r.Methods,
			TargetWorkflow:  r.TargetWorkflow,
			ResponseTimeout: r.ResponseTimeout,
			SyncResponse:    r.SyncResponse,
		}
	}

	// Start server
	if err := p.httpServer.Start(srvConfig); err != nil {
		return err
	}

	p.currentConfig = config
	return nil
}

// DeliverResponse delivers a workflow response back to the HTTP client
func (p *GatewayPlugin) DeliverResponse(ctx context.Context, req *pb.DeliverResponseRequest) (*pb.DeliverResponseResponse, error) {
	// Build workflow response from proto
	var body interface{}
	if req.HasResponse && req.Body != nil {
		body = base.ValueToGo(req.Body)
	}

	resp := &response.WorkflowResponse{
		Body:       body,
		StatusCode: int(req.StatusCode),
		Headers:    req.Headers,
		Error:      req.Error,
	}

	// Deliver response
	if err := p.responseManager.Deliver(req.EventId, resp); err != nil {
		return &pb.DeliverResponseResponse{
			Success: false,
			Error:   err.Error(),
		}, nil
	}

	return &pb.DeliverResponseResponse{Success: true}, nil
}
