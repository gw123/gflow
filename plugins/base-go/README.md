# Base Go Plugin Library

This library provides common functionality for building Go plugins for gFlow.

## Features

- **gRPC Server Wrapper**: Simplifies starting the plugin server.
- **Auto-Registration**: Automatically registers the plugin with the gFlow server on startup.
- **Type Helpers**: Utilities for converting between Go types and Proto `Value` types.
- **Scaffolding CLI**: Quickly generate new plugin projects.

## Usage

### Creating a New Plugin

1.  Run the scaffold CLI:
    ```bash
    cd plugins/base-go
    go run cli/main.go --name my_plugin --out ../my_plugin
    ```
    Follow the prompts to configure your plugin.

2.  Navigate to the new plugin directory:
    ```bash
    cd ../my_plugin
    go mod tidy
    ```

3.  Run the plugin:
    ```bash
    go run main.go
    ```

### Manual Implementation

Import the library in your Go project:

```go
import (
    "github.com/gw123/gflow/plugins/base-go"
    pb "github.com/gw123/gflow/plugins/base-go/proto"
)
```

Implement the `PluginHandler` interface (or embed `base.DefaultHandler`) and start the server:

```go
type MyPlugin struct {
    base.DefaultHandler
}

// Implement GetMetadata, Run, etc.

func main() {
    plugin := &MyPlugin{}
    base.Serve(plugin)
}
```
