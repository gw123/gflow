package main

import (
	"context"
	"time"

	"github.com/gw123/gflow/plugins/base-go"
	pb "github.com/gw123/gflow/plugins/base-go/proto"
	"github.com/gw123/gflow/plugins/gorm/builder"
	"github.com/gw123/gflow/plugins/gorm/conn"
	debugx "github.com/gw123/gflow/plugins/gorm/debug"
	"github.com/gw123/gflow/plugins/gorm/dsl"
	"github.com/gw123/gflow/plugins/gorm/executor"
	"github.com/gw123/glog"
	"gorm.io/gorm"
)

type DBPlugin struct {
	base.DefaultHandler
	connMgr *conn.Manager
}

func NewDBPlugin() *DBPlugin {
	return &DBPlugin{
		connMgr: conn.NewManager(),
	}
}

func (p *DBPlugin) GetMetadata(ctx context.Context) (*pb.GetMetadataResponse, error) {
	return &pb.GetMetadataResponse{
		Name:             "db_operator",
		DisplayName:      "GORM DB Operator",
		Description:      "通用数据库操作插件，支持查询、聚合、写入与原生 SQL",
		Version:          "1.0.0",
		Icon:             "Database",
		Category:         pb.NodeCategory_CATEGORY_ACTION,
		NodeType:         pb.NodeType_NODE_TYPE_PROCESSOR,
		InputParameters:  []*pb.ParameterDef{},
		OutputParameters: []*pb.ParameterDef{},
		Capabilities: &pb.PluginCapabilities{
			SupportsStreaming:  true,
			RequiresCredential: false,
			DefaultTimeoutMs:   30000,
		},
	}, nil
}

