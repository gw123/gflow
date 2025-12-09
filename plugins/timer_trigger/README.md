# Timer Trigger

定时触发事件，每 interval_ms 发送一次

## Usage

Run the plugin:

```bash
go run main.go --port 50052 --server http://localhost:3001
```

## Configuration

Add to `config/plugins.yaml` if not using auto-registration:

```yaml
plugins:
  - name: "Timer Trigger"
    kind: "timer_trigger"
    endpoint: "localhost:5005"
    enabled: true
```
