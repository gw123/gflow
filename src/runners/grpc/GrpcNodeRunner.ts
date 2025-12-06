import { NodeRunner, NodeDefinition, NodeRunnerContext, NodeExecutionResult } from '../../types';
import { interpolate } from '../utils';

// --- Protobuf Type Definitions (Simulation) ---


// Corresponds to 'message Value' in proto
interface ProtoValue {
    kind: 'string_value' | 'int_value' | 'double_value' | 'bool_value' | 'bytes_value' | 'list_value' | 'map_value' | 'null_value';
    string_value?: string;
    int_value?: number; // int64
    double_value?: number;
    bool_value?: boolean;
    bytes_value?: string; // base64
    list_value?: ProtoListValue;
    map_value?: ProtoMapValue;
    null_value?: 0;
}

interface ProtoListValue {
    values: ProtoValue[];
}

interface ProtoMapValue {
    fields: Record<string, ProtoValue>;
}

// Corresponds to 'enum ResponseType' in RunResponse
enum ResponseType {
    LOG = 0,
    RESULT = 1,
    ERROR = 2
}

// Corresponds to 'message RunResponse' in proto
interface RunResponse {
    type: ResponseType;
    log_message?: string;
    result_json?: string;
    branch_index?: number;
    error?: string;
}

// --- Conversion Helpers ---

// Helper to convert JS values to the Protobuf 'Value' oneof structure
function toProtoValue(val: any): ProtoValue {
    if (val === null || val === undefined) {
        return { kind: 'null_value', null_value: 0 };
    }
    if (typeof val === 'string') {
        return { kind: 'string_value', string_value: val };
    }
    if (typeof val === 'number') {
        if (Number.isInteger(val)) {
            return { kind: 'int_value', int_value: val };
        }
        return { kind: 'double_value', double_value: val };
    }
    if (typeof val === 'boolean') {
        return { kind: 'bool_value', bool_value: val };
    }
    if (Array.isArray(val)) {
        return {
            kind: 'list_value',
            list_value: { values: val.map(v => toProtoValue(v)) }
        };
    }
    if (typeof val === 'object') {
        const fields: Record<string, ProtoValue> = {};
        for (const key in val) {
            fields[key] = toProtoValue(val[key]);
        }
        return {
            kind: 'map_value',
            map_value: { fields }
        };
    }
    // Fallback
    return { kind: 'string_value', string_value: String(val) };
}

// Helper to map a JS object to a map<string, Value>
function mapToProto(obj: any): Record<string, ProtoValue> {
    const result: Record<string, ProtoValue> = {};
    if (!obj) return result;
    for (const key in obj) {
        result[key] = toProtoValue(obj[key]);
    }
    return result;
}

// --- Runner Implementation ---

