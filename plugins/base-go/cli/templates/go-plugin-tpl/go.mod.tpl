module {{.ModulePath}}

go 1.24.4

require (
	github.com/gw123/gflow/plugins/base-go v0.0.0
)

// Replace with local path if developing in the same monorepo, otherwise remove this
replace github.com/gw123/gflow/plugins/base-go => ../base-go
