import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import * as crypto from 'crypto';
import { PERUN_WEBHOOK_SECRET } from '../config/constants';

@Injectable()
export class PerunWebhookGuard implements CanActivate {
	async canActivate(context: ExecutionContext): Promise<boolean> {
		if (!PERUN_WEBHOOK_SECRET) {
			throw new Error('PERUN_WEBHOOK_SECRET environment variable is not configured');
		}

		const request = context.switchToHttp().getRequest();
		const authorizationHeader = request.headers['authorization'];

		if (!authorizationHeader || !authorizationHeader.startsWith('Basic ')) {
			throw new UnauthorizedException('Missing or invalid Authorization header');
		}

		const encodedCredentials = authorizationHeader.split('Basic ')[1].trim();
		const decodedCredentials = Buffer.from(encodedCredentials, 'base64').toString('utf-8');
		const [username, password] = decodedCredentials.split(':');

		if (!username || !password) {
			throw new UnauthorizedException('Invalid credentials format');
		}

		const providedCredentials = `${username}:${password}`;

		const providedHash = crypto.createHash('sha256').update(providedCredentials).digest();
		const expectedHash = crypto.createHash('sha256').update(PERUN_WEBHOOK_SECRET).digest();

		if (!crypto.timingSafeEqual(providedHash, expectedHash)) {
			throw new UnauthorizedException('Invalid credentials');
		}

		return true;
	}
}
