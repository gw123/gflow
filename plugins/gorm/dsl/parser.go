package dsl

import (
	"fmt"
)

type AnyMap = map[string]interface{}

type Params struct {
	Conn            ConnConfig
	Op              string
	Table           string
	TableAlias      string
	Select          []string
	Joins           []JoinExpr
	Where           []WhereExpr
	GroupBy         []string
	Having          []WhereExpr
	OrderBy         []OrderExpr
	Limit           int
	Offset          int
	Page            int
	PageSize        int
	CalcTotal       bool
	Aggregations    []AggExpr
	CreateData      []map[string]interface{}
	UpdateData      map[string]interface{}
	RawSQL          string
	RawVars         []interface{}
	UseTx           bool
	BatchOps        []OpSpec
	Debug           DebugOptions
	AllowFullTable  bool
}

type ConnConfig struct {
	Driver string
	DSN    string
	Alias  string
	Debug  DebugOptions
}

type DebugOptions struct {
	Print           bool
	Capture         bool
	Level           string
	SlowThresholdMs int64
}

type WhereExpr struct {
	Field  string
	Op     string
	Value  interface{}
	Expr   string
	Values []interface{}
}

type OrderExpr struct {
	Field string
	Dir   string
}

type AggExpr struct {
	Func  string
	Field string
	Alias string
}

type JoinOn struct {
	Expr   string
	Values []interface{}
}

type JoinExpr struct {
	Type  string
	Table string
	Alias string
	On    JoinOn
}

type OpSpec struct {
	Op         string
	Table      string
	Select     []string
	Where      []WhereExpr
	CreateData []map[string]interface{}
	UpdateData map[string]interface{}
	RawSQL     string
	RawVars    []interface{}
}

func toString(v interface{}) string {
	if v == nil {
		return ""
	}
	switch s := v.(type) {
	case string:
		return s
	default:
		return fmt.Sprintf("%v", v)
	}
}

func toStringSlice(v interface{}) []string {
	if v == nil {
		return nil
	}
	switch a := v.(type) {
	case []string:
		return a
	case []interface{}:
		out := make([]string, 0, len(a))
		for _, x := range a {
			out = append(out, toString(x))
		}
		return out
	case string:
		return []string{a}
	default:
		return nil
	}
}

func toInt(v interface{}) int {
	switch n := v.(type) {
	case int:
		return n
	case int64:
		return int(n)
	case float64:
		return int(n)
	default:
		return 0
	}
}

func toInt64(v interface{}) int64 {
	switch n := v.(type) {
	case int:
		return int64(n)
	case int64:
		return n
	case float64:
		return int64(n)
	default:
		return 0
	}
}

func toBool(v interface{}) bool {
	switch b := v.(type) {
	case bool:
		return b
	case string:
		return b == "true" || b == "1"
	case int:
		return b != 0
	case float64:
		return b != 0
	default:
		return false
	}
}

func toAnySlice(v interface{}) []interface{} {
	if v == nil {
		return nil
	}
	switch a := v.(type) {
	case []interface{}:
		return a
	default:
		return nil
	}
}

func toMapSlice(v interface{}) []map[string]interface{} {
	if v == nil {
		return nil
	}
	switch a := v.(type) {
	case []map[string]interface{}:
		return a
	case []interface{}:
		out := make([]map[string]interface{}, 0, len(a))
		for _, x := range a {
			if m, ok := x.(map[string]interface{}); ok {
				out = append(out, m)
			}
		}
		return out
	default:
		return nil
	}
}

func parseWhereList(v interface{}) []WhereExpr {
	if v == nil {
		return nil
	}
	out := []WhereExpr{}
	switch a := v.(type) {
	case []interface{}:
		for _, x := range a {
			if m, ok := x.(map[string]interface{}); ok {
				out = append(out, WhereExpr{
					Field:  toString(m["field"]),
					Op:     toString(m["op"]),
					Value:  m["value"],
					Expr:   toString(m["expr"]),
					Values: toAnySlice(m["values"]),
				})
			}
		}
	}
	return out
}

func parseOrderList(v interface{}) []OrderExpr {
	if v == nil {
		return nil
	}
	out := []OrderExpr{}
	switch a := v.(type) {
	case []interface{}:
		for _, x := range a {
			if m, ok := x.(map[string]interface{}); ok {
				out = append(out, OrderExpr{
					Field: toString(m["field"]),
					Dir:   toString(m["dir"]),
				})
			}
		}
	}
	return out
}

