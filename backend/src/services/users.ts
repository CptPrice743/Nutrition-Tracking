import { prisma } from '../lib/prisma';
import type { UpdateProfileInput } from '../schemas/users';

export const updateUser = async (userId: string, data: UpdateProfileInput) => {
	const user = await prisma.user.update({
		where: { id: userId },
		data
	});

	return {
		id: user.id,
		email: user.email,
		displayName: user.displayName,
		age: user.age,
		gender: user.gender,
		heightCm: user.heightCm !== null ? Number(user.heightCm) : null,
		activityLevel: user.activityLevel,
		calorieTarget: user.calorieTarget
	};
};