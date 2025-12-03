/**
 * Test Script to Verify Engine Fix
 * 
 * This script tests that manual triggers properly pass parameters to $P
 * so downstream conditional nodes can execute correctly.
 */

import yaml from 'js-yaml';
import { ServerWorkflowEngine } from './src/server/engine';
import { SAMPLE_YAML } from './src/constants';

async function testEngineExecution() {
    console.log('='.repeat(60));
    console.log('Testing Workflow Engine Fix');
    console.log('='.repeat(60));
    console.log('\n');

    // Parse the workflow
    const workflow = yaml.load(SAMPLE_YAML) as any;

    console.log('Workflow Definition:');
    console.log(`  Name: ${workflow.name}`);
    console.log(`  Nodes: ${workflow.nodes.length}`);
    console.log(`  Expected Flow: Start -> LogStart -> WaitProcess -> LogEnd`);
    console.log('\n');

    // Create and run engine
    const engine = new ServerWorkflowEngine(workflow);
    const result = await engine.run();

    console.log('\n');
    console.log('='.repeat(60));
    console.log('Test Results');
    console.log('='.repeat(60));

    const nodeNames = Object.keys(result.results);
    console.log(`\nNodes Executed: ${nodeNames.length} / ${workflow.nodes.length}`);
    console.log(`Expected: 4 nodes (Start, LogStart, WaitProcess, LogEnd)`);

    nodeNames.forEach(name => {
        const res = result.results[name];
        console.log(`\n  ${name}:`);
        console.log(`    Status: ${res.status}`);
        if (res.output) {
            console.log(`    Output keys: ${Object.keys(res.output).join(', ')}`);
        }
    });

    // Verify the fix
    const allNodesExecuted = nodeNames.length === 4;
    const allSucceeded = nodeNames.every(name => result.results[name].status === 'success');

    console.log('\n' + '='.repeat(60));
    if (allNodesExecuted && allSucceeded) {
        console.log('✅ TEST PASSED - All 4 nodes executed successfully!');
        console.log('   The fix works: parameters now propagate through $P');
    } else {
        console.log('❌ TEST FAILED');
        console.log(`   Nodes executed: ${nodeNames.length}/4`);
        console.log(`   All succeeded: ${allSucceeded}`);
    }
    console.log('='.repeat(60));

    return allNodesExecuted && allSucceeded;
}

// Run test
testEngineExecution()
    .then(success => process.exit(success ? 0 : 1))
    .catch(err => {
        console.error('Test Error:', err);
        process.exit(1);
    });
