# Coding Interview Platform

Real-time collaborative coding interview platform with a React + Vite frontend, Express/Socket.io backend, Monaco editor, and browser-only (WASM/worker) code execution.

## Prerequisites
- Node.js 18+
- npm

## Install
```bash
npm install
```

## Run (dev)
Starts server and client together (via concurrently):
```bash
npm run dev
```
- Server: http://localhost:3000 (binds 0.0.0.0 for remote/VM access)
- Client: http://localhost:5173 (Vite dev server; binds 0.0.0.0)
- If backend is on a different host/port, set `VITE_BACKEND_URL` in the client env before running: e.g. `VITE_BACKEND_URL=http://your-host:3000 npm run dev`.

Run individually:
```bash
npm run dev:server   # backend only
npm run dev:client   # frontend only
```

## Build
```bash
npm run build
```

## Tests
```bash
npm test
```
Note: socket/HTTP integration tests auto-skip if the environment blocks binding to localhost.

## Code execution
- JavaScript runs in a Web Worker sandbox with a 5s timeout.
- Python runs in-browser via Pyodide (WASM) when network access to the Pyodide CDN is available.
- Server-side execution is disabled for security; `/execute` returns a guidance message.

## Key commands (quick reference)
- `npm install` — install deps
- `npm run dev` — run server + client concurrently
- `npm run dev:server` — backend only
- `npm run dev:client` — frontend only
- `npm run build` — build client + server
- `npm test` — run server tests (integration tests skip if binding is blocked)
