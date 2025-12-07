package main

import (
	"bufio"
	"embed"
	"flag"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"text/template"
	"unicode"
)

//go:embed templates/go-plugin-tpl/*
var templatesFS embed.FS

type PluginData struct {
	PluginName  string
	DisplayName string
	Description string
	StructName  string
	ModulePath  string
}

func main() {
	outputDir := flag.String("out", "", "Output directory for the new plugin")
	name := flag.String("name", "", "Plugin name (e.g. my_plugin)")
	flag.Parse()

	reader := bufio.NewReader(os.Stdin)

	data := PluginData{}

	// Interactive prompts if flags are missing
	if *name == "" {
		fmt.Print("Enter plugin name (e.g. my_plugin): ")
		input, _ := reader.ReadString('\n')
		*name = strings.TrimSpace(input)
	}
	data.PluginName = *name

	if data.PluginName == "" {
		fmt.Println("Plugin name is required")
		os.Exit(1)
	}

	fmt.Print("Enter display name (e.g. My Plugin): ")
	input, _ := reader.ReadString('\n')
	data.DisplayName = strings.TrimSpace(input)
	if data.DisplayName == "" {
		data.DisplayName = data.PluginName
	}

	fmt.Print("Enter description: ")
	input, _ = reader.ReadString('\n')
	data.Description = strings.TrimSpace(input)

	if *outputDir == "" {
		fmt.Printf("Enter output directory (default: ./%s): ", data.PluginName)
		input, _ = reader.ReadString('\n')
		input = strings.TrimSpace(input)
		if input == "" {
			*outputDir = data.PluginName
		} else {
			*outputDir = input
		}
	}

	// Derived fields
	data.StructName = toPascalCase(data.PluginName) + "Plugin"
	data.ModulePath = "github.com/gw123/gflow/plugins/" + data.PluginName

	fmt.Printf("\nScaffolding plugin '%s' into '%s'...\n", data.PluginName, *outputDir)

	if err := os.MkdirAll(*outputDir, 0755); err != nil {
		fmt.Printf("Error creating directory: %v\n", err)
		os.Exit(1)
	}

	// Process templates
	files, err := templatesFS.ReadDir("templates/go-plugin-tpl")
	if err != nil {
		fmt.Printf("Error reading templates: %v\n", err)
		os.Exit(1)
	}

	for _, file := range files {
		if file.IsDir() {
			continue
		}

		tmplContent, err := templatesFS.ReadFile("templates/go-plugin-tpl/" + file.Name())
		if err != nil {
			fmt.Printf("Error reading template %s: %v\n", file.Name(), err)
			continue
		}

		tmpl, err := template.New(file.Name()).Parse(string(tmplContent))
		if err != nil {
			fmt.Printf("Error parsing template %s: %v\n", file.Name(), err)
			continue
		}

		targetName := file.Name()
		if strings.HasSuffix(targetName, ".tpl") {
			targetName = strings.TrimSuffix(targetName, ".tpl")
		}

		targetPath := filepath.Join(*outputDir, targetName)
		f, err := os.Create(targetPath)
		if err != nil {
			fmt.Printf("Error creating file %s: %v\n", targetPath, err)
			continue
		}
		defer f.Close()

		if err := tmpl.Execute(f, data); err != nil {
			fmt.Printf("Error executing template %s: %v\n", targetName, err)
			continue
		}

		fmt.Printf("Created %s\n", targetPath)
	}

	fmt.Println("\nDone! To run your new plugin:")
	fmt.Printf("  cd %s\n", *outputDir)
	fmt.Println("  go mod tidy")
	fmt.Println("  go run main.go")
}

func toPascalCase(s string) string {
	parts := strings.FieldsFunc(s, func(r rune) bool {
		return !unicode.IsLetter(r) && !unicode.IsNumber(r)
	})
	for i, part := range parts {
		if len(part) > 0 {
			parts[i] = strings.ToUpper(part[:1]) + part[1:]
		}
	}
	return strings.Join(parts, "")
}
