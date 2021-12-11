import { User } from './entity/Entities';
import { sign } from 'jsonwebtoken';
import { Response } from 'express';

export const createAccessToken = (user: User) => {
	return sign({ userId: user.id }, process.env.ACCESS_TOKEN_SECRET!, {
		expiresIn: '15m',
		algorithm: 'HS512'
	});
};

export const createRefreshToken = (user: User) => {
	return sign({ userId: user.id }, process.env.REFRESH_TOKEN_SECRET!, {
		expiresIn: '7d',
		algorithm: 'HS512'
	});
};

export const sendRefreshToken = (res: Response, token: string) => {
	res.cookie('jid', token, {
		secure: true,
		httpOnly: true,
		sameSite: 'none'
	});
};
