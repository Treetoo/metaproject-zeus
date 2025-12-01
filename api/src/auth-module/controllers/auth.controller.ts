import { Body, Controller, Post, UnauthorizedException, Headers } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../decorators/public.decorator';
import { TokenService } from '../services/token.service';
import { AuthService } from '../services/auth.service';
import { InvalidUserApiException } from '../../error-module/errors/users/invalid-user.api-exception';
import { UserMapper } from '../../users-module/services/user.mapper';
import { UserDto } from '../../users-module/dtos/user.dto';
import { MockSignInDto } from '../dto/mock-sign-in.dto';

@Controller('auth')
@ApiTags('Auth')
export class AuthController {
	constructor(
		private readonly tokenService: TokenService,
		private readonly authService: AuthService,
		private readonly userMapper: UserMapper,
		private readonly configService: ConfigService
	) {}

	@Post('sign-in')
	@Public()
	@ApiOperation({
		summary: 'Signs in user',
		description:
			'Creates user in internal system. In normal mode, uses OIDC access token. When MOCK_AUTH_ENABLED=true, accepts JSON body with user data.'
	})
	@ApiBody({
		description: 'Mock user data (only used when MOCK_AUTH_ENABLED=true)',
		type: MockSignInDto,
		required: false
	})
	async signIn(
		@Headers('Authorization') authorizationHeader: string,
		@Body() mockSignInDto?: MockSignInDto
	): Promise<UserDto> {
		// ============================================================
		// MOCK AUTH MODE - Temporarily disabled OIDC for testing
		// ============================================================
		const mockAuthEnabled = this.configService.get<boolean>('MOCK_AUTH_ENABLED', false);
		if (mockAuthEnabled) {
			return this.handleMockSignIn(mockSignInDto);
		}
		// ============================================================
		// END MOCK AUTH MODE
		// ============================================================

		// --- OIDC AUTH (original implementation) ---
		const accessToken = authorizationHeader?.split(' ')[1]?.trim();

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
		// --- END OIDC AUTH ---
	}

	/**
	 * Handle mock sign-in when MOCK_AUTH_ENABLED=true
	 */
	private async handleMockSignIn(mockSignInDto?: MockSignInDto): Promise<UserDto> {
		if (!mockSignInDto || !mockSignInDto.email || !mockSignInDto.externalId) {
			throw new InvalidUserApiException();
		}

		const user = await this.authService.mockSignIn(mockSignInDto);

		if (!user) {
			throw new InvalidUserApiException();
		}

		return this.userMapper.toUserDto(user);
	}
}
