import http from 'http';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import { Server as SocketIOServer } from 'socket.io';
import roomRoutes from './routes/roomRoutes.js';
import { registerSocketHandlers } from './socket/socketHandler.js';

dotenv.config();

const app = express();
const server = http.createServer(app);

const allowedOrigin = process.env.ALLOWED_ORIGIN || 'http://localhost:4200';
const corsOptions = {
	origin: allowedOrigin,
	methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
	credentials: true,
};

const io = new SocketIOServer(server, {
	cors: corsOptions,
	maxHttpBufferSize: 50e6, // 50MB limit for file uploads (base64 increases size by ~33%)
	pingTimeout: 60000, // 60 seconds - increase timeout for large file transfers
	pingInterval: 25000, // 25 seconds
	transports: ['websocket', 'polling'], // Allow both transports
	allowEIO3: true, // Allow Engine.IO v3 clients
});

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes
app.use('/api', roomRoutes);

// Health check
app.get('/health', (_req, res) => {
	res.json({ status: 'ok' });
});

// Socket handlers
registerSocketHandlers(io);

// MongoDB connection
const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://balaji:Balaji123@cluster0.xkd36hg.mongodb.net/?appName=Cluster0';
mongoose
	.connect(mongoUri, {
		serverSelectionTimeoutMS: 5000,
	})
	.then(() => {
		console.log('[MongoDB] connected');
	})
	.catch((err) => {
		console.error('[MongoDB] connection error:', err.message);
		 	});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
	console.log(`[Server] listening on port ${PORT}`);
	console.log(`[CORS] allowed origin: ${allowedOrigin}`);
});