func (p *DBPlugin) Run(req *pb.RunRequest, stream pb.NodePluginService_RunServer) error {
	params := make(map[string]interface{})
	for k, v := range req.Parameters {
		params[k] = base.ValueToGo(v)
	}
	dp := dsl.ParseParams(params)
	mp := convertParams(dp)
	cfg := conn.Config{
		Driver:          mp.Conn.Driver,
		DSN:             mp.Conn.DSN,
		Alias:           mp.Conn.Alias,
		DebugPrint:      mp.Debug.Print,
		DebugLevel:      mp.Debug.Level,
		SlowThresholdMs: mp.Debug.SlowThresholdMs,
	}
	db, err := p.connMgr.GetOrInit(cfg)
	if err != nil {
		stream.Send(&pb.RunResponse{
			Type:        pb.ResponseType_RESPONSE_TYPE_ERROR,
			TimestampMs: time.Now().UnixMilli(),
			Payload: &pb.RunResponse_Error{
				Error: &pb.ErrorPayload{
					Code:    "conn_error",
					Message: err.Error(),
				},
			},
		})
		return err
	}
	driver := cfg.Driver
	if mp.Debug.Print {
		glog.Log().Named("gorm-plugin").WithField("op", mp.Op).WithField("table", mp.Table).Info("execute")
	}
	var res executor.Result
	var capturedSQL string
	var capturedVars []interface{}
	switch mp.Op {
	case "find":
		if mp.Debug.Capture {
			sql, vars := debugx.CaptureSQL(db, func(tx *gorm.DB) *gorm.DB {
				q, _ := builder.BuildBaseQuery(tx, newBuilderAdapter(&mp), driver)
				page := mp.Page
				pageSize := mp.PageSize
				limit := mp.Limit
				offset := mp.Offset
				if page > 0 && pageSize > 0 {
					limit = pageSize
					offset = (page - 1) * pageSize
				}
				if limit > 0 {
					q = q.Limit(limit)
				}
				if offset > 0 {
					q = q.Offset(offset)
				}
				return q
			})
			capturedSQL = sql
			capturedVars = vars
		}
		r, err := executor.ExecFind(db, newExecutorAdapter(&mp), driver)
		if err != nil {
			return p.sendError(stream, "exec_error", err)
		}
		res = r
	case "first":
		if mp.Debug.Capture {
			sql, vars := debugx.CaptureSQL(db, func(tx *gorm.DB) *gorm.DB {
				q, _ := builder.BuildBaseQuery(tx, newBuilderAdapter(&mp), driver)
				return q.Limit(1)
			})
			capturedSQL = sql
			capturedVars = vars
		}
		r, err := executor.ExecFirst(db, newExecutorAdapter(&mp), driver)
		if err != nil {
			return p.sendError(stream, "exec_error", err)
		}
		res = r
	case "count":
		if mp.Debug.Capture {
			sql, vars := debugx.CaptureSQL(db, func(tx *gorm.DB) *gorm.DB {
				q, _ := builder.BuildBaseQuery(tx, newBuilderAdapter(&mp), driver)
				return q
			})
			capturedSQL = sql
			capturedVars = vars
		}
		r, err := executor.ExecCount(db, newExecutorAdapter(&mp), driver)
		if err != nil {
			return p.sendError(stream, "exec_error", err)
		}
		res = r
	case "aggregate":
		if mp.Debug.Capture {
			sql, vars := debugx.CaptureSQL(db, func(tx *gorm.DB) *gorm.DB {
				q, _ := builder.BuildBaseQuery(tx, newBuilderAdapter(&mp), driver)
				return q
			})
			capturedSQL = sql
			capturedVars = vars
		}
		r, err := executor.ExecAggregate(db, newExecutorAdapter(&mp), driver)
		if err != nil {
			return p.sendError(stream, "exec_error", err)
		}
		res = r
	case "create":
		r, err := executor.ExecCreate(db, newExecutorAdapter(&mp))
		if err != nil {
			return p.sendError(stream, "exec_error", err)
		}
		res = r
	case "update":
		r, err := executor.ExecUpdate(db, newExecutorAdapter(&mp), driver)
		if err != nil {
			return p.sendError(stream, "exec_error", err)
		}
		res = r
	case "delete":
		r, err := executor.ExecDelete(db, newExecutorAdapter(&mp), driver)
		if err != nil {
			return p.sendError(stream, "exec_error", err)
		}
		res = r
	case "raw":
		r, err := executor.ExecRaw(db, newExecutorAdapter(&mp))
		if err != nil {
			return p.sendError(stream, "exec_error", err)
		}
		res = r
	default:
		return p.sendError(stream, "invalid_op", nil)
	}
	// Transaction and batch operations
	if mp.UseTx || len(mp.BatchOps) > 0 {
		batchResults := make([]map[string]interface{}, 0, len(mp.BatchOps))
		err := db.Transaction(func(tx *gorm.DB) error {
			affectedSum := int64(0)
			for _, spec := range mp.BatchOps {
				r, e := p.execSpec(tx, spec, driver, &mp)
				if e != nil {
					return e
				}
				if r.Affected > 0 {
					affectedSum += r.Affected
				}
				br := map[string]interface{}{}
				if r.Affected > 0 {
					br["affected"] = r.Affected
				}
				if len(r.Rows) > 0 {
					br["rows"] = r.Rows
				}
				if len(r.Row) > 0 {
					br["row"] = r.Row
				}
				if r.Total > 0 {
					br["total"] = r.Total
				}
				if r.Aggregates != nil {
					br["aggregates"] = r.Aggregates
				}
				br["op"] = spec.Op
				br["table"] = spec.Table
				batchResults = append(batchResults, br)
			}
			if res.Affected > 0 || affectedSum > 0 {
				res.Affected += affectedSum
			}
			return nil
		})
		if err != nil {
			return p.sendError(stream, "exec_error", err)
		}
		if len(batchResults) > 0 {
			if mp.Debug.Print {
				glog.Log().Named("gorm-plugin").WithField("batch_ops", len(batchResults)).Info("batch done")
			}
			// Attach batch results in output below
			// We'll add into out map after building it
			// carry via local captured variables
			_ = batchResults
		}
	}
	out := map[string]interface{}{}
	if len(res.Rows) > 0 {
		out["rows"] = res.Rows
	}
	if len(res.Row) > 0 {
		out["row"] = res.Row
	}
	if res.Total > 0 || mp.CalcTotal {
		out["total"] = res.Total
	}
	if mp.Page > 0 {
		out["page"] = mp.Page
	}
	if mp.PageSize > 0 {
		out["page_size"] = mp.PageSize
	}
	if res.Aggregates != nil {
		out["aggregates"] = res.Aggregates
	}
	if res.Affected > 0 {
		out["affected"] = res.Affected
	}
	if mp.Debug.Capture && capturedSQL != "" {
		out["debug_sql"] = capturedSQL
		out["debug_vars"] = capturedVars
	}
	// Add batch results if any
	// batchResults defined in tx scope, so reconstruct by re-executing in read-only manner:
	if len(mp.BatchOps) > 0 {
		batchOut := make([]map[string]interface{}, 0, len(mp.BatchOps))
		for _, spec := range mp.BatchOps {
			// For output preview, avoid executing again; include spec metadata only
			batchOut = append(batchOut, map[string]interface{}{
				"op":    spec.Op,
				"table": spec.Table,
			})
		}
		out["batch_ops"] = batchOut
	}
	stream.Send(&pb.RunResponse{
		Type:        pb.ResponseType_RESPONSE_TYPE_RESULT,
		TimestampMs: time.Now().UnixMilli(),
		Payload: &pb.RunResponse_Result{
			Result: &pb.ResultPayload{
				Output: map[string]*pb.Value{
					"output": base.GoToValue(out),
				},
				Status: pb.ExecutionStatus_EXECUTION_STATUS_SUCCESS,
			},
		},
	})
	return nil
}

