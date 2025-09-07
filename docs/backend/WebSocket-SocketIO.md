# WebSocket (Socket.IO) — Real-time communication

Purpose
- Explain how real-time updates are implemented using Socket.IO and where to find the code.

High-level summary
- Socket.IO is a library that makes it easy to add real-time, bidirectional communication between clients and the server.
- The server can push updates to all connected clients immediately when data changes (for example, when `coupons.json` or `banner.json` is updated).

Where to look in code
- Socket.IO initialization and connection handling: `server.js` (around line 64 for Server init and ~182 for connection handler).
  - Server init: `const io = new Server(server, { cors: { origin: '*', methods: ['GET','POST'] } });`
  - Connection handler: `io.on('connection', (socket) => { ... })` (around line 182).

How it's used in this project
- Broadcasting changes: There's a helper `broadcastDataChange(fileType)` (defined near the Socket.IO setup) that emits events such as `couponChanged`, `bannerChanged`, etc. The server calls this after successful file writes (see `savefile` endpoint and product save endpoint).
- Client requests broadcast: The server also listens for client-sent `requestDataChange` events and will re-broadcast when requested.

Simple example for students
- Think of Socket.IO like a chat room where the server and many clients can send messages to each other. In this project, the "message" is a small JSON that says "couponChanged" and includes a timestamp.

Why this matters
- Real-time updates make the admin UI reflect changes immediately without requiring manual refresh.
- Good for collaborative admin actions or live storefront updates.

Where to read next
- See `docs/backend/NodeJS-Express.md` for how the HTTP and socket server are started together.
- See `docs/backend/File-Operations.md` for how file saves trigger broadcasts.
