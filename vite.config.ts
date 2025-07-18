/// <reference types="vitest" />
import { defineConfig } from 'vite';
import { spawn } from 'child_process';
import path from 'path';

export default defineConfig({
  base: process.env.NODE_ENV === 'production' ? '/quvis/' : '/',
  plugins: [
    {
      name: 'circuit-generator',
      configureServer(server) {
        server.middlewares.use('/api/generate-circuit', async (req, res, next) => {
          if (req.method !== 'POST') {
            res.statusCode = 405;
            res.end('Method Not Allowed');
            return;
          }

          let body = '';
          req.on('data', chunk => {
            body += chunk.toString();
          });

          req.on('end', async () => {
            try {
              const params = JSON.parse(body);
              console.log('📥 Received circuit generation request:', params);
              
              // Create Python script that uses the playground API
              const pythonScript = `
import sys
import json
import os
from pathlib import Path

# Try to find the correct path to the core package
# Since __file__ is not available with -c, use current working directory
cwd = Path(os.getcwd())
possible_paths = [
    cwd / "quvis/core/src",  # If running from project root quvis-web/
    cwd / "core/src",        # If running from quvis/
    cwd / "../core/src",     # If running from quvis/web/
    cwd / "../../core/src",  # If running from quvis/web/src/
]

core_package_path = None
for path_candidate in possible_paths:
    if (path_candidate / "quvis" / "api" / "playground.py").exists():
        core_package_path = path_candidate
        break

if core_package_path is None:
    print("ERROR: Could not find quvis core package", file=sys.stderr)
    print(f"ERROR: Current working directory: {cwd}", file=sys.stderr)
    print("ERROR: Searched paths:", file=sys.stderr)
    for p in possible_paths:
        print(f"ERROR:   {p} (exists: {p.exists()})", file=sys.stderr)
    sys.exit(1)

print(f"INFO: Found core package at: {core_package_path}", file=sys.stderr)
sys.path.insert(0, str(core_package_path))

try:
    from quvis.api.playground import generate_playground_circuit
except ImportError as e:
    print(f"ERROR: Could not import playground API: {e}", file=sys.stderr)
    print(f"ERROR: Python path: {sys.path}", file=sys.stderr)
    sys.exit(1)

# Generate circuit with the API
try:
    print(f"INFO: Generating circuit - algorithm: ${params.algorithm}, qubits: ${params.num_qubits}, topology: ${params.topology}", file=sys.stderr)
    
    result = generate_playground_circuit(
        algorithm="${params.algorithm}",
        num_qubits=${params.num_qubits},
        topology="${params.topology}",
        optimization_level=${params.optimization_level || 1}
    )
    
    # Add generation success flag
    result["generation_successful"] = True
    
    # Try to save to public directory for frontend
    output_paths = [
        cwd / "public/playground_circuit_data.json",
        cwd / "quvis/web/public/playground_circuit_data.json",
        cwd / "../public/playground_circuit_data.json"
    ]
    
    saved = False
    for output_path in output_paths:
        try:
            output_path.parent.mkdir(parents=True, exist_ok=True)
            with open(output_path, "w") as f:
                json.dump(result, f, separators=(',', ':'))
            print(f"INFO: Saved circuit data to: {output_path}", file=sys.stderr)
            saved = True
            break
        except (OSError, IOError) as e:
            print(f"INFO: Could not save to {output_path}: {e}", file=sys.stderr)
            continue
    
    if not saved:
        print("WARNING: Could not save circuit data to public directory", file=sys.stderr)
    
    print(f"INFO: Circuit generation completed successfully", file=sys.stderr)
    
    # Output result to stdout (this MUST be the last print to stdout)
    print(json.dumps(result, separators=(',', ':')))

except Exception as e:
    print(f"ERROR: Circuit generation failed: {e}", file=sys.stderr)
    import traceback
    print(f"ERROR: Traceback: {traceback.format_exc()}", file=sys.stderr)
    error_result = {
        "generation_successful": False,
        "error": str(e)
    }
    print(json.dumps(error_result, separators=(',', ':')))
    sys.exit(1)
`;
              
              console.log('🐍 Executing Python playground API...');
              
              // Execute Python script
              const pythonProcess = spawn('python3', ['-c', pythonScript], {
                cwd: process.cwd(),
                stdio: ['pipe', 'pipe', 'pipe']
              });
              
              let stdout = '';
              let stderr = '';
              
              pythonProcess.stdout.on('data', (data) => {
                stdout += data.toString();
              });
              
              pythonProcess.stderr.on('data', (data) => {
                stderr += data.toString();
              });
              
              pythonProcess.on('close', (code) => {
                if (code === 0) {
                  try {
                    const result = JSON.parse(stdout);
                    console.log('✅ Circuit generated successfully');
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(result));
                  } catch (parseError) {
                    console.error('❌ Failed to parse Python output:', parseError);
                    console.error('stdout:', stdout);
                    console.error('stderr:', stderr);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ 
                      error: 'Failed to parse circuit generation output',
                      generation_successful: false 
                    }));
                  }
                } else {
                  console.error('❌ Python script failed with code:', code);
                  console.error('stderr:', stderr);
                  res.writeHead(500, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ 
                    error: stderr || 'Circuit generation failed',
                    generation_successful: false 
                  }));
                }
              });
              
              pythonProcess.on('error', (error) => {
                console.error('❌ Failed to start Python process:', error);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                  error: 'Failed to start Python process',
                  generation_successful: false 
                }));
              });
              
            } catch (error) {
              console.error('❌ Error processing request:', error);
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ 
                error: 'Internal server error',
                generation_successful: false 
              }));
            }
          });
        });
      }
    }
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'quvis/web/src'),
    },
  },
  server: {
    port: 5173,
    host: true,
  },
  build: {
    outDir: 'quvis/web/dist',
    rollupOptions: {
      input: 'quvis/web/index.html',
      output: {
        manualChunks: {
          'three': ['three'],
          'qiskit': ['@qiskit/qiskit-ui'],
        },
      },
    },
  },
  publicDir: 'quvis/web/public',
  root: 'quvis/web',
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
  },
}); 