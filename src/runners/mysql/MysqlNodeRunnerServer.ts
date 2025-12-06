import { NodeRunner, NodeDefinition, NodeRunnerContext, NodeExecutionResult } from '../../types';
import { interpolate } from '../utils';

/**
 * Server implementation of MySQL Node Runner
 * Uses mysql2 for database connections
 */
export class MysqlNodeRunnerServer implements NodeRunner {
    async run(node: NodeDefinition, context: NodeRunnerContext): Promise<Partial<NodeExecutionResult>> {
        const logs: string[] = [];

        const log = (msg: string) => {
            if (context.log) context.log(msg);
            logs.push(msg);
        };

        log(`[MySQL] Interpolating parameters...`);
        const params = interpolate(node.parameters, context);

        try {
            // Extract connection configuration
            const config = {
                host: params.host || 'localhost',
                port: params.port || 3306,
                user: params.user || params.username || 'root',
                password: params.password || '',
                database: params.database || params.db || ''
            };

            const sql = params.sql || params.query || '';

            if (!sql) {
                throw new Error('SQL query is required');
            }

            log(`[MySQL] Connecting to ${config.host}:${config.port}/${config.database}`);
            log(`[MySQL] User: ${config.user}`);
            log(`[MySQL] Query: ${sql.substring(0, 100)}${sql.length > 100 ? '...' : ''}`);

            // Dynamically import mysql2 (server-only)
            const mysql = await import('mysql2/promise');

            const startTime = Date.now();

            // Create connection
            const connection = await mysql.createConnection({
                host: config.host,
                port: config.port,
                user: config.user,
                password: config.password,
                database: config.database,
                connectTimeout: 10000, // 10 seconds timeout
            });

            log(`[MySQL] Connected successfully`);

            try {
                // Execute query
                const [rows, fields] = await connection.execute(sql, params.values || []);
                const duration = Date.now() - startTime;

                // Get result info
                const isSelect = sql.trim().toUpperCase().startsWith('SELECT');
                const rowCount = Array.isArray(rows) ? rows.length : (rows as any).affectedRows || 0;

                log(`[MySQL] Query executed in ${duration}ms`);
                log(`[MySQL] ${isSelect ? `Rows returned: ${rowCount}` : `Affected rows: ${rowCount}`}`);

                // Close connection
                await connection.end();
                log(`[MySQL] Connection closed`);

                return {
                    status: 'success',
                    inputs: {
                        ...params,
                        password: '***' // Hide password in logs
                    },
                    output: {
                        rows: Array.isArray(rows) ? rows : [],
                        fields: fields?.map((f: any) => ({
                            name: f.name,
                            type: f.type,
                            table: f.table
                        })) || [],
                        affectedRows: (rows as any).affectedRows,
                        insertId: (rows as any).insertId,
                        changedRows: (rows as any).changedRows,
                        rowCount,
                        duration
                    },
                    logs
                };

            } catch (queryError: any) {
                // Make sure to close connection on error
                await connection.end().catch(() => { });
                throw queryError;
            }

        } catch (e: any) {
            log(`[MySQL] Error: ${e.message}`);

            // Provide helpful error messages
            let errorMessage = e.message;
            if (e.code === 'ECONNREFUSED') {
                errorMessage = `Connection refused. Is MySQL running at ${params.host}:${params.port}?`;
            } else if (e.code === 'ER_ACCESS_DENIED_ERROR') {
                errorMessage = `Access denied for user '${params.user}'`;
            } else if (e.code === 'ER_BAD_DB_ERROR') {
                errorMessage = `Unknown database '${params.database}'`;
            } else if (e.code === 'ENOTFOUND') {
                errorMessage = `Host '${params.host}' not found`;
            } else if (e.code === 'ETIMEDOUT') {
                errorMessage = `Connection timed out`;
            }

            return {
                status: 'error',
                inputs: {
                    ...params,
                    password: '***'
                },
                error: errorMessage,
                logs
            };
        }
    }
}
