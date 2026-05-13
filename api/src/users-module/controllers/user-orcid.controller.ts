import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserDto } from '../dtos/user.dto';
import { RequestUser } from '../../auth-module/decorators/user.decorator';
import { MinRoleCheck } from '../../permission-module/decorators/min-role.decorator';
import { RoleEnum } from '../../permission-module/models/role.enum';
import { UsersModel } from '../models/users.model';

interface UserInfoResponse {
	id: number;
	username: string;
	name: string;
	email: string;
}

interface CurrentUserResponse {
	id: number;
	username: string;
	name: string;
	email: string;
	locale: string;
	source: string;
	externalId: string;
	orcid: string[];
}

@Controller('/users')
@ApiTags('Users')
export class UserOrcidController {
	constructor(private readonly usersModel: UsersModel) {}

	@Get('me')
	@MinRoleCheck(RoleEnum.USER)
	@ApiOperation({
		summary: 'Get current authenticated user info.',
		description: 'Returns the profile of the currently authenticated user.'
	})
	@ApiOkResponse({
		description: 'Current user info.',
		schema: {
			type: 'object',
			properties: {
				id: { type: 'number', example: 1 },
				username: { type: 'string', example: 'johndoe' },
				name: { type: 'string', example: 'John Doe' },
				email: { type: 'string', example: 'johndoe@mail.muni.cz' },
				locale: { type: 'string', example: 'en' },
				source: { type: 'string', example: 'perun' },
				externalId: { type: 'string', example: 'abc123' },
				orcid: { type: 'array', items: { type: 'string' }, example: [['0000-0002-3237-9305']] }
			}
		}
	})
	public async getCurrentUser(@RequestUser() user: UserDto): Promise<CurrentUserResponse> {
		return {
			id: user.id,
			username: user.username,
			name: user.name,
			email: user.email,
			locale: user.locale,
			source: user.source,
			externalId: user.externalId,
			orcid: user.orcid || []
		};
	}

	@Get('orcid')
	@MinRoleCheck(RoleEnum.USER)
	@ApiOperation({
		summary: "Get current user's ORCIDs.",
		description: 'Returns all ORCIDs associated with the authenticated user.'
	})
	@ApiOkResponse({
		description: 'User ORCIDs.',
		schema: {
			type: 'object',
			properties: {
				orcid: {
					type: 'array',
					items: { type: 'string' },
					example: ['0000-0002-3237-9305']
				}
			}
		}
	})
	public async getUserOrcid(@RequestUser() user: UserDto) {
		return { orcid: user.orcid || [] };
	}

	@Get()
	@MinRoleCheck(RoleEnum.USER)
	@ApiOperation({
		summary: 'Search users',
		description: 'Search for users by name, username, or email. Requires at least 3 characters in query.'
	})
	@ApiOkResponse({
		description: 'List of matching users.',
		schema: {
			type: 'object',
			properties: {
				users: {
					type: 'array',
					items: {
						type: 'object',
						properties: {
							id: { type: 'number' },
							username: { type: 'string' },
							name: { type: 'string' },
							email: { type: 'string' }
						}
					}
				}
			}
		}
	})
	public async searchUsers(@Query('query') query: string) {
		if (!query || query.length < 3) {
			return { users: [] };
		}

		const users = await this.usersModel.searchUsers(query);

		const userInfo: UserInfoResponse[] = users.map((u) => ({
			id: u.id,
			username: u.username,
			name: u.name,
			email: u.email
		}));

		return { users: userInfo };
	}
}
