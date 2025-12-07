package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"strconv"
	"strings"
	"time"

	_ "github.com/go-sql-driver/mysql"
	"github.com/gw123/gflow/plugins/base-go"
	pb "github.com/gw123/gflow/plugins/base-go/proto"
)

const (
	MysqlActionInsert = "insert"
	MysqlActionQuery  = "query"
	MysqlActionUpdate = "update"
	MysqlActionDelete = "delete"
	MysqlActionExec   = "exec"
	MysqlActionTx     = "transaction"
)

type MySQLPlugin struct {
	base.DefaultHandler
}

func (p *MySQLPlugin) GetMetadata(ctx context.Context) (*pb.GetMetadataResponse, error) {
	return &pb.GetMetadataResponse{
		Name:        "mysql_plugin_go",
		DisplayName: "MySQL Client (Go)",
		Description: "Execute MySQL queries (CRUD) using Go",
		Version:     "1.0.0",
		Icon:        "Database",
		Category:    pb.NodeCategory_CATEGORY_INTEGRATION,
		NodeType:    pb.NodeType_NODE_TYPE_PROCESSOR,
		InputParameters: []*pb.ParameterDef{
			{
				Name:         "host",
				DisplayName:  "Host",
				Type:         pb.ParameterType_PARAM_TYPE_STRING,
				DefaultValue: base.GoToValue("localhost"),
				Required:     true,
			},
			{
				Name:         "port",
				DisplayName:  "Port",
				Type:         pb.ParameterType_PARAM_TYPE_INT,
				DefaultValue: base.GoToValue(3306),
				Required:     true,
			},
			{
				Name:        "user",
				DisplayName: "User",
				Type:        pb.ParameterType_PARAM_TYPE_STRING,
				Required:    true,
			},
			{
				Name:        "password",
				DisplayName: "Password",
				Type:        pb.ParameterType_PARAM_TYPE_SECRET,
				UiType:      pb.ParameterUIType_UI_TYPE_TEXT,
				Required:    true,
			},
			{
				Name:        "database",
				DisplayName: "Database",
				Type:        pb.ParameterType_PARAM_TYPE_STRING,
				Required:    true,
			},
			{
				Name:         "action",
				DisplayName:  "Action",
				Type:         pb.ParameterType_PARAM_TYPE_STRING,
				DefaultValue: base.GoToValue(MysqlActionQuery),
				UiType:       pb.ParameterUIType_UI_TYPE_SELECT,
				Options: []*pb.ParameterOption{
					{Value: MysqlActionQuery, Label: "Query (Select)"},
					{Value: MysqlActionInsert, Label: "Insert"},
					{Value: MysqlActionUpdate, Label: "Update"},
					{Value: MysqlActionDelete, Label: "Delete"},
					{Value: MysqlActionExec, Label: "Execute (Raw)"},
					{Value: MysqlActionTx, Label: "Transaction"},
				},
				Required: true,
			},
			{
				Name:        "sql",
				DisplayName: "SQL Query",
				Type:        pb.ParameterType_PARAM_TYPE_STRING,
				UiType:      pb.ParameterUIType_UI_TYPE_TEXTAREA,
				Description: "SQL query to execute. Use ? for parameters.",
				ShowWhen:    "action != 'transaction'",
			},
			{
				Name:        "params",
				DisplayName: "Parameters (JSON/Array)",
				Type:        pb.ParameterType_PARAM_TYPE_JSON,
				Description: "Parameters for the SQL query",
				ShowWhen:    "action != 'transaction'",
			},
			{
				Name:        "statements",
				DisplayName: "Transaction Statements (JSON)",
				Type:        pb.ParameterType_PARAM_TYPE_JSON,
				UiType:      pb.ParameterUIType_UI_TYPE_JSON_EDITOR,
				Description: "List of SQL statements for transaction. Example: [\"INSERT INTO ...\", \"UPDATE ...\"]",
				ShowWhen:    "action == 'transaction'",
			},
		},
		OutputParameters: []*pb.ParameterDef{
			{
				Name:        "rows",
				DisplayName: "Rows",
				Type:        pb.ParameterType_PARAM_TYPE_ARRAY,
			},
			{
				Name:        "affected_rows",
				DisplayName: "Affected Rows",
				Type:        pb.ParameterType_PARAM_TYPE_INT,
			},
			{
				Name:        "last_insert_id",
				DisplayName: "Last Insert ID",
				Type:        pb.ParameterType_PARAM_TYPE_INT,
			},
		},
		Capabilities: &pb.PluginCapabilities{
			RequiresCredential: true,
		},
	}, nil
}

