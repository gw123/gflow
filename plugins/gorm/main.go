package main

import (
	"os"

	"github.com/gw123/gflow/plugins/base-go"
	"github.com/gw123/glog"
	"github.com/gw123/glog/common"
)

func init() {
	glog.SetDefaultLoggerConfig(
		common.Options{},
		common.WithLevel(common.InfoLevel),
		common.WithOutputPath("./logs/gorm-plugin.log"),
		common.WithStdoutOutputPath(),
	)
}

func main() {
	plugin := NewDBPlugin()
	os.Args = append(os.Args, "--port", "50054")
	base.Serve(plugin)
}
