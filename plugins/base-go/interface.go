package base

import (
	"context"

	pb "github.com/gw123/gflow/plugins/base-go/proto"
)

// PluginHandler defines the interface that plugins must implement
type PluginHandler interface {
	// GetMetadata returns the plugin metadata
	GetMetadata(ctx context.Context) (*pb.GetMetadataResponse, error)

	// Init initializes the plugin
	Init(ctx context.Context, req *pb.InitRequest) (*pb.InitResponse, error)

	// Run executes the plugin logic
	Run(req *pb.RunRequest, stream pb.NodePluginService_RunServer) error

	// Stop stops the plugin execution
	Stop(ctx context.Context, req *pb.StopRequest) (*pb.StopResponse, error)

	// TestCredential tests the provided credentials
	TestCredential(ctx context.Context, req *pb.TestCredentialRequest) (*pb.TestCredentialResponse, error)

	// HealthCheck checks the plugin health
	HealthCheck(ctx context.Context, req *pb.HealthCheckRequest) (*pb.HealthCheckResponse, error)
}

// DefaultHandler provides a default implementation for optional methods
type DefaultHandler struct{}

func (h *DefaultHandler) Init(ctx context.Context, req *pb.InitRequest) (*pb.InitResponse, error) {
	return &pb.InitResponse{Success: true}, nil
}

func (h *DefaultHandler) Stop(ctx context.Context, req *pb.StopRequest) (*pb.StopResponse, error) {
	return &pb.StopResponse{Success: true, Status: pb.StopStatus_STOP_STATUS_STOPPED}, nil
}

func (h *DefaultHandler) HealthCheck(ctx context.Context, req *pb.HealthCheckRequest) (*pb.HealthCheckResponse, error) {
	return &pb.HealthCheckResponse{Status: pb.HealthStatus_HEALTH_STATUS_HEALTHY, Message: "OK"}, nil
}

func (h *DefaultHandler) TestCredential(ctx context.Context, req *pb.TestCredentialRequest) (*pb.TestCredentialResponse, error) {
	return &pb.TestCredentialResponse{Success: true, Info: map[string]string{"message": "No credential check implemented"}}, nil
}
