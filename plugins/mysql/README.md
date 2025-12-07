# MySQL Plugin for gFlow (Go)

This plugin allows gFlow to execute MySQL queries (CRUD operations) using a Go-based gRPC server.

## Installation

1. Install Go dependencies:
   ```bash
   go mod tidy
   ```

2. Generate gRPC code (optional, if you modify proto):
   ```bash
   ./generate_pb.sh
   ```

## Usage

Run the plugin server:

```bash
go run main.go --port 50054 --server http://localhost:3001
```

The plugin will automatically register itself with the gFlow server on startup.

## Configuration

If auto-registration is not used, you can add the following to your `config/plugins.yaml`:

```yaml
plugins:
  - name: "MySQL Plugin"
    kind: "mysql_plugin_go"
    endpoint: "localhost:50054"
    enabled: true
    category: "data"
    icon: "Database"
```

## Inputs

- **Host**: Database host (default: localhost)
- **Port**: Database port (default: 3306)
- **User**: Database user
- **Password**: Database password
- **Database**: Database name
- **Action**: Action to perform (query, insert, update, delete, exec, transaction)
- **SQL Query**: The SQL query to execute. Use `?` for placeholders.
- **Parameters**: Optional JSON array for parameterized queries.
- **Transaction Statements**: JSON list of SQL statements for transaction execution.

## Outputs

- **Rows**: List of rows (objects) for SELECT queries.
- **Affected Rows**: Number of rows affected by INSERT/UPDATE/DELETE.
- **Last Insert ID**: The ID of the last inserted row.
