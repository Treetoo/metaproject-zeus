import { Injectable } from '@nestjs/common';
import { User } from 'resource-manager-database';
import { UserDto } from '../dtos/user.dto';

@Injectable()
export class UserMapper {
	toUserDto(user: User, forceUserRole?: boolean): UserDto {
		return {
			id: user.id,
			locale: user.locale,
			email: user.email,
			source: user.source,
			externalId: user.externalId,
			username: user.username,
			orcid: user?.orcids?.map((orcid) => orcid?.orcid || ''),
			name: user.name,
			role: forceUserRole ? 'user' : user?.role?.codeName
		};
	}
}
