import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { PERUN_WEBHOOK_SECRET } from '../config/constants';

@Injectable()
export class PerunWebhookGuard implements CanActivate {
	async canActivate(context: ExecutionContext): Promise<boolean> {
		if (!PERUN_WEBHOOK_SECRET) {
			throw new Error('PERUN_WEBHOOK_SECRET environment variable is not configured');
		}

		const request = context.switchToHttp().getRequest();
		const authorizationHeader = request.headers['authorization'];

		if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
			throw new UnauthorizedException('Missing or invalid Authorization header');
		}

		const token = authorizationHeader.split('Bearer ')[1].trim();

		if (token !== PERUN_WEBHOOK_SECRET) {
			throw new UnauthorizedException('Invalid Perun webhook token');
		}

		return true;
	}
}
