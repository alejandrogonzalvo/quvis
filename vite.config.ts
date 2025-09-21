/// <reference types="vitest" />
import { defineConfig } from 'vite';
import { spawn } from 'child_process';
import path from 'path';

const circuitGeneratorMiddleware = async (req, res, next) => {
    if (req.method !== 'POST') {
        res.statusCode = 405;
        res.end('Method Not Allowed');
        return;
    }

    let body = '';
    req.on('data', (chunk) => {
        body += chunk.toString();
    });

    req.on('end', async () => {
        try {
            const params = JSON.parse(body);
            console.log('📥 Received circuit generation request:', params);

            console.log('🐍 Executing Python playground API...');

            // Execute Python script
            const args = [
                '-m',
                'quvis.api.playground',
                '--algorithm',
                params.algorithm,
                '--num-qubits',
                params.num_qubits.toString(),
                '--topology',
                params.topology,
                '--optimization-level',
                (params.optimization_level || 1).toString(),
            ];

            const pythonProcess = spawn('python3', args, {
                cwd: process.cwd(),
                stdio: ['pipe', 'pipe', 'pipe'],
                env: {
                    ...process.env,
                    PYTHONPATH: path.join(process.cwd(), 'quvis/core/src'),
                },
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
                        res.writeHead(200, {
                            'Content-Type': 'application/json',
                        });
                        res.end(JSON.stringify(result));
                    } catch (parseError) {
                        console.error(
                            '❌ Failed to parse Python output:',
                            parseError
                        );
                        console.error('stdout:', stdout);
                        console.error('stderr:', stderr);
                        res.writeHead(500, {
                            'Content-Type': 'application/json',
                        });
                        res.end(
                            JSON.stringify({
                                error: 'Failed to parse circuit generation output',
                                generation_successful: false,
                            })
                        );
                    }
                } else {
                    console.error('❌ Python script failed with code:', code);
                    console.error('stderr:', stderr);
                    res.writeHead(500, {
                        'Content-Type': 'application/json',
                    });
                    res.end(
                        JSON.stringify({
                            error: stderr || 'Circuit generation failed',
                            generation_successful: false,
                        })
                    );
                }
            });

            pythonProcess.on('error', (error) => {
                console.error('❌ Failed to start Python process:', error);
                res.writeHead(500, {
                    'Content-Type': 'application/json',
                });
                res.end(
                    JSON.stringify({
                        error: 'Failed to start Python process',
                        generation_successful: false,
                    })
                );
            });
        } catch (error) {
            console.error('❌ Error processing request:', error);
            res.writeHead(500, {
                'Content-Type': 'application/json',
            });
            res.end(
                JSON.stringify({
                    error: 'Internal server error',
                    generation_successful: false,
                })
            );
        }
    });
};

export default defineConfig({
    base: process.env.NODE_ENV === 'production' ? '/quvis/' : '/',
    plugins: [
        {
            name: 'circuit-generator',
            configureServer(server) {
                server.middlewares.use(
                    '/api/generate-circuit',
                    circuitGeneratorMiddleware
                );
            },
            configurePreviewServer(server) {
                server.middlewares.use(
                    '/api/generate-circuit',
                    circuitGeneratorMiddleware
                );
            },
        },
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
        outDir: 'dist',
        rollupOptions: {
            input: 'quvis/web/index.html',
            output: {
                manualChunks: {
                    three: ['three'],
                },
            },
        },
    },
    publicDir: 'public',
    root: 'quvis/web',
    define: {
        'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
    },
});
