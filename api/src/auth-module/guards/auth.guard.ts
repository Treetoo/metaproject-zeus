import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
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
		private readonly userMapper: UserMapper
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
	}
}
