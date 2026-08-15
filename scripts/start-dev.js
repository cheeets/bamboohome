import { spawn } from 'child_process';

console.log('Starting Bamboo Home AI backend server on port 5000...');
const backend = spawn('node', ['backend/server.js'], { stdio: 'inherit', shell: true });

console.log('Starting Vite frontend server on port 5173...');
const frontend = spawn('npx', ['vite'], { stdio: 'inherit', shell: true });

const cleanup = () => {
  backend.kill();
  frontend.kill();
  process.exit();
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('exit', cleanup);
