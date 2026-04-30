export function registerSocketHandlers(io) {
	io.on('connection', (socket) => {
		console.log(`[Socket] connected: ${socket.id}`);

		socket.on('join-room', (roomCode) => {
			const code = String(roomCode || '').toUpperCase();
			if (!code || code.length !== 4) {
				return;
			}
			socket.join(code);
			console.log(`[Socket] ${socket.id} joined room ${code}`);
		});

		// send-message → broadcast text message to all users in the room
		socket.on('send-message', (payload) => {
			try {
				const { roomCode, message, sender } = payload || {};
				const code = String(roomCode || '').toUpperCase();
				if (!code || !message) return;
				socket.to(code).emit('receive-message', {
					message,
					sender: sender || 'anonymous',
					timestamp: Date.now(),
				});
			} catch {
				// no-op
			}
		});

		// send-file → broadcast file (base64 or binary) with filename and type
		socket.on('send-file', (payload, callback) => {
			try {
				const { roomCode, fileName, mimeType, data } = payload || {};
				const code = String(roomCode || '').toUpperCase();
				if (!code || !data || !fileName) {
					console.log(`[Socket] Invalid send-file payload: code=${code}, fileName=${fileName}, hasData=${!!data}`);
					if (callback) callback({ error: 'Invalid payload' });
					return;
				}
				
				const dataSize = typeof data === 'string' ? data.length : data.byteLength || 0;
				console.log(`[Socket] Broadcasting file ${fileName} (${(dataSize / 1024 / 1024).toFixed(2)}MB) to room ${code}`);
				
				// Check if socket is in the room
				const room = io.sockets.adapter.rooms.get(code);
				if (!room || !room.has(socket.id)) {
					console.log(`[Socket] Socket ${socket.id} not in room ${code}, joining now`);
					socket.join(code);
				}
				
				// Broadcast to all other users in the room
				socket.to(code).emit('receive-file', {
					fileName,
					mimeType: mimeType || 'application/octet-stream',
					data, // expected to be base64 string or ArrayBuffer from client
					timestamp: Date.now(),
				});
				
				console.log(`[Socket] File ${fileName} broadcasted to room ${code}`);
				if (callback) callback({ success: true });
			} catch (err) {
				console.error('[Socket] Error in send-file handler:', err);
				if (callback) callback({ error: err.message || 'Unknown error' });
			}
		});

		// end-room → notify all users in the room that it's been ended
		socket.on('end-room', (roomCode) => {
			try {
				const code = String(roomCode || '').toUpperCase();
				if (!code || code.length !== 4) return;
				io.to(code).emit('room-ended');
				console.log(`[Socket] Room ${code} ended by ${socket.id}`);
			} catch {
				// no-op
			}
		});

		socket.on('disconnect', (reason) => {
			console.log(`[Socket] disconnected: ${socket.id} reason=${reason}`);
		});
	});
}


