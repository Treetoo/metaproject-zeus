import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserDto } from '../dtos/user.dto';
import { RequestUser } from '../../auth-module/decorators/user.decorator';
import { MinRoleCheck } from '../../permission-module/decorators/min-role.decorator';
import { RoleEnum } from '../../permission-module/models/role.enum';

@Controller('/users')
@ApiTags('Users')
export class UserOrcidController {
	constructor() {}

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
}
