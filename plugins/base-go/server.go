package base

import (
	"bytes"
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"net"
	"net/http"
	"time"

	"github.com/gw123/glog"

	pb "github.com/gw123/gflow/plugins/base-go/proto"
	"google.golang.org/grpc"
)

// Server wraps the gRPC server and plugin handler
type Server struct {
	pb.UnimplementedNodePluginServiceServer
	handler PluginHandler
}

func (s *Server) GetMetadata(ctx context.Context, req *pb.GetMetadataRequest) (*pb.GetMetadataResponse, error) {
	return s.handler.GetMetadata(ctx)
}

func (s *Server) Init(ctx context.Context, req *pb.InitRequest) (*pb.InitResponse, error) {
	execId := "unknown"
	if req.Context != nil {
		execId = req.Context.ExecutionId
	}
	glog.Log().Named("plugin").WithField("exec_id", execId).Info("初始化插件")

	resp, err := s.handler.Init(ctx, req)
	if err != nil {
		glog.Log().Named("plugin").WithField("exec_id", execId).Errorf("插件初始化失败: %v", err)
		return nil, err
	}
	return resp, nil
}

func (s *Server) Run(req *pb.RunRequest, stream pb.NodePluginService_RunServer) error {
	execId := "unknown"
	workflowId := "unknown"
	nodeId := "unknown"

	if req.Context != nil {
		execId = req.Context.ExecutionId
		workflowId = req.Context.WorkflowId
		nodeId = req.Context.NodeId
	}

	glog.Log().Named("plugin").
		WithField("exec_id", execId).
		WithField("workflow", workflowId).
		WithField("node", nodeId).
		Info("运行插件")
	startTime := time.Now()

	err := s.handler.Run(req, stream)

	duration := time.Since(startTime)
	if err != nil {
		glog.Log().Named("plugin").
			WithField("exec_id", execId).
			WithField("duration", duration.String()).
			Errorf("插件执行失败: %v", err)
		return err
	}

	glog.Log().Named("plugin").
		WithField("exec_id", execId).
		WithField("duration", duration.String()).
		Info("插件执行完成")
	return nil
}

// SubscribeTrigger delegates trigger streaming to the plugin handler
func (s *Server) SubscribeTrigger(req *pb.SubscribeTriggerRequest, stream pb.NodePluginService_SubscribeTriggerServer) error {
	glog.Log().Named("plugin").WithField("consumer_group", req.GetConsumerGroup()).Info("订阅触发器启动")
	startTime := time.Now()
	err := s.handler.SubscribeTrigger(req, stream)
	duration := time.Since(startTime)
	if err != nil {
		glog.Log().Named("plugin").
			WithField("consumer_group", req.GetConsumerGroup()).
			WithField("duration", duration.String()).
			Errorf("订阅触发器失败: %v", err)
		return err
	}
	glog.Log().Named("plugin").WithField("duration", duration.String()).Info("订阅触发器完成")
	return nil
}

func (s *Server) Stop(ctx context.Context, req *pb.StopRequest) (*pb.StopResponse, error) {
	return s.handler.Stop(ctx, req)
}

func (s *Server) TestCredential(ctx context.Context, req *pb.TestCredentialRequest) (*pb.TestCredentialResponse, error) {
	return s.handler.TestCredential(ctx, req)
}

func (s *Server) HealthCheck(ctx context.Context, req *pb.HealthCheckRequest) (*pb.HealthCheckResponse, error) {
	return s.handler.HealthCheck(ctx, req)
}

// DeliverResponse delegates synchronous response delivery to the plugin handler
func (s *Server) DeliverResponse(ctx context.Context, req *pb.DeliverResponseRequest) (*pb.DeliverResponseResponse, error) {
	return s.handler.DeliverResponse(ctx, req)
}

// RegisterPlugin registers the plugin with the gFlow server
func RegisterPlugin(serverURL string, pluginPort int, metadata *pb.GetMetadataResponse) error {
	payload := map[string]interface{}{
		"kind":         metadata.Name,
		"name":         metadata.DisplayName,
		"endpoint":     fmt.Sprintf("localhost:%d", pluginPort),
		"enabled":      true,
		"category":     convertCategory(metadata.Category),
		"icon":         metadata.Icon,
		"description":  metadata.Description,
		"health_check": true,
		"version":      metadata.Version,
	}

	jsonData, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	resp, err := http.Post(fmt.Sprintf("%s/api/plugins", serverURL), "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("registration failed with status: %d", resp.StatusCode)
	}

	return nil
}

func convertCategory(cat pb.NodeCategory) string {
	// Simple mapping, can be expanded
	switch cat {
	case pb.NodeCategory_CATEGORY_TRIGGER:
		return "trigger"
	case pb.NodeCategory_CATEGORY_ACTION:
		return "action"
	case pb.NodeCategory_CATEGORY_INTEGRATION:
		return "data"
	case pb.NodeCategory_CATEGORY_AI:
		return "ai"
	default:
		return "plugin"
	}
}

// Serve starts the plugin server
func Serve(handler PluginHandler) {
	port := flag.Int("port", 0, "The server port (0 for random)")
	serverURL := flag.String("server", "http://localhost:3001", "The gFlow server URL")
	flag.Parse()

	if *port == 0 {
		*port = 50051 // Default fallback
	}

	lis, err := net.Listen("tcp", fmt.Sprintf(":%d", *port))
	if err != nil {
		glog.Log().Named("plugin").Fatalf("监听失败: %v", err)
	}

	s := grpc.NewServer()
	pb.RegisterNodePluginServiceServer(s, &Server{handler: handler})

	glog.Log().Named("plugin").Infof("插件启动，监听地址 %v", lis.Addr())

	// Register with server asynchronously
	go func() {
		// Wait a bit for server to be ready if starting together
		time.Sleep(1 * time.Second)

		// Get metadata for registration
		metadata, err := handler.GetMetadata(context.Background())
		if err != nil {
			glog.Log().Named("plugin").Warnf("获取元数据失败: %v", err)
			return
		}

		maxRetries := 10
		for i := 0; i < maxRetries; i++ {
			err := RegisterPlugin(*serverURL, *port, metadata)
			if err == nil {
				glog.Log().Named("plugin").Infof("插件注册成功: %s", *serverURL)
				return
			}
			glog.Log().Named("plugin").
				WithField("attempt", fmt.Sprintf("%d/%d", i+1, maxRetries)).
				Warnf("插件注册失败: %v", err)
			time.Sleep(3 * time.Second)
		}
		glog.Log().Named("plugin").Errorf("多次尝试后仍无法注册插件 (%d 次)", maxRetries)
	}()

	if err := s.Serve(lis); err != nil {
		glog.Log().Named("plugin").Fatalf("服务启动失败: %v", err)
	}
}