func (p *MySQLPlugin) Run(req *pb.RunRequest, stream pb.NodePluginService_RunServer) error {
	params := make(map[string]interface{})
	for k, v := range req.Parameters {
		params[k] = base.ValueToGo(v)
	}

	host := getString(params, "host", "localhost")
	port := getInt(params, "port", 3306)
	user := getString(params, "user", "")
	password := getString(params, "password", "")
	database := getString(params, "database", "")
	action := getString(params, "action", MysqlActionQuery)

	dsn := fmt.Sprintf("%s:%s@tcp(%s:%d)/%s?parseTime=true", user, password, host, port, database)

	// Send log
	stream.Send(&pb.RunResponse{
		Type:        pb.ResponseType_RESPONSE_TYPE_LOG,
		TimestampMs: time.Now().UnixMilli(),
		Payload: &pb.RunResponse_Log{
			Log: &pb.LogPayload{
				Level:   pb.LogLevel_LOG_LEVEL_INFO,
				Message: fmt.Sprintf("Connecting to %s:%d/%s", host, port, database),
			},
		},
	})

	db, err := sql.Open("mysql", dsn)
	if err != nil {
		return sendError(stream, err)
	}
	defer db.Close()

	if err := db.Ping(); err != nil {
		return sendError(stream, fmt.Errorf("failed to connect: %v", err))
	}

	var result map[string]interface{}

	if action == MysqlActionTx {
		result, err = runTransaction(db, params, stream)
	} else {
		sqlStr := getString(params, "sql", "")
		sqlParams := getParams(params, "params")

		stream.Send(&pb.RunResponse{
			Type:        pb.ResponseType_RESPONSE_TYPE_LOG,
			TimestampMs: time.Now().UnixMilli(),
			Payload: &pb.RunResponse_Log{
				Log: &pb.LogPayload{
					Level:   pb.LogLevel_LOG_LEVEL_INFO,
					Message: fmt.Sprintf("Executing %s: %s", action, sqlStr),
				},
			},
		})

		switch action {
		case MysqlActionQuery:
			result, err = runQuery(db, sqlStr, sqlParams)
		case MysqlActionInsert:
			result, err = runExec(db, sqlStr, sqlParams, true)
		case MysqlActionUpdate, MysqlActionDelete, MysqlActionExec:
			result, err = runExec(db, sqlStr, sqlParams, false)
		default:
			err = fmt.Errorf("unknown action: %s", action)
		}
	}

	if err != nil {
		return sendError(stream, err)
	}

	// Send result
	stream.Send(&pb.RunResponse{
		Type:        pb.ResponseType_RESPONSE_TYPE_RESULT,
		TimestampMs: time.Now().UnixMilli(),
		Payload: &pb.RunResponse_Result{
			Result: &pb.ResultPayload{
				Output: map[string]*pb.Value{
					"rows":           base.GoToValue(result["rows"]),
					"affected_rows":  base.GoToValue(result["affected_rows"]),
					"last_insert_id": base.GoToValue(result["last_insert_id"]),
					"results":        base.GoToValue(result["results"]), // For transaction
				},
				Status:     pb.ExecutionStatus_EXECUTION_STATUS_SUCCESS,
				DurationMs: 0, // TODO: measure duration
			},
		},
	})

	return nil
}

func runQuery(db *sql.DB, query string, args []interface{}) (map[string]interface{}, error) {
	rows, err := db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	cols, err := rows.Columns()
	if err != nil {
		return nil, err
	}

	var result []map[string]interface{}
	for rows.Next() {
		// Create a slice of interface{}'s to represent each column,
		// and a second slice to contain pointers to each item in the columns slice.
		columns := make([]interface{}, len(cols))
		columnPointers := make([]interface{}, len(cols))
		for i := range columns {
			columnPointers[i] = &columns[i]
		}

		// Scan the result into the column pointers...
		if err := rows.Scan(columnPointers...); err != nil {
			return nil, err
		}

		// Create our map, and retrieve the value for each column from the pointers slice,
		// storing it in the map with the name of the column as the key.
		m := make(map[string]interface{})
		for i, colName := range cols {
			val := columnPointers[i].(*interface{})
			m[colName] = *val

			// Handle []byte to string for convenience if needed,
			// but goToValue handles []byte.
			// However, mysql driver returns []byte for strings sometimes.
			if b, ok := (*val).([]byte); ok {
				m[colName] = string(b)
			}
		}
		result = append(result, m)
	}

	return map[string]interface{}{
		"rows":  result,
		"count": len(result),
	}, nil
}

func runExec(db *sql.DB, query string, args []interface{}, returnId bool) (map[string]interface{}, error) {
	res, err := db.Exec(query, args...)
	if err != nil {
		return nil, err
	}

	affected, _ := res.RowsAffected()
	lastId, _ := res.LastInsertId()

	return map[string]interface{}{
		"affected_rows":  affected,
		"last_insert_id": lastId,
	}, nil
}

