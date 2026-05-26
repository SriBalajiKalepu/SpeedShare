import { db } from '../firebase.js';

const ROOMS_COLLECTION = 'rooms';
const TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Check if a room exists (and is not expired).
 * Lazily deletes expired rooms.
 */
async function roomExists(code) {
	try {
		const docRef = db.collection(ROOMS_COLLECTION).doc(code);
		const doc = await docRef.get();
		
		if (!doc.exists) {
			return false;
		}

		const data = doc.data();
		const createdAtStr = data.createdAt;
		
		if (!createdAtStr) return false;

		const createdAt = new Date(createdAtStr).getTime();
		const ageMs = Date.now() - createdAt;

		if (ageMs > TTL_MS) {
			// expired — clean up lazily
			await deleteRoom(code);
			return false;
		}
		
		return true;
	} catch (err) {
		console.error(`[roomExists] Error checking room ${code}:`, err);
		return false; // Safely fail
	}
}

/**
 * Create a new room with the given code.
 */
async function createRoom(code) {
	try {
		const docRef = db.collection(ROOMS_COLLECTION).doc(code);
		await docRef.set({
			code: code,
			createdAt: new Date().toISOString()
		});
	} catch (err) {
		console.error(`[createRoom] Error:`, err);
		throw err;
	}
}

/**
 * Delete a room by code.
 * Returns true if deleted, false if not found.
 */
async function deleteRoom(code) {
	try {
		const docRef = db.collection(ROOMS_COLLECTION).doc(code);
		const doc = await docRef.get();
		
		if (!doc.exists) return false;
		
		await docRef.delete();
		return true;
	} catch (err) {
		console.error(`[deleteRoom] Error:`, err);
		throw err;
	}
}

export { roomExists, createRoom, deleteRoom };
