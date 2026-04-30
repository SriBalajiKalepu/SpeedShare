import { firebaseConfig } from '../firebase.js';

const PROJECT_ID = firebaseConfig.projectId;
const API_KEY = firebaseConfig.apiKey;
// The REST API URL for Firestore
const FIRESTORE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
const ROOMS_COLLECTION = 'rooms';
const TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Helper to construct the document URL
 */
function getDocumentUrl(code) {
	return `${FIRESTORE_URL}/${ROOMS_COLLECTION}/${code}?key=${API_KEY}`;
}

/**
 * Check if a room exists (and is not expired).
 * Lazily deletes expired rooms.
 */
async function roomExists(code) {
	try {
		const res = await fetch(getDocumentUrl(code));
		if (!res.ok) {
			if (res.status === 404) return false;
			throw new Error(`Failed to check room: ${res.statusText}`);
		}

		const data = await res.json();
		
		// Parse the timestamp which is in the format "2024-02-14T12:00:00.000Z"
		const createdAtStr = data.fields?.createdAt?.timestampValue;
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
	const url = getDocumentUrl(code);
	
	// Firestore REST API requires a specific JSON structure describing fields and their types
	const document = {
		fields: {
			code: { stringValue: code },
			createdAt: { timestampValue: new Date().toISOString() }
		}
	};

	try {
		// We use PATCH to create/update. POST is for auto-generated IDs.
		const res = await fetch(url, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(document)
		});

		if (!res.ok) {
			const errorData = await res.json().catch(() => null);
			throw new Error(`Failed to create room: ${res.statusText} ${JSON.stringify(errorData)}`);
		}
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
		const existsUrl = getDocumentUrl(code);
		const checkRes = await fetch(existsUrl);
		if (checkRes.status === 404) return false;
		
		const res = await fetch(existsUrl, {
			method: 'DELETE'
		});
		
		if (!res.ok) {
			throw new Error(`Failed to delete room: ${res.statusText}`);
		}
		return true;
	} catch (err) {
		console.error(`[deleteRoom] Error:`, err);
		throw err;
	}
}

export { roomExists, createRoom, deleteRoom };
