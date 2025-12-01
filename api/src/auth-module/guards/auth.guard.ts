import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { UserMapper } from '../../users-module/services/user.mapper';
import { UsersModel } from '../../users-module/models/users.model';
import { TokenService } from '../services/token.service';

@Injectable()
export class AuthGuard implements CanActivate {
	constructor(
		private readonly usersModel: UsersModel,
		private readonly tokenService: TokenService,
		private readonly reflector: Reflector,
		private readonly userMapper: UserMapper,
		private readonly configService: ConfigService
	) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
			context.getHandler(),
			context.getClass()
		]);

		if (isPublic) {
			return true;
		}

		const request = context.switchToHttp().getRequest();

		// ============================================================
		// MOCK AUTH MODE - Temporarily disabled OIDC for testing
		// ============================================================
		const mockAuthEnabled = this.configService.get<boolean>('MOCK_AUTH_ENABLED', false);
		if (mockAuthEnabled) {
			return this.handleMockAuth(request);
		}
		// ============================================================
		// END MOCK AUTH MODE
		// ============================================================

		// --- OIDC AUTH (commented out for mock mode, uncomment to restore) ---
		const authorizationHeader = request.headers['authorization'];

		// authorization header not present
		if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
			throw new UnauthorizedException();
		}

		const stepUpHeader = request.headers['x-step-up'];
		const forceUserRole = !stepUpHeader || stepUpHeader !== 'true';
		request.isStepUp = !forceUserRole;

		const accessToken = authorizationHeader.split('Bearer ')[1].trim();
		const externalId = await this.tokenService.getUserExternalId(accessToken);

		if (!externalId) {
			throw new UnauthorizedException();
		}

		const user = await this.usersModel.findUserByExternalId(externalId);
		if (!user) {
			throw new UnauthorizedException();
		}

		request.user = this.userMapper.toUserDto(user, forceUserRole);
		return true;
		// --- END OIDC AUTH ---
	}

	/**
	 * Handle mock authentication using X-Mock-User-Id header
	 * This is only active when MOCK_AUTH_ENABLED=true
	 */
	private async handleMockAuth(request: any): Promise<boolean> {
		const mockUserIdHeader = request.headers['x-mock-user-id'];

		if (!mockUserIdHeader) {
			throw new UnauthorizedException('Mock auth enabled but X-Mock-User-Id header not provided');
		}

		const mockUserId = parseInt(mockUserIdHeader, 10);
		if (isNaN(mockUserId)) {
			throw new UnauthorizedException('X-Mock-User-Id must be a valid number');
		}

		const user = await this.usersModel.findUserById(mockUserId);
		if (!user) {
			throw new UnauthorizedException(`Mock user with ID ${mockUserId} not found`);
		}

		// Handle step-up header for mock mode too
		const stepUpHeader = request.headers['x-step-up'];
		const forceUserRole = !stepUpHeader || stepUpHeader !== 'true';
		request.isStepUp = !forceUserRole;

		request.user = this.userMapper.toUserDto(user, forceUserRole);
		return true;
	}
}
