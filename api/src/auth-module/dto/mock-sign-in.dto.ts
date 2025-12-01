import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

/**
 * DTO for mock sign-in when MOCK_AUTH_ENABLED=true
 * Used to create/update users without OIDC authentication
 */
export class MockSignInDto {
	@ApiProperty({
		description: 'External ID for the user (simulates Perun sub)',
		example: 'mock-user-123'
	})
	@IsString()
	@IsNotEmpty()
	externalId: string;

	@ApiProperty({
		description: 'Username for the user',
		example: 'testuser'
	})
	@IsString()
	@IsNotEmpty()
	username: string;

	@ApiProperty({
		description: 'Email address for the user',
		example: 'test@example.com'
	})
	@IsEmail()
	@IsNotEmpty()
	email: string;

	@ApiProperty({
		description: 'Full name of the user',
		example: 'Test User'
	})
	@IsString()
	@IsNotEmpty()
	name: string;

	@ApiProperty({
		description: 'Role of the user',
		enum: ['admin', 'director', 'user'],
		example: 'user'
	})
	@IsString()
	@IsIn(['admin', 'director', 'user'])
	role: 'admin' | 'director' | 'user';

	@ApiProperty({
		description: 'Optional locale for the user',
		example: 'en',
		required: false
	})
	@IsString()
	@IsOptional()
	locale?: string;
}
