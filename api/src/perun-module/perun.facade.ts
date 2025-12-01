import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { DataSource } from 'typeorm';
import { Project } from 'resource-manager-database';
import { ProjectNotFoundApiException } from '../error-module/errors/projects/project-not-found.api-exception';
import { Group } from './entities/group.entity';
import { PerunGroupService } from './services/managers/perun-group.service';
import { PerunMembersService } from './services/managers/perun-members.service';

@Injectable()
export class PerunFacade {
	private readonly logger = new Logger(PerunFacade.name);
	private readonly isMockAuthEnabled: boolean;

	constructor(
		private readonly dataSource: DataSource,
		private readonly perunGroupService: PerunGroupService,
		private readonly perunMembersService: PerunMembersService,
		private readonly configService: ConfigService,
		@InjectQueue('perunGroup') private readonly perunQueue: Queue,
		@InjectQueue('perunInvitations') private readonly perunInvitationQueue: Queue
	) {
		const mockAuthValue = this.configService.get('MOCK_AUTH_ENABLED');
		// Handle both boolean and string values
		this.isMockAuthEnabled = mockAuthValue === true || mockAuthValue === 'true';
		this.logger.log(
			`PerunFacade initialized with MOCK_AUTH_ENABLED=${mockAuthValue}, isMockAuthEnabled=${this.isMockAuthEnabled}`
		);
	}

	async createGroup(projectId: number, title: string, description: string): Promise<Group> {
		this.logger.log(`createGroup called: projectId=${projectId}, isMockAuthEnabled=${this.isMockAuthEnabled}`);
		// Skip Perun API call when mock auth is enabled
		if (this.isMockAuthEnabled) {
			this.logger.log(`Mock mode: Skipping Perun createGroup for project ${projectId}`);
			// Return a mock group with projectId as the perunId
			return { id: projectId, name: title, description } as Group;
		}

		const group = await this.perunGroupService.createGroup(title, description);
		await this.perunQueue.add('groupSettings', { group, projectId });

		return group;
	}

	async synchronize(projectId: number): Promise<void> {
		// Skip Perun API call when mock auth is enabled
		if (this.isMockAuthEnabled) {
			this.logger.debug(`Mock mode: Skipping Perun synchronize for project ${projectId}`);
			return;
		}

		const project = await this.dataSource.getRepository(Project).findOne({
			where: {
				id: projectId
			}
		});

		if (!project) {
			throw new ProjectNotFoundApiException();
		}

		const group = await this.perunGroupService.getGroupById(project.perunId);
		await this.perunQueue.add('synchronize', { group, projectId });
	}

	async inviteMembers(userToken: string, emails: string[], projectId: number) {
		// Skip Perun API call when mock auth is enabled
		if (this.isMockAuthEnabled) {
			this.logger.debug(
				`Mock mode: Skipping Perun inviteMembers for project ${projectId}, emails: ${emails.join(', ')}`
			);
			return;
		}

		const project = await this.dataSource.getRepository(Project).findOne({
			where: {
				id: projectId
			}
		});

		if (!project) {
			throw new ProjectNotFoundApiException();
		}

		await this.perunInvitationQueue.add('invite', {
			userToken,
			emails,
			groupId: project.perunId,
			externalProjectId: project.perunId
		});
	}

	async isUserInGroup(groupId: number, externalId: string): Promise<boolean> {
		// Skip Perun API call when mock auth is enabled - assume user is in group
		if (this.isMockAuthEnabled) {
			this.logger.debug(`Mock mode: Skipping Perun isUserInGroup check for group ${groupId}, returning true`);
			return true;
		}

		const member = await this.perunMembersService.findMemberByExternalId(externalId);
		return this.perunGroupService.isGroupMember(groupId, member.id);
	}
}
