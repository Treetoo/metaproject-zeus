import { Controller, Get, Patch, Param, ParseIntPipe, NotFoundException, Body } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiTags, ApiOkResponse, ApiNotFoundResponse, ApiBody } from '@nestjs/swagger';
import { DataSource } from 'typeorm';
import { Project, ProjectUser, ProjectUserStatus, Role, User } from 'resource-manager-database';
import { Public } from '../decorators/public.decorator';
import { UserMapper } from '../../users-module/services/user.mapper';
import { UserDto } from '../../users-module/dtos/user.dto';
import { MockUserProjectDto, MockUserPreviewDto } from '../dto/mock-user-preview.dto';

/**
 * Controller for mock auth endpoints - only active when MOCK_AUTH_ENABLED=true
 * These endpoints are used for the user preview feature in mock mode
 */
@Controller('mock')
@ApiTags('Mock Auth')
export class MockAuthController {
	constructor(
		private readonly dataSource: DataSource,
		private readonly userMapper: UserMapper,
		private readonly configService: ConfigService
	) {}

	/**
	 * Check if mock auth is enabled, throw if not
	 */
	private ensureMockAuthEnabled(): void {
		const mockAuthEnabled = this.configService.get<boolean>('MOCK_AUTH_ENABLED', false);
		if (!mockAuthEnabled) {
			throw new NotFoundException('Mock auth endpoints are not enabled');
		}
	}

	@Get('users/:id')
	@Public()
	@ApiOperation({
		summary: 'Get user by ID (mock mode only)',
		description: 'Returns user data by ID. Only available when MOCK_AUTH_ENABLED=true.'
	})
	@ApiOkResponse({
		description: 'User found',
		type: UserDto
	})
	@ApiNotFoundResponse({
		description: 'User not found or mock auth not enabled'
	})
	async getUserById(@Param('id', ParseIntPipe) id: number): Promise<UserDto> {
		this.ensureMockAuthEnabled();

		const user = await this.dataSource.getRepository(User).findOne({
			where: { id },
			relations: { role: true }
		});

		if (!user) {
			throw new NotFoundException(`User with ID ${id} not found`);
		}

		return this.userMapper.toUserDto(user);
	}

	@Get('users/:id/exists')
	@Public()
	@ApiOperation({
		summary: 'Check if user exists by ID (mock mode only)',
		description: 'Returns whether a user with the given ID exists. Only available when MOCK_AUTH_ENABLED=true.'
	})
	@ApiOkResponse({
		description: 'Existence check result',
		schema: {
			type: 'object',
			properties: {
				exists: { type: 'boolean' },
				id: { type: 'number' }
			}
		}
	})
	async checkUserExists(@Param('id', ParseIntPipe) id: number): Promise<{ exists: boolean; id: number }> {
		this.ensureMockAuthEnabled();

		const user = await this.dataSource.getRepository(User).findOne({
			where: { id },
			select: ['id']
		});

		return {
			exists: !!user,
			id
		};
	}

	@Get('users/:id/preview')
	@Public()
	@ApiOperation({
		summary: 'Get full user preview with projects (mock mode only)',
		description:
			'Returns user data along with their projects and roles. Only available when MOCK_AUTH_ENABLED=true.'
	})
	@ApiOkResponse({
		description: 'User preview with projects',
		type: MockUserPreviewDto
	})
	@ApiNotFoundResponse({
		description: 'User not found or mock auth not enabled'
	})
	async getUserPreview(@Param('id', ParseIntPipe) id: number): Promise<MockUserPreviewDto> {
		this.ensureMockAuthEnabled();

		const user = await this.dataSource.getRepository(User).findOne({
			where: { id },
			relations: { role: true }
		});

		if (!user) {
			throw new NotFoundException(`User with ID ${id} not found`);
		}

		// Get projects where user is a member (active status)
		const projectMemberships = await this.dataSource.getRepository(ProjectUser).find({
			where: {
				userId: id,
				status: ProjectUserStatus.ACTIVE
			},
			relations: {
				project: true
			}
		});

		// Get projects where user is the PI
		const piProjects = await this.dataSource.getRepository(Project).find({
			where: {
				piId: id
			}
		});

		// Combine and deduplicate projects
		const projectsMap = new Map<number, MockUserProjectDto>();

		// Add PI projects with 'pi' role
		for (const project of piProjects) {
			projectsMap.set(project.id, {
				id: project.id,
				title: project.title,
				status: project.status,
				role: 'pi',
				isPersonal: project.isPersonal
			});
		}

		// Add member projects (may override PI projects with their membership role)
		for (const membership of projectMemberships) {
			const existing = projectsMap.get(membership.projectId);
			if (existing) {
				// User is both PI and member, keep PI role but note membership
				existing.memberRole = membership.role;
			} else {
				projectsMap.set(membership.projectId, {
					id: membership.project.id,
					title: membership.project.title,
					status: membership.project.status,
					role: membership.role,
					isPersonal: membership.project.isPersonal
				});
			}
		}

		return {
			user: this.userMapper.toUserDto(user),
			projects: Array.from(projectsMap.values())
		};
	}

	@Patch('users/:id/role')
	@Public()
	@ApiOperation({
		summary: 'Update user role (mock mode only)',
		description:
			'Updates the role of a user in the database. Only available when MOCK_AUTH_ENABLED=true. This allows testing different permission levels.'
	})
	@ApiBody({
		schema: {
			type: 'object',
			properties: {
				role: {
					type: 'string',
					enum: ['user', 'director', 'admin'],
					description: 'The new role codename'
				}
			},
			required: ['role']
		}
	})
	@ApiOkResponse({
		description: 'User role updated successfully',
		type: UserDto
	})
	@ApiNotFoundResponse({
		description: 'User or role not found, or mock auth not enabled'
	})
	async updateUserRole(@Param('id', ParseIntPipe) id: number, @Body('role') roleCodeName: string): Promise<UserDto> {
		this.ensureMockAuthEnabled();

		// Validate role codename
		const validRoles = ['user', 'director', 'admin'];
		if (!validRoles.includes(roleCodeName)) {
			throw new NotFoundException(`Invalid role: ${roleCodeName}. Must be one of: ${validRoles.join(', ')}`);
		}

		// Find the role entity
		const role = await this.dataSource.getRepository(Role).findOne({
			where: { codeName: roleCodeName }
		});

		if (!role) {
			throw new NotFoundException(`Role with codeName '${roleCodeName}' not found in database`);
		}

		// Find the user
		const user = await this.dataSource.getRepository(User).findOne({
			where: { id },
			relations: { role: true }
		});

		if (!user) {
			throw new NotFoundException(`User with ID ${id} not found`);
		}

		// Update the user's role
		user.role = role;
		await this.dataSource.getRepository(User).save(user);

		// Reload with relations for response
		const updatedUser = await this.dataSource.getRepository(User).findOne({
			where: { id },
			relations: { role: true }
		});

		return this.userMapper.toUserDto(updatedUser!);
	}
}