func parseAggList(v interface{}) []AggExpr {
	if v == nil {
		return nil
	}
	out := []AggExpr{}
	switch a := v.(type) {
	case []interface{}:
		for _, x := range a {
			if m, ok := x.(map[string]interface{}); ok {
				out = append(out, AggExpr{
					Func:  toString(m["func"]),
					Field: toString(m["field"]),
					Alias: toString(m["alias"]),
				})
			}
		}
	}
	return out
}

func parseJoinList(v interface{}) []JoinExpr {
	if v == nil {
		return nil
	}
	out := []JoinExpr{}
	switch a := v.(type) {
	case []interface{}:
		for _, x := range a {
			if m, ok := x.(map[string]interface{}); ok {
				je := JoinExpr{
					Type:  toString(m["type"]),
					Table: toString(m["table"]),
					Alias: toString(m["alias"]),
				}
				if om, ok := m["on"].(map[string]interface{}); ok {
					je.On.Expr = toString(om["expr"])
					je.On.Values = toAnySlice(om["values"])
				}
				out = append(out, je)
			}
		}
	}
	return out
}

func ParseParams(m AnyMap) Params {
	p := Params{}
	p.Conn.Driver = toString(m["driver"])
	p.Conn.DSN = toString(m["dsn"])
	p.Conn.Alias = toString(m["alias"])
	if dm, ok := m["debug"].(map[string]interface{}); ok {
		p.Conn.Debug.Print = toBool(dm["print"])
		p.Conn.Debug.Capture = toBool(dm["capture"])
		p.Conn.Debug.Level = toString(dm["level"])
		p.Conn.Debug.SlowThresholdMs = toInt64(dm["slow_threshold_ms"])
	}
	p.Op = toString(m["op"])
	p.Table = toString(m["table"])
	p.TableAlias = toString(m["table_alias"])
	p.Select = toStringSlice(m["select"])
	p.Joins = parseJoinList(m["joins"])
	p.Where = parseWhereList(m["where"])
	p.GroupBy = toStringSlice(m["group_by"])
	p.Having = parseWhereList(m["having"])
	p.OrderBy = parseOrderList(m["order_by"])
	p.Limit = toInt(m["limit"])
	p.Offset = toInt(m["offset"])
	p.Page = toInt(m["page"])
	p.PageSize = toInt(m["page_size"])
	p.CalcTotal = toBool(m["calc_total"])
	p.Aggregations = parseAggList(m["aggregations"])
	p.CreateData = toMapSlice(m["create_data"])
	if m["update_data"] != nil {
		if um, ok := m["update_data"].(map[string]interface{}); ok {
			p.UpdateData = um
		}
	}
	p.RawSQL = toString(m["raw_sql"])
	p.RawVars = toAnySlice(m["raw_bindings"])
	p.UseTx = toBool(m["use_tx"])
	if bm, ok := m["batch_ops"].([]interface{}); ok {
		for _, x := range bm {
			if om, ok := x.(map[string]interface{}); ok {
				p.BatchOps = append(p.BatchOps, OpSpec{
					Op:         toString(om["op"]),
					Table:      toString(om["table"]),
					Select:     toStringSlice(om["select"]),
					Where:      parseWhereList(om["where"]),
					CreateData: toMapSlice(om["create_data"]),
					UpdateData: func() map[string]interface{} {
						mv := om["update_data"]
						if mv == nil {
							return nil
						}
						if mmm, ok := mv.(map[string]interface{}); ok {
							return mmm
						}
						return nil
					}(),
					RawSQL: toString(om["raw_sql"]),
					RawVars: func() []interface{} {
						return toAnySlice(om["raw_bindings"])
					}(),
				})
			}
		}
	}
	if dm, ok := m["debug"].(map[string]interface{}); ok {
		p.Debug.Print = toBool(dm["print"])
		p.Debug.Capture = toBool(dm["capture"])
		p.Debug.Level = toString(dm["level"])
		p.Debug.SlowThresholdMs = toInt64(dm["slow_threshold_ms"])
	}
	p.AllowFullTable = toBool(m["allow_full_table_write"])
	return p
}