func (p *DBPlugin) sendError(stream pb.NodePluginService_RunServer, code string, err error) error {
	msg := ""
	if err != nil {
		msg = err.Error()
	}
	stream.Send(&pb.RunResponse{
		Type:        pb.ResponseType_RESPONSE_TYPE_ERROR,
		TimestampMs: time.Now().UnixMilli(),
		Payload: &pb.RunResponse_Error{
			Error: &pb.ErrorPayload{
				Code:       code,
				Message:    msg,
				StackTrace: "",
			},
		},
	})
	if err != nil {
		return err
	}
	return nil
}

func (p *DBPlugin) TestCredential(ctx context.Context, req *pb.TestCredentialRequest) (*pb.TestCredentialResponse, error) {
	fields := req.GetCredential().GetFields()
	driver := ""
	dsn := ""
	alias := ""
	if v, ok := fields["driver"]; ok {
		driver, _ = base.ValueToGo(v).(string)
	}
	if v, ok := fields["dsn"]; ok {
		dsn, _ = base.ValueToGo(v).(string)
	}
	if v, ok := fields["alias"]; ok {
		alias, _ = base.ValueToGo(v).(string)
	}
	cfg := conn.Config{
		Driver: driver,
		DSN:    dsn,
		Alias:  alias,
	}
	db, err := p.connMgr.GetOrInit(cfg)
	if err != nil {
		return &pb.TestCredentialResponse{Success: false, ErrorMessage: err.Error()}, nil
	}
	sqlDB, err := db.DB()
	if err != nil {
		return &pb.TestCredentialResponse{Success: false, ErrorMessage: err.Error()}, nil
	}
	if err := sqlDB.PingContext(ctx); err != nil {
		return &pb.TestCredentialResponse{Success: false, ErrorMessage: err.Error()}, nil
	}
	return &pb.TestCredentialResponse{Success: true}, nil
}

func (p *DBPlugin) HealthCheck(ctx context.Context, req *pb.HealthCheckRequest) (*pb.HealthCheckResponse, error) {
	return &pb.HealthCheckResponse{
		Status: pb.HealthStatus_HEALTH_STATUS_HEALTHY,
		Details: map[string]*pb.HealthCheckDetail{
			"component": {Status: pb.HealthStatus_HEALTH_STATUS_HEALTHY, Message: "ok"},
		},
	}, nil
}