func runTransaction(db *sql.DB, params map[string]interface{}, stream pb.NodePluginService_RunServer) (map[string]interface{}, error) {
	// Parse statements
	// Expecting statements to be a list of strings or objects with sql/params
	// The user reference code uses ".statements" and ".params.i"
	// Here we will try to parse "statements" as a JSON list of strings or objects

	stmtsRaw := params["statements"]
	var stmts []string

	// Try to convert stmtsRaw to []string
	if s, ok := stmtsRaw.(string); ok {
		// Try to parse JSON
		var list []interface{}
		if err := json.Unmarshal([]byte(s), &list); err == nil {
			for _, item := range list {
				if str, ok := item.(string); ok {
					stmts = append(stmts, str)
				}
			}
		} else {
			// Maybe it's just a single statement?
			stmts = append(stmts, s)
		}
	} else if list, ok := stmtsRaw.([]interface{}); ok {
		for _, item := range list {
			if str, ok := item.(string); ok {
				stmts = append(stmts, str)
			}
		}
	}

	if len(stmts) == 0 {
		return nil, fmt.Errorf("no statements provided for transaction")
	}

	tx, err := db.Begin()
	if err != nil {
		return nil, err
	}

	var results []map[string]interface{}

	for i, sqlStmt := range stmts {
		// TODO: Support per-statement parameters in transaction
		// For now, assuming no params or simple execution

		stream.Send(&pb.RunResponse{
			Type:        pb.ResponseType_RESPONSE_TYPE_LOG,
			TimestampMs: time.Now().UnixMilli(),
			Payload: &pb.RunResponse_Log{
				Log: &pb.LogPayload{
					Level:   pb.LogLevel_LOG_LEVEL_INFO,
					Message: fmt.Sprintf("Tx Executing %d: %s", i, sqlStmt),
				},
			},
		})

		// Check if it's a query (naive check)
		if strings.HasPrefix(strings.ToLower(strings.TrimSpace(sqlStmt)), "select") {
			// Query in Tx
			rows, err := tx.Query(sqlStmt)
			if err != nil {
				tx.Rollback()
				return nil, err
			}
			// ... scan rows ... (simplified for brevity, reuse logic if possible)
			rows.Close() // Close immediately
			results = append(results, map[string]interface{}{"status": "executed query"})
		} else {
			res, err := tx.Exec(sqlStmt)
			if err != nil {
				tx.Rollback()
				return nil, err
			}
			aff, _ := res.RowsAffected()
			results = append(results, map[string]interface{}{"affected_rows": aff})
		}
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	return map[string]interface{}{
		"results": results,
		"success": true,
	}, nil
}

func (p *MySQLPlugin) TestCredential(ctx context.Context, req *pb.TestCredentialRequest) (*pb.TestCredentialResponse, error) {
	params := make(map[string]interface{})
	if req.Credential != nil {
		for k, v := range req.Credential.Fields {
			params[k] = base.ValueToGo(v)
		}
	}

	host := getString(params, "host", "localhost")
	port := getInt(params, "port", 3306)
	user := getString(params, "user", "")
	password := getString(params, "password", "")
	database := getString(params, "database", "")

	dsn := fmt.Sprintf("%s:%s@tcp(%s:%d)/%s?timeout=5s", user, password, host, port, database)
	db, err := sql.Open("mysql", dsn)
	if err != nil {
		return &pb.TestCredentialResponse{Success: false, ErrorMessage: err.Error()}, nil
	}
	defer db.Close()

	if err := db.Ping(); err != nil {
		return &pb.TestCredentialResponse{Success: false, ErrorMessage: err.Error()}, nil
	}

	return &pb.TestCredentialResponse{Success: true, Info: map[string]string{"message": "Connection successful"}}, nil
}

// Helpers

func getString(m map[string]interface{}, key string, def string) string {
	if v, ok := m[key]; ok {
		if s, ok := v.(string); ok {
			return s
		}
	}
	return def
}

func getInt(m map[string]interface{}, key string, def int) int {
	if v, ok := m[key]; ok {
		if i, ok := v.(int); ok {
			return i
		}
		if f, ok := v.(float64); ok {
			return int(f)
		}
		if s, ok := v.(string); ok {
			if val, err := strconv.Atoi(s); err == nil {
				return val
			}
		}
	}
	return def
}

func getParams(m map[string]interface{}, key string) []interface{} {
	v, ok := m[key]
	if !ok || v == nil {
		return nil
	}

	if list, ok := v.([]interface{}); ok {
		return list
	}

	if s, ok := v.(string); ok {
		var list []interface{}
		if err := json.Unmarshal([]byte(s), &list); err == nil {
			return list
		}
	}

	return nil
}

func sendError(stream pb.NodePluginService_RunServer, err error) error {
	stream.Send(&pb.RunResponse{
		Type:        pb.ResponseType_RESPONSE_TYPE_LOG,
		TimestampMs: time.Now().UnixMilli(),
		Payload: &pb.RunResponse_Log{
			Log: &pb.LogPayload{
				Level:   pb.LogLevel_LOG_LEVEL_ERROR,
				Message: err.Error(),
			},
		},
	})
	stream.Send(&pb.RunResponse{
		Type:        pb.ResponseType_RESPONSE_TYPE_ERROR,
		TimestampMs: time.Now().UnixMilli(),
		Payload: &pb.RunResponse_Error{
			Error: &pb.ErrorPayload{
				Message: err.Error(),
				Code:    "EXECUTION_FAILED",
			},
		},
	})
	return nil
}

func main() {
	plugin := &MySQLPlugin{}
	base.Serve(plugin)
}
