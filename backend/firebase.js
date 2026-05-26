import admin from 'firebase-admin';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const serviceAccountPath = resolve(__dirname, 'serviceAccountKey.json');

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
	try {
		const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
		admin.initializeApp({
			credential: admin.credential.cert(serviceAccount)
		});
		console.log('[Firebase] Admin SDK initialized successfully from ENV');
	} catch (error) {
		console.error('[Firebase] ❌ ERROR: Failed to parse FIREBASE_SERVICE_ACCOUNT env variable!');
		process.exit(1);
	}
} else if (existsSync(serviceAccountPath)) {
	const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
	
	admin.initializeApp({
		credential: admin.credential.cert(serviceAccount)
	});
	
	console.log('[Firebase] Admin SDK initialized successfully from file');
} else {
	console.error('[Firebase] ❌ ERROR: serviceAccountKey.json not found and FIREBASE_SERVICE_ACCOUNT env var not set!');
	process.exit(1);
}

export const db = admin.firestore();
