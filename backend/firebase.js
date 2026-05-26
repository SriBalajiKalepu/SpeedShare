import admin from 'firebase-admin';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const serviceAccountPath = resolve(__dirname, 'serviceAccountKey.json');

if (existsSync(serviceAccountPath)) {
	const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
	
	admin.initializeApp({
		credential: admin.credential.cert(serviceAccount)
	});
	
	console.log('[Firebase] Admin SDK initialized successfully');
} else {
	console.error('[Firebase] ❌ ERROR: serviceAccountKey.json not found in backend directory!');
	console.error('[Firebase] Please generate it from Firebase Console and place it in the backend folder.');
	process.exit(1);
}

export const db = admin.firestore();