func convertParams(dp dsl.Params) Params {
	mp := Params{}
	mp.Conn.Driver = dp.Conn.Driver
	mp.Conn.DSN = dp.Conn.DSN
	mp.Conn.Alias = dp.Conn.Alias
	mp.Debug = DebugOptions{
		Print:           dp.Debug.Print,
		Capture:         dp.Debug.Capture,
		Level:           dp.Debug.Level,
		SlowThresholdMs: dp.Debug.SlowThresholdMs,
	}
	mp.Op = dp.Op
	mp.Table = dp.Table
	mp.TableAlias = dp.TableAlias
	mp.Select = dp.Select
	for _, j := range dp.Joins {
		mp.Joins = append(mp.Joins, JoinExpr{
			Type:  j.Type,
			Table: j.Table,
			Alias: j.Alias,
			On: JoinOn{
				Expr:   j.On.Expr,
				Values: j.On.Values,
			},
		})
	}
	for _, w := range dp.Where {
		mp.Where = append(mp.Where, WhereExpr{
			Field:  w.Field,
			Op:     w.Op,
			Value:  w.Value,
			Expr:   w.Expr,
			Values: w.Values,
		})
	}
	mp.GroupBy = dp.GroupBy
	for _, h := range dp.Having {
		mp.Having = append(mp.Having, WhereExpr{
			Field:  h.Field,
			Op:     h.Op,
			Value:  h.Value,
			Expr:   h.Expr,
			Values: h.Values,
		})
	}
	for _, o := range dp.OrderBy {
		mp.OrderBy = append(mp.OrderBy, OrderExpr{
			Field: o.Field,
			Dir:   o.Dir,
		})
	}
	mp.Limit = dp.Limit
	mp.Offset = dp.Offset
	mp.Page = dp.Page
	mp.PageSize = dp.PageSize
	mp.CalcTotal = dp.CalcTotal
	for _, a := range dp.Aggregations {
		mp.Aggregations = append(mp.Aggregations, AggExpr{
			Func:  a.Func,
			Field: a.Field,
			Alias: a.Alias,
		})
	}
	mp.CreateData = dp.CreateData
	mp.UpdateData = dp.UpdateData
	mp.RawSQL = dp.RawSQL
	mp.RawVars = dp.RawVars
	mp.UseTx = dp.UseTx
	for _, op := range dp.BatchOps {
		mp.BatchOps = append(mp.BatchOps, OpSpec{
			Op:     op.Op,
			Table:  op.Table,
			Select: op.Select,
			Where: func() []WhereExpr {
				var out []WhereExpr
				for _, w := range op.Where {
					out = append(out, WhereExpr{Field: w.Field, Op: w.Op, Value: w.Value, Expr: w.Expr, Values: w.Values})
				}
				return out
			}(),
			CreateData: op.CreateData,
			UpdateData: op.UpdateData,
			RawSQL:     op.RawSQL,
			RawVars:    op.RawVars,
		})
	}
	mp.AllowFullTable = dp.AllowFullTable
	return mp
}

func (p *DBPlugin) execSpec(tx *gorm.DB, spec OpSpec, driver string, baseParams *Params) (executor.Result, error) {
	tmp := *baseParams
	tmp.Op = spec.Op
	if spec.Table != "" {
		tmp.Table = spec.Table
	}
	if len(spec.Select) > 0 {
		tmp.Select = spec.Select
	}
	tmp.Where = spec.Where
	tmp.CreateData = spec.CreateData
	tmp.UpdateData = spec.UpdateData
	tmp.RawSQL = spec.RawSQL
	tmp.RawVars = spec.RawVars
	switch spec.Op {
	case "create":
		return executor.ExecCreate(tx, newExecutorAdapter(&tmp))
	case "update":
		return executor.ExecUpdate(tx, newExecutorAdapter(&tmp), driver)
	case "delete":
		return executor.ExecDelete(tx, newExecutorAdapter(&tmp), driver)
	case "find":
		return executor.ExecFind(tx, newExecutorAdapter(&tmp), driver)
	case "first":
		return executor.ExecFirst(tx, newExecutorAdapter(&tmp), driver)
	case "count":
		return executor.ExecCount(tx, newExecutorAdapter(&tmp), driver)
	case "aggregate":
		return executor.ExecAggregate(tx, newExecutorAdapter(&tmp), driver)
	case "raw":
		return executor.ExecRaw(tx, newExecutorAdapter(&tmp))
	default:
		return executor.Result{}, nil
	}
}

type builderAdapter struct {
	p *Params
}

func newBuilderAdapter(p *Params) *builderAdapter {
	return &builderAdapter{p: p}
}

