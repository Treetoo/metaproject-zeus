import { ApiProperty } from '@nestjs/swagger';
import { UserDto } from '../../users-module/dtos/user.dto';

/**
 * DTO for a project in user preview
 */
export class MockUserProjectDto {
	@ApiProperty({
		description: 'Project ID',
		example: 1
	})
	id: number;

	@ApiProperty({
		description: 'Project title',
		example: 'My Research Project'
	})
	title: string;

	@ApiProperty({
		description: 'Project status',
		example: 'active'
	})
	status: string;

	@ApiProperty({
		description: 'User role in this project (pi, manager, or user)',
		example: 'pi'
	})
	role: string;

	@ApiProperty({
		description: 'Additional member role if user is both PI and member',
		example: 'manager',
		required: false
	})
	memberRole?: string;

	@ApiProperty({
		description: 'Whether this is a personal project',
		example: false
	})
	isPersonal: boolean;
}

/**
 * DTO for full user preview including projects
 */
export class MockUserPreviewDto {
	@ApiProperty({
		description: 'User data',
		type: UserDto
	})
	user: UserDto;

	@ApiProperty({
		description: 'Projects the user is associated with',
		type: [MockUserProjectDto]
	})
	projects: MockUserProjectDto[];
}
