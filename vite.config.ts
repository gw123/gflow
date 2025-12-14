
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    worker: {
      format: 'es',
    },
    define: {
      // Ensure API_KEY is replaced with the string value or empty string
      'process.env.API_KEY': JSON.stringify(env.API_KEY || ''),
      // Polyfill process.env object for libraries that might access it directly
      'process.env': {
        API_KEY: env.API_KEY || '',
        NODE_ENV: JSON.stringify(process.env.NODE_ENV || 'development'),
        VITE_API_BASE: JSON.stringify(env.VITE_API_BASE || '')
      }
    },
    build: {
      rollupOptions: {
        external: [
          'fs', 'path', 'os', 'child_process', 'crypto', 'stream', 'buffer', 'util', 'events', 'net', 'tls', 'zlib', 'http', 'https', 'url', 'querystring', 'punycode', 'assert', 'constants', 'vm', 'mysql2', 'mysql2/promise', 'better-sqlite3'
        ]
      }
    }
  };
});
