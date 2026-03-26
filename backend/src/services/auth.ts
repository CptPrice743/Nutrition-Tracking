import type { User } from '@prisma/client';
import jwt from 'jsonwebtoken';

import { admin } from '../config/firebase';
import { prisma } from '../lib/prisma';

type SessionResult = {
	jwt: string;
	user: User;
};

export const createSession = async (idToken: string): Promise<SessionResult> => {
	const decodedToken = await admin.auth().verifyIdToken(idToken);
	const firebaseUid = decodedToken.uid;
	const email = decodedToken.email;
	const displayName = decodedToken.name ?? null;

	if (!email) {
		throw new Error('Firebase token does not contain an email');
	}

	const user = await prisma.user.upsert({
		where: { firebaseUid },
		update: {
			displayName,
			email
		},
		create: {
			firebaseUid,
			email,
			displayName
		}
	});

	const jwtSecret = process.env.JWT_SECRET;
	if (!jwtSecret) {
		throw new Error('JWT_SECRET is required');
	}

	const sessionJwt = jwt.sign(
		{
			id: user.id,
			email: user.email
		},
		jwtSecret,
		{
			expiresIn: '7d',
			subject: user.id
		}
	);

	return {
		jwt: sessionJwt,
		user
	};
};
