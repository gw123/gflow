package main

import (
	"context"
	"fmt"
	"time"

	"github.com/gw123/gflow/plugins/base-go"
	pb "github.com/gw123/gflow/plugins/base-go/proto"
)

type MyPluginPlugin struct {
	base.DefaultHandler
}

func (p *MyPluginPlugin) GetMetadata(ctx context.Context) (*pb.GetMetadataResponse, error) {
	return &pb.GetMetadataResponse{
		Name:        "my_plugin",
		DisplayName: "MyPlugin",
		Description: "for test",
		Version:     "1.0.0",
		Icon:        "Activity", // See https://lucide.dev/icons/ for icon names
		Category:    pb.NodeCategory_CATEGORY_ACTION,
		NodeType:    pb.NodeType_NODE_TYPE_PROCESSOR,
		InputParameters: []*pb.ParameterDef{
			{
				Name:         "input",
				DisplayName:  "Input",
				Type:         pb.ParameterType_PARAM_TYPE_STRING,
				Required:     true,
				Description:  "Example input parameter",
			},
		},
		OutputParameters: []*pb.ParameterDef{
			{
				Name:        "output",
				DisplayName: "Output",
				Type:        pb.ParameterType_PARAM_TYPE_STRING,
				Description: "Example output result",
			},
		},
	}, nil
}

func (p *MyPluginPlugin) Run(req *pb.RunRequest, stream pb.NodePluginService_RunServer) error {
	// Parse parameters
	params := make(map[string]interface{})
	for k, v := range req.Parameters {
		params[k] = base.ValueToGo(v)
	}

	input, _ := params["input"].(string)

	// Send a log message
	stream.Send(&pb.RunResponse{
		Type:        pb.ResponseType_RESPONSE_TYPE_LOG,
		TimestampMs: time.Now().UnixMilli(),
		Payload: &pb.RunResponse_Log{
			Log: &pb.LogPayload{
				Level:   pb.LogLevel_LOG_LEVEL_INFO,
				Message: fmt.Sprintf("Processing input: %s", input),
			},
		},
	})

	// Simulate processing
	time.Sleep(500 * time.Millisecond)

	// Return result
	result := fmt.Sprintf("Processed: %s", input)

	stream.Send(&pb.RunResponse{
		Type:        pb.ResponseType_RESPONSE_TYPE_RESULT,
		TimestampMs: time.Now().UnixMilli(),
		Payload: &pb.RunResponse_Result{
			Result: &pb.ResultPayload{
				Output: map[string]*pb.Value{
					"output": base.GoToValue(result),
				},
				Status:     pb.ExecutionStatus_EXECUTION_STATUS_SUCCESS,
			},
		},
	})

	return nil
}

func main() {
	plugin := &MyPluginPlugin{}
	base.Serve(plugin)
}
