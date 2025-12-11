package base

import (
	"bytes"
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"net"
	"net/http"
	"time"

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
	log.Printf("🔌 Initializing plugin (ExecID: %s)", execId)

	resp, err := s.handler.Init(ctx, req)
	if err != nil {
		log.Printf("❌ Plugin initialization failed: %v", err)
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

	log.Printf("▶️  Running plugin (ExecID: %s, Workflow: %s, Node: %s)", execId, workflowId, nodeId)
	startTime := time.Now()

	err := s.handler.Run(req, stream)

	duration := time.Since(startTime)
	if err != nil {
		log.Printf("❌ Plugin execution failed after %v: %v", duration, err)
		return err
	}

	log.Printf("✅ Plugin execution completed successfully in %v", duration)
	return nil
}

// SubscribeTrigger delegates trigger streaming to the plugin handler
func (s *Server) SubscribeTrigger(req *pb.SubscribeTriggerRequest, stream pb.NodePluginService_SubscribeTriggerServer) error {
    log.Printf("📡 SubscribeTrigger started (consumer_group=%s)", req.GetConsumerGroup())
    startTime := time.Now()
    err := s.handler.SubscribeTrigger(req, stream)
    duration := time.Since(startTime)
    if err != nil {
        log.Printf("❌ SubscribeTrigger failed after %v: %v", duration, err)
        return err
    }
    log.Printf("✅ SubscribeTrigger completed in %v", duration)
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
		log.Fatalf("failed to listen: %v", err)
	}

	s := grpc.NewServer()
	pb.RegisterNodePluginServiceServer(s, &Server{handler: handler})

	log.Printf("🚀 Plugin listening at %v", lis.Addr())

	// Register with server asynchronously
	go func() {
		// Wait a bit for server to be ready if starting together
		time.Sleep(1 * time.Second)

		// Get metadata for registration
		metadata, err := handler.GetMetadata(context.Background())
		if err != nil {
			log.Printf("⚠️ Failed to get metadata for registration: %v", err)
			return
		}

		maxRetries := 10
		for i := 0; i < maxRetries; i++ {
			err := RegisterPlugin(*serverURL, *port, metadata)
			if err == nil {
				log.Printf("✅ Plugin registered successfully with %s", *serverURL)
				return
			}
			log.Printf("⚠️ Failed to register plugin (attempt %d/%d): %v", i+1, maxRetries, err)
			time.Sleep(3 * time.Second)
		}
		log.Printf("❌ Could not register plugin after %d attempts", maxRetries)
	}()

	if err := s.Serve(lis); err != nil {
		log.Fatalf("failed to serve: %v", err)
	}
}
