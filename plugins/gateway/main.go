package main

import (
	"os"

	"github.com/gw123/gflow/plugins/base-go"
	"github.com/gw123/glog"
	"github.com/gw123/glog/common"
)

// init initializes glog configuration
func init() {
	glog.SetDefaultLoggerConfig(
		common.Options{},
		common.WithLevel(common.InfoLevel),
		//common.WithJsonEncoding(),
		common.WithOutputPath("./logs/gateway.log"),
		common.WithStdoutOutputPath(),
	)
}

func main() {
	// Create plugin instance
	plugin := NewGatewayPlugin()

	// Start plugin service on port 50053
	os.Args = append(os.Args, "--port", "50053")
	base.Serve(plugin)
}
