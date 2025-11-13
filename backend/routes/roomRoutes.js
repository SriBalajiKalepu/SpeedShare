import express from 'express';
import Room from '../models/Room.js';

const router = express.Router();

const CODE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
function generateRoomCode() {
	let code = '';
	for (let i = 0; i < 4; i += 1) {
		code += CODE_CHARS.charAt(Math.floor(Math.random() * CODE_CHARS.length));
	}
	return code;
}

// POST /api/room → create a room and return its code
router.post('/room', async (_req, res) => {
	try {
		// Try up to N times to avoid collision
		let attemptsRemaining = 10;
		let code;
		while (attemptsRemaining > 0) {
			code = generateRoomCode();
			// Check if exists
			// eslint-disable-next-line no-await-in-loop
			const exists = await Room.exists({ code });
			if (!exists) break;
			attemptsRemaining -= 1;
		}
		if (attemptsRemaining === 0) {
			return res.status(500).json({ error: 'Failed to generate unique room code' });
		}
		const room = new Room({ code });
		await room.save();
		return res.status(201).json({ code: room.code });
	} catch (err) {
		console.error('[POST /api/room] error:', err);
		return res.status(500).json({ error: 'Internal server error' });
	}
});

// GET /api/rooms/:code → verify if room exists
router.get('/rooms/:code', async (req, res) => {
	try {
		const code = String(req.params.code || '').toUpperCase();
		if (!code || code.length !== 4) {
			return res.status(400).json({ exists: false, error: 'Invalid room code' });
		}
		const exists = await Room.exists({ code });
		return res.json({ exists: Boolean(exists) });
	} catch (err) {
		console.error('[GET /api/rooms/:code] error:', err);
		return res.status(500).json({ error: 'Internal server error' });
	}
});

// DELETE /api/rooms/:code → delete/end a room
router.delete('/rooms/:code', async (req, res) => {
	try {
		const code = String(req.params.code || '').toUpperCase();
		if (!code || code.length !== 4) {
			return res.status(400).json({ error: 'Invalid room code' });
		}
		const result = await Room.deleteOne({ code });
		if (result.deletedCount === 0) {
			return res.status(404).json({ error: 'Room not found' });
		}
		return res.json({ success: true, message: 'Room ended successfully' });
	} catch (err) {
		console.error('[DELETE /api/rooms/:code] error:', err);
		return res.status(500).json({ error: 'Internal server error' });
	}
});

export default router;