export class GrpcNodeRunner implements NodeRunner {
    async run(node: NodeDefinition, context: NodeRunnerContext): Promise<Partial<NodeExecutionResult>> {
        const { log } = context;

        // 1. Parameter Interpolation
        const params = interpolate(node.parameters, context);
        const endpoint = params.endpoint || 'localhost:50051';

        // Simulated Metadata Check
        const kind = node.meta?.kind || 'UnknownPlugin';
        log(`[gRPC Manager] Preparing execution for plugin '${kind}' at ${endpoint}`);

        try {
            // ----------------------------------------------------------------
            // Step 1: HealthCheck
            // rpc HealthCheck(HealthCheckRequest) returns (HealthCheckResponse);
            // ----------------------------------------------------------------
            await this.simulateHealthCheck(endpoint, log);

            // ----------------------------------------------------------------
            // Step 2: Init
            // rpc Init(InitRequest) returns (InitResponse);
            // ----------------------------------------------------------------
            // Construct InitRequest
            const initRequest = {
                node_json: JSON.stringify(node),
                // We serialize the workflow definition for context if needed
                workflow_entity_json: JSON.stringify({
                    name: context.workflow.name,
                    trace_id: "trace-" + Date.now()
                }),
                server_endpoint: "https://api.workflow-engine.com"
            };

            await this.simulateInit(initRequest, log);

            // ----------------------------------------------------------------
            // Step 3: Run
            // rpc Run(RunRequest) returns (stream RunResponse);
            // ----------------------------------------------------------------
            // Construct RunRequest with strict typing
            const runRequest = {
                parameters: mapToProto(params),
                parent_output: mapToProto(context.inputs), // Current context inputs map to parent_output
                global_vars: mapToProto(context.global)
            };

            log(`[gRPC Client] Sending RunRequest with ${Object.keys(runRequest.parameters).length} parameters...`);
            // Log trace context injection (simulation)
            log(`[gRPC Metadata] Injecting trace_id: ${context.executionState.nodeResults[node.name]?.startTime || Date.now()}`);

            const { output, branchIndex } = await this.simulateRunStream(runRequest, log);

            return {
                status: 'success',
                inputs: params,
                output: output,
                // In a real branching scenario, the runner might use branchIndex to determine next steps.
                // For now we just return it in output for the engine to potentially use.
                logs: context.executionState.nodeResults[node.name]?.logs || []
            };

        } catch (e: any) {
            return {
                status: 'error',
                inputs: params,
                error: e.message,
                logs: context.executionState.nodeResults[node.name]?.logs || []
            };
        }
    }

    // --- Simulation Methods ---

    private async simulateHealthCheck(endpoint: string, log: (msg: string) => void) {
        log(`[HealthCheck] Pinging ${endpoint}...`);
        await new Promise(resolve => setTimeout(resolve, 300));

        // Simulate failure if endpoint contains "fail"
        if (endpoint.includes('fail')) {
            throw new Error(`Plugin unhealthy: Connection refused at ${endpoint}`);
        }
        log(`[HealthCheck] Status: HEALTHY`);
    }

    private async simulateInit(request: any, log: (msg: string) => void) {
        log(`[Init] Initializing plugin context...`);
        // Simulate payload overhead calculation
        const payloadSize = request.node_json.length + request.workflow_entity_json.length;
        log(`[Init] Sending config payload (${Math.round(payloadSize / 1024)}KB)`);

        await new Promise(resolve => setTimeout(resolve, 400));
        log(`[Init] Plugin initialized successfully`);
    }

    private async simulateRunStream(request: any, log: (msg: string) => void): Promise<{ output: any, branchIndex: number }> {
        // Simulate a gRPC stream with multiple messages

        // Message 1: Log
        await new Promise(resolve => setTimeout(resolve, 300));
        const logMsg1: RunResponse = { type: ResponseType.LOG, log_message: "Validating input parameters..." };
        log(`[Plugin Log] ${logMsg1.log_message}`);

        // Message 2: Log (Simulate processing)
        await new Promise(resolve => setTimeout(resolve, 500));
        const logMsg2: RunResponse = { type: ResponseType.LOG, log_message: "Executing core logic on external system..." };
        log(`[Plugin Log] ${logMsg2.log_message}`);

        // Message 3: Log (Simulate output generation)
        await new Promise(resolve => setTimeout(resolve, 300));
        const logMsg3: RunResponse = { type: ResponseType.LOG, log_message: "Formatting response..." };
        log(`[Plugin Log] ${logMsg3.log_message}`);

        // Message 4: Result
        await new Promise(resolve => setTimeout(resolve, 200));

        // Mock result based on inputs
        const resultData = {
            processed: true,
            timestamp: new Date().toISOString(),
            // Echo back the first parameter key found, just to show dynamic data
            echo: Object.keys(request.parameters).length > 0 ? "Param received" : "No params"
        };

        const resultMsg: RunResponse = {
            type: ResponseType.RESULT,
            result_json: JSON.stringify(resultData),
            branch_index: 0
        };

        log(`[Plugin Result] Stream closed. Branch: ${resultMsg.branch_index}`);

        return {
            output: resultData,
            branchIndex: resultMsg.branch_index || 0
        };
    }
}