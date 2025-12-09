package main

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/gw123/gflow/plugins/base-go"
	pb "github.com/gw123/gflow/plugins/base-go/proto"
)

type TimerTriggerPlugin struct {
	base.DefaultHandler
}

func (p *TimerTriggerPlugin) GetMetadata(ctx context.Context) (*pb.GetMetadataResponse, error) {
	return &pb.GetMetadataResponse{
		Name:        "timer_trigger",
		DisplayName: "Timer Trigger",
		Description: "定时触发事件：按 filters.interval_ms 周期推送",
		Version:     "1.0.0",
		Icon:        "Timer", // See https://lucide.dev/icons/ for icon names
		Category:    pb.NodeCategory_CATEGORY_TRIGGER,
		NodeType:    pb.NodeType_NODE_TYPE_TRIGGER,
		// 触发节点通常不定义输入输出参数
		InputParameters:  []*pb.ParameterDef{},
		OutputParameters: []*pb.ParameterDef{},
	}, nil
}

func (p *TimerTriggerPlugin) Run(req *pb.RunRequest, stream pb.NodePluginService_RunServer) error {
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
				Status: pb.ExecutionStatus_EXECUTION_STATUS_SUCCESS,
			},
		},
	})

	return nil
}

func main() {
	plugin := &TimerTriggerPlugin{}
	base.Serve(plugin)
}

// SubscribeTrigger 周期性推送触发事件
// 支持 filters:
// - interval_ms: 间隔毫秒数（默认 1000）
// - count: 推送事件次数（默认 0 表示无限）
func (p *TimerTriggerPlugin) SubscribeTrigger(req *pb.SubscribeTriggerRequest, stream pb.NodePluginService_SubscribeTriggerServer) error {
	filters := req.GetFilters()
	intervalMs := int64(10000)
	count := int64(0)

	if v, ok := filters["interval_ms"]; ok {
		var parsed int64
		fmt.Sscanf(v, "%d", &parsed)
		if parsed > 0 {
			intervalMs = parsed
		}
	}
	if v, ok := filters["count"]; ok {
		var parsed int64
		fmt.Sscanf(v, "%d", &parsed)
		if parsed > 0 {
			count = parsed
		}
	}

	ticker := time.NewTicker(time.Duration(intervalMs) * time.Millisecond)
	defer ticker.Stop()

	var emitted int64 = 0
	for {
		select {
		case t := <-ticker.C:
			emitted++
			payload := map[string]interface{}{
				"message":     fmt.Sprintf("tick #%d", emitted),
				"now_ms":      t.UnixMilli(),
				"interval_ms": intervalMs,
			}

			event := &pb.TriggerEvent{
				EventId:     fmt.Sprintf("timer-%d-%d", t.UnixNano(), emitted),
				Source:      "timer_trigger",
				Payload:     base.GoToValue(payload),
				TimestampMs: t.UnixMilli(),
			}

			if err := stream.Send(event); err != nil {
				return err
			}

			if count > 0 && emitted >= count {
				return nil
			}
		case <-stream.Context().Done():
			// 客户端主动取消时，优雅退出且不视为错误
			if err := stream.Context().Err(); errors.Is(err, context.Canceled) {
				return nil
			}
			return stream.Context().Err()
		}
	}
}
