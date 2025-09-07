# Node.js & Express (backend overview)

Purpose
- Explain how Node.js and Express are used in this project.

High-level summary
- Node.js is the JavaScript runtime used to run the backend server.
- Express is a lightweight web framework on top of Node.js used to define API routes and middleware.

Where to look in code
- Server entry: `server.js` (project root).
- Server creation and app setup: lines ~54-86. This includes creating the Express app and starting the HTTP server.
  - The code that starts the server is: `const server = app.listen(PORT, HOST, () => { ... })` (around line 54).

Key concepts (easy explanations)
- HTTP server: The server listens on a port (3001 by default) and responds to HTTP requests. Think of the server as a shop that receives orders (requests) and sends back packages (responses).
- Middleware: Small functions that run before the final route handler. They can parse JSON, handle CORS, log requests, or reject bad requests. In `server.js`, `bodyParser.json()` and `cors()` are middleware (around lines 88-92).
- Routes / Endpoints: Functions that respond to specific paths like `/api/products` or `/api/coupons`. Routes are defined using `app.get`, `app.post`, `app.delete`, etc. See examples in `server.js` (starting around line 199 for product save, 260 for getting products, 312 for reading files).

Example: How products are saved
- Endpoint: `POST /api/products/save` (starts near line 199).
- What happens:
  1. The server receives a JSON body containing `products`.
  2. It validates that `products` is an array.
  3. It calls `saveJsonToFile(products, 'src/data/products.json')` to persist changes (see `saveJsonToFile` in the file utility section).
  4. If save succeeds, it broadcasts the change over WebSocket and responds with success.

Practical tips for beginners
- Use console.log liberally while learning to see how requests flow through the server.
- Keep route handlers small: validate input, do the work (read/update files), then respond.
- Protect file reads/writes by checking paths and handling errors — `server.js` includes path checks and error handling.

Where to read next
- File operations: see `docs/backend/File-Operations.md`.
- Real-time updates: see `docs/backend/WebSocket-SocketIO.md`.