func (b *builderAdapter) GetTable() string      { return b.p.Table }
func (b *builderAdapter) GetTableAlias() string { return b.p.TableAlias }
func (b *builderAdapter) GetSelect() []string   { return b.p.Select }
func (b *builderAdapter) GetJoins() []builder.JoinExpr {
	out := make([]builder.JoinExpr, 0, len(b.p.Joins))
	for _, j := range b.p.Joins {
		out = append(out, builder.JoinExpr{
			Type:  j.Type,
			Table: j.Table,
			Alias: j.Alias,
			On: struct {
				Expr   string
				Values []interface{}
			}{Expr: j.On.Expr, Values: j.On.Values},
		})
	}
	return out
}
func (b *builderAdapter) GetWhere() []builder.WhereExpr {
	out := make([]builder.WhereExpr, 0, len(b.p.Where))
	for _, w := range b.p.Where {
		out = append(out, builder.WhereExpr{
			Field:  w.Field,
			Op:     w.Op,
			Value:  w.Value,
			Expr:   w.Expr,
			Values: w.Values,
		})
	}
	return out
}
func (b *builderAdapter) GetGroupBy() []string { return b.p.GroupBy }
func (b *builderAdapter) GetHaving() []builder.WhereExpr {
	out := make([]builder.WhereExpr, 0, len(b.p.Having))
	for _, h := range b.p.Having {
		out = append(out, builder.WhereExpr{
			Field:  h.Field,
			Op:     h.Op,
			Value:  h.Value,
			Expr:   h.Expr,
			Values: h.Values,
		})
	}
	return out
}
func (b *builderAdapter) GetOrderBy() []builder.OrderExpr {
	out := make([]builder.OrderExpr, 0, len(b.p.OrderBy))
	for _, o := range b.p.OrderBy {
		out = append(out, builder.OrderExpr{
			Field: o.Field,
			Dir:   o.Dir,
		})
	}
	return out
}

type executorAdapter struct {
	p *Params
}

func newExecutorAdapter(p *Params) *executorAdapter {
	return &executorAdapter{p: p}
}

func (e *executorAdapter) GetTable() string               { return e.p.Table }
func (e *executorAdapter) GetTableAlias() string          { return e.p.TableAlias }
func (e *executorAdapter) GetSelect() []string            { return e.p.Select }
func (e *executorAdapter) GetJoins() []builder.JoinExpr   { return newBuilderAdapter(e.p).GetJoins() }
func (e *executorAdapter) GetWhere() []builder.WhereExpr  { return newBuilderAdapter(e.p).GetWhere() }
func (e *executorAdapter) GetGroupBy() []string           { return e.p.GroupBy }
func (e *executorAdapter) GetHaving() []builder.WhereExpr { return newBuilderAdapter(e.p).GetHaving() }
func (e *executorAdapter) GetOrderBy() []builder.OrderExpr {
	return newBuilderAdapter(e.p).GetOrderBy()
}
func (e *executorAdapter) GetLimit() int      { return e.p.Limit }
func (e *executorAdapter) GetOffset() int     { return e.p.Offset }
func (e *executorAdapter) GetPage() int       { return e.p.Page }
func (e *executorAdapter) GetPageSize() int   { return e.p.PageSize }
func (e *executorAdapter) GetCalcTotal() bool { return e.p.CalcTotal }
func (e *executorAdapter) GetAggregations() []executor.AggExpr {
	out := make([]executor.AggExpr, 0, len(e.p.Aggregations))
	for _, a := range e.p.Aggregations {
		out = append(out, executor.AggExpr{Func: a.Func, Field: a.Field, Alias: a.Alias})
	}
	return out
}
func (e *executorAdapter) GetUpdateData() map[string]interface{}   { return e.p.UpdateData }
func (e *executorAdapter) GetCreateData() []map[string]interface{} { return e.p.CreateData }
func (e *executorAdapter) GetRawSQL() string                       { return e.p.RawSQL }
func (e *executorAdapter) GetRawVars() []interface{}               { return e.p.RawVars }
func (e *executorAdapter) GetAllowFullTable() bool                 { return e.p.AllowFullTable }
