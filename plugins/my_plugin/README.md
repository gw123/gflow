# MyPlugin

for test

## Usage

Run the plugin:

```bash
go run main.go --port 50051 --server http://localhost:3001
```

## Configuration

Add to `config/plugins.yaml` if not using auto-registration:

```yaml
plugins:
  - name: "MyPlugin"
    kind: "my_plugin"
    endpoint: "localhost:50051"
    enabled: true
```
