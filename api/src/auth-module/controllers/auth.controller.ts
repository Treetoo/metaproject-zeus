import { Controller, Post, UnauthorizedException, Headers } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../decorators/public.decorator';
import { TokenService } from '../services/token.service';
import { AuthService } from '../services/auth.service';
import { InvalidUserApiException } from '../../error-module/errors/users/invalid-user.api-exception';
import { UserMapper } from '../../users-module/services/user.mapper';
import { UserDto } from '../../users-module/dtos/user.dto';

@Controller('auth')
@ApiTags('Auth')
export class AuthController {
	constructor(
		private readonly tokenService: TokenService,
		private readonly authService: AuthService,
		private readonly userMapper: UserMapper
	) {}

	@Post('sign-in')
	@Public()
	@ApiOperation({
		summary: 'Signs in user',
		description: 'Creates user in internal system from access token.'
	})
	async signIn(@Headers('Authorization') authorizationHeader: string): Promise<UserDto> {
		const accessToken = authorizationHeader.split(' ')[1]?.trim();

		if (!accessToken) {
			throw new UnauthorizedException();
		}

		// otherwise get data from endpoint
		const userInfo = await this.tokenService.getUserInfo(accessToken);
		const user = await this.authService.signIn(userInfo);

		if (!user) {
			throw new InvalidUserApiException();
		}

		return this.userMapper.toUserDto(user);
	}
}
