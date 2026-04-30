import http from 'http';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Server as SocketIOServer } from 'socket.io';
import roomRoutes from './routes/roomRoutes.js';
import { registerSocketHandlers } from './socket/socketHandler.js';
import './firebase.js'; // initialize Firebase

dotenv.config();

const allowedOrigin = process.env.ALLOWED_ORIGIN || ['http://localhost:4200', 'https://speed-share-psi.vercel.app'];

const app = express();
const server = http.createServer(app);

const corsOptions = {
	origin: allowedOrigin,
	methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
	credentials: true,
};

const io = new SocketIOServer(server, {
	cors: corsOptions,
	maxHttpBufferSize: 50e6, // 50MB limit for file uploads (base64 increases size by ~33%)
	pingTimeout: 60000,      // 60 seconds - increase timeout for large file transfers
	pingInterval: 25000,     // 25 seconds
	transports: ['websocket', 'polling'],
	allowEIO3: true,
});

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes
app.use('/api', roomRoutes);

// Root route
app.get('/', (_req, res) => {
	res.send('SpeedShare Backend is running (Firebase version) 🚀');
});

// Health check
app.get('/health', (_req, res) => {
	res.json({ status: 'ok' });
});

// Socket handlers
registerSocketHandlers(io);

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
	console.log(`[Server] listening on port ${PORT}`);
	console.log(`[Firebase] Firestore connected to project: speed-share-14dd5`);
	console.log(`[CORS] allowed origin: ${allowedOrigin}`);
});
