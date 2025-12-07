package base

import (
	"fmt"

	pb "github.com/gw123/gflow/plugins/base-go/proto"
)

// ValueToGo converts Proto Value to Go interface{}
func ValueToGo(v *pb.Value) interface{} {
	if v == nil {
		return nil
	}
	switch k := v.Kind.(type) {
	case *pb.Value_NullValue:
		return nil
	case *pb.Value_StringValue:
		return k.StringValue
	case *pb.Value_IntValue:
		return int(k.IntValue) // Convert int64 to int for convenience
	case *pb.Value_DoubleValue:
		return k.DoubleValue
	case *pb.Value_BoolValue:
		return k.BoolValue
	case *pb.Value_BytesValue:
		return k.BytesValue
	case *pb.Value_ListValue:
		var list []interface{}
		for _, item := range k.ListValue.Values {
			list = append(list, ValueToGo(item))
		}
		return list
	case *pb.Value_MapValue:
		m := make(map[string]interface{})
		for key, val := range k.MapValue.Fields {
			m[key] = ValueToGo(val)
		}
		return m
	default:
		return nil
	}
}

// GoToValue converts Go interface{} to Proto Value
func GoToValue(v interface{}) *pb.Value {
	if v == nil {
		return &pb.Value{Kind: &pb.Value_NullValue{NullValue: pb.NullValue_NULL_VALUE}}
	}
	switch val := v.(type) {
	case string:
		return &pb.Value{Kind: &pb.Value_StringValue{StringValue: val}}
	case int:
		return &pb.Value{Kind: &pb.Value_IntValue{IntValue: int64(val)}}
	case int64:
		return &pb.Value{Kind: &pb.Value_IntValue{IntValue: val}}
	case int32:
		return &pb.Value{Kind: &pb.Value_IntValue{IntValue: int64(val)}}
	case float64:
		return &pb.Value{Kind: &pb.Value_DoubleValue{DoubleValue: val}}
	case float32:
		return &pb.Value{Kind: &pb.Value_DoubleValue{DoubleValue: float64(val)}}
	case bool:
		return &pb.Value{Kind: &pb.Value_BoolValue{BoolValue: val}}
	case []byte:
		return &pb.Value{Kind: &pb.Value_BytesValue{BytesValue: val}}
	case []interface{}:
		list := &pb.ListValue{}
		for _, item := range val {
			list.Values = append(list.Values, GoToValue(item))
		}
		return &pb.Value{Kind: &pb.Value_ListValue{ListValue: list}}
	case map[string]interface{}:
		m := &pb.MapValue{Fields: make(map[string]*pb.Value)}
		for key, item := range val {
			m.Fields[key] = GoToValue(item)
		}
		return &pb.Value{Kind: &pb.Value_MapValue{MapValue: m}}
	default:
		// Fallback to string
		return &pb.Value{Kind: &pb.Value_StringValue{StringValue: fmt.Sprintf("%v", val)}}
	}
}
