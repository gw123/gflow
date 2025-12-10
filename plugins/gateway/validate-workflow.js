#!/usr/bin/env node

/**
 * Gateway Workflow Validation Script
 * 
 * Validates that the gateway workflow properly handles global variables in JavaScript nodes.
 * This script checks that:
 * 1. JavaScript nodes use `{{ $global. }}` syntax in their input parameters
 * 2. The workflow structure is correct for gateway trigger functionality
 * 3. Global variables are properly passed between nodes
 */

import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

const WORKFLOW_FILE = path.join(process.cwd(), 'gateway-example.yaml');

function validateWorkflow() {
    console.log('🔍 Gateway Workflow Validation');
    console.log('='.repeat(50));
    
    try {
        // Read and parse the workflow YAML
        const yamlContent = fs.readFileSync(WORKFLOW_FILE, 'utf8');
        const workflow = yaml.load(yamlContent);
        
        if (!workflow) {
            console.error('❌ Failed to parse workflow file');
            return false;
        }
        
        console.log(`📄 Workflow: ${workflow.name}`);
        
        // Validate basic structure
        if (!workflow.nodes || !Array.isArray(workflow.nodes)) {
            console.error('❌ Workflow must have a "nodes" array');
            return false;
        }
        
        if (!workflow.connections || typeof workflow.connections !== 'object') {
            console.error('❌ Workflow must have a "connections" object');
            return false;
        }
        
        console.log(`✅ Basic structure validated`);
        console.log(`📋 Node count: ${workflow.nodes.length}`);
        
        // Validate trigger node
        const triggerNode = workflow.nodes.find(node => node.type === 'trigger' && node.plugin === 'http_gateway');
        if (!triggerNode) {
            console.error('❌ Missing HTTP gateway trigger node');
            return false;
        }
        
        console.log(`✅ HTTP gateway trigger node found`);
        
        // Check JavaScript nodes for proper parameter passing
        const jsNodes = workflow.nodes.filter(node => node.type === 'javascript');
        console.log(`📋 JavaScript nodes found: ${jsNodes.length}`);
        
        let allJsNodesValid = true;
        
        for (const jsNode of jsNodes) {
            console.log(`\n🔧 Checking JavaScript node: ${jsNode.name}`);
            
            // Check if the node has parameters with global variable references
            if (jsNode.parameters && jsNode.parameters.input) {
                const inputParams = jsNode.parameters.input;
                let hasGlobalReference = false;
                
                for (const [paramName, paramValue] of Object.entries(inputParams)) {
                    if (typeof paramValue === 'string' && paramValue.includes('{{ $global.')) {
                        hasGlobalReference = true;
                        console.log(`   ✅ Parameter "${paramName}" uses global variable: ${paramValue}`);
                    }
                }
                
                if (!hasGlobalReference) {
                    console.error(`   ❌ Node "${jsNode.name}" does not use global variables in its input parameters`);
                    console.error(`   💡 Fix: Use {{ $global.variableName }} syntax in input parameters`);
                    allJsNodesValid = false;
                }
            } else {
                console.error(`   ❌ Node "${jsNode.name}" missing input parameters`);
                allJsNodesValid = false;
            }
            
            // Check if the code uses input variable properly
            if (jsNode.parameters && jsNode.parameters.code) {
                const code = jsNode.parameters.code;
                if (code.includes('$global.')) {
                    console.error(`   ❌ Node "${jsNode.name}" directly accesses $global in code: ${code.split('$global.')[0].slice(-20)}...`);
                    console.error(`   💡 Fix: Use input.${code.split('$global.')[1].split(' ')[0]} instead`);
                    allJsNodesValid = false;
                }
                
                if (!code.includes('const {') && !code.includes('input.')) {
                    console.warn(`   ⚠️  Node "${jsNode.name}" may not be using input parameters correctly`);
                } else {
                    console.log(`   ✅ Code uses input parameters properly`);
                }
            }
        }
        
        // Validate connections
        console.log(`\n🔗 Validating connections...`);
        let hasValidConnections = true;
        
        for (const [fromNode, toNodes] of Object.entries(workflow.connections)) {
            if (Array.isArray(toNodes)) {
                for (const connectionGroup of toNodes) {
                    if (Array.isArray(connectionGroup)) {
                        for (const connection of connectionGroup) {
                            if (!connection.node) {
                                console.error(`   ❌ Connection missing "node" property`);
                                hasValidConnections = false;
                            }
                        }
                    }
                }
            }
        }
        
        if (hasValidConnections) {
            console.log(`   ✅ Connections validated`);
        }
        
        // Summary
        console.log('\n' + '='.repeat(50));
        console.log('📊 Validation Summary');
        console.log('='.repeat(50));
        
        const allValid = allJsNodesValid && hasValidConnections;
        
        if (allValid) {
            console.log('✅ All validations passed!');
            console.log('💡 The workflow is properly structured for gateway trigger functionality.');
            console.log('💡 JavaScript nodes correctly access global variables via input parameters.');
            
            // Show usage instructions
            console.log('\n📖 Usage Instructions:');
            console.log('1. Deploy the workflow:');
            console.log('   node deploy-workflow.js');
            console.log('2. Start the gateway plugin:');
            console.log('   go run main.go');
            console.log('3. Test the gateway:');
            console.log('   curl -X POST http://localhost:8080/webhook \\\n        -H "X-API-Key: test-api-key-123" \\\n        -H "Content-Type: application/json" \\\n        -d \'{"productId": "PROD-123", "quantity": 2}\'';
            return true;
        } else {
            console.error('❌ Some validations failed!');
            console.log('📋 Check the errors above and fix the workflow.');
            return false;
        }
        
    } catch (error) {
        console.error('❌ Unexpected error during validation:', error.message);
        return false;
    }
}

// Run the validation
validateWorkflow();
