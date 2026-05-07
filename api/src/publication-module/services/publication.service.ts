import { randomUUID } from 'crypto';
import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { Publication } from 'resource-manager-database';
import { ApiException } from 'src/error-module/api-exception';
import { PublicationInputDto } from '../dto/input/publication-input.dto';
import {
	AssignPublicationDto,
	CreateOwnedPublicationDto,
	CreateOwnedPublicationByIdDto
} from '../dto/input/publication-assign.dto';
import { ProjectPermissionService } from '../../project-module/services/project-permission.service';
import { ProjectPermissionEnum } from '../../project-module/enums/project-permission.enum';
import { ProjectNotFoundApiException } from '../../error-module/errors/projects/project-not-found.api-exception';
import { ProjectModel } from '../../project-module/models/project.model';
import { Pagination } from '../../config-module/decorators/get-pagination';
import { Sorting } from '../../config-module/decorators/get-sorting';
import { PublicationModel } from '../models/publication.model';
import { ProjectPublicationModel } from '../models/project-publication.model';
import { PublicationNotFoundApiException } from '../../error-module/errors/publications/publication-not-found.api-exception';
import { PublicationRequiresProjectContextApiException } from '../../error-module/errors/publications/publication-requires-project-context.api-exception';
import { IdentifierDetectionService } from './identifier-detection.service';
import { ApiPublicationService } from './api-publication.service';

@Injectable()
export class PublicationService {
	constructor(
		private readonly projectPermissionService: ProjectPermissionService,
		private readonly dataSource: DataSource,
		private readonly projectModel: ProjectModel,
		private readonly publicationModel: PublicationModel,
		private readonly projectPublicationModel: ProjectPublicationModel,
		private readonly apiPublicationService: ApiPublicationService
	) {}

	async getUserPublications(userId: number, pagination: Pagination, sorting: Sorting | null) {
		return this.publicationModel.getUserPublications(userId, pagination, sorting);
	}

	async createOwnedPublicationById(
		userId: number,
		input: CreateOwnedPublicationByIdDto,
		isStepUp: boolean
	): Promise<number> {
		if (input.type !== 'unknown') {
			return this.createBySpecificType(userId, input, isStepUp);
		}

		input.type = IdentifierDetectionService.detectPublicationIdType(input.uniqueId);

		if (input.type !== 'unknown') {
			return this.createBySpecificType(userId, input, isStepUp);
		}
		throw new ApiException(400, 'Unable to detect type from identifier.', 400);
	}

	private async createBySpecificType(userId: number, input: CreateOwnedPublicationByIdDto, isStepUp: boolean) {
		if (input.type === 'unknown') {
			throw new PublicationNotFoundApiException();
		}
		const externalData = await this.apiPublicationService.getPublicationByIdAndType(input.uniqueId, input.type);

		if (!externalData) {
			throw new PublicationNotFoundApiException();
		}

		return this.createOwnedPublication(
			userId,
			{
				...externalData,
				source: input.type,
				project: { projectId: input.project.projectId },
				uniqueId: input.uniqueId
			},
			isStepUp
		);
	}

	async updateOwnedPublication(userId: number, publicationId: number, input: CreateOwnedPublicationDto) {
		const publication = await this.publicationModel.findOwnedByUser(publicationId, userId);
		if (!publication) {
			throw new PublicationNotFoundApiException();
		}

		if (publication.status === 'approved') {
			throw new ApiException(403, 'Cannot update an approved publication.', 403);
		}

		await this.dataSource
			.createQueryBuilder()
			.update(Publication)
			.set({
				title: input.title,
				author: input.authors,
				year: input.year,
				journal: input.journal,
				url: input.url
			})
			.where('id = :id AND ownerId = :ownerId', { id: publicationId, ownerId: userId })
			.execute();
	}

	async createOwnedPublication(userId: number, input: CreateOwnedPublicationDto, isStepUp: boolean) {
		try {
			let publicationId;
			await this.dataSource.transaction(async (manager) => {
				const result = await manager
					.createQueryBuilder()
					.insert()
					.into(Publication)
					.values({
						ownerId: userId,
						title: input.title,
						author: input.authors,
						year: input.year,
						journal: input.journal,
						source: input.source,
						url: input.url,
						uniqueId: input.source !== 'manual' ? input.source + ':' + input.uniqueId : randomUUID(),
						projectId: null as any
					} as any)
					.execute();

				publicationId = result.identifiers[0]?.['id'];

				await this.projectPermissionService.validateUserPermissions(
					manager,
					input.project.projectId,
					userId,
					ProjectPermissionEnum.EDIT_PUBLICATIONS,
					isStepUp
				);

				await this.projectPublicationModel.linkPublication(
					input.project.projectId,
					publicationId,
					userId,
					manager
				);
				await this.resetLegacyProjectColumn(publicationId, manager);
			});

			return publicationId;
		} catch (error) {
			if (error.code === '23505') {
				throw new ApiException(409, 'Publication is already present', 409);
			}
			throw error;
		}
	}

	async assignOwnedPublication(userId: number, publicationId: number, dto: AssignPublicationDto, isStepUp: boolean) {
		const publication = await this.publicationModel.findOwnedByUser(publicationId, userId);
		if (!publication) {
			throw new PublicationNotFoundApiException();
		}

		await this.dataSource.transaction(async (manager) => {
			await this.projectPermissionService.validateUserPermissions(
				manager,
				dto.projectId,
				userId,
				ProjectPermissionEnum.EDIT_PUBLICATIONS,
				isStepUp
			);

			await this.projectPublicationModel.linkPublication(dto.projectId, publicationId, userId, manager);
			await this.resetLegacyProjectColumn(publicationId, manager);
		});
	}

	async getProjectPublications(
		projectId: number,
		userId: number,
		pagination: Pagination,
		sorting: Sorting | null,
		isStepUp: boolean
	) {
		const userPermissions = await this.projectPermissionService.getUserPermissions(projectId, userId, isStepUp);
		const project = await this.projectModel.getProject(projectId);

		if (!userPermissions.has(ProjectPermissionEnum.VIEW_PROJECT) || !project) {
			throw new ProjectNotFoundApiException();
		}

		const [links, count] = await this.projectPublicationModel.getProjectPublications(
			projectId,
			pagination,
			sorting
		);
		const publications = links.map((link) => {
			return link['publication'];
		});
		return [publications, count] as [Publication[], number];
	}

	async deleteProjectPublication(publicationId: number, userId: number, isStepUp: boolean) {
		const publication = await this.publicationModel.findById(publicationId);

		if (!publication) {
			throw new PublicationNotFoundApiException();
		}

		await this.ensureLegacyLink(publication);

		const link = await this.projectPublicationModel.getSingleLinkForPublication(publicationId);
		if (!link) {
			throw new PublicationNotFoundApiException();
		}

		const linkCount = await this.projectPublicationModel.countLinksForPublication(publicationId);
		if (linkCount > 1) {
			throw new PublicationRequiresProjectContextApiException();
		}

		const permissions = await this.projectPermissionService.getUserPermissions(link.projectId, userId, isStepUp);

		if (!permissions.has(ProjectPermissionEnum.EDIT_PUBLICATIONS)) {
			throw new PublicationNotFoundApiException();
		}

		await this.projectPublicationModel.unlinkPublication(link.projectId, publicationId);
		await this.resetLegacyProjectColumn(publicationId);
	}

	async deleteProjectPublicationFromProject(
		projectId: number,
		publicationId: number,
		userId: number,
		isStepUp: boolean
	) {
		const publication = await this.publicationModel.findById(publicationId);

		if (!publication) {
			throw new PublicationNotFoundApiException();
		}

		await this.ensureLegacyLink(publication, projectId);
		const link = await this.projectPublicationModel.findLink(projectId, publicationId);
		if (!link) {
			throw new PublicationNotFoundApiException();
		}

		const permissions = await this.projectPermissionService.getUserPermissions(projectId, userId, isStepUp);
		if (!permissions.has(ProjectPermissionEnum.EDIT_PUBLICATIONS)) {
			throw new PublicationNotFoundApiException();
		}

		await this.projectPublicationModel.unlinkPublication(projectId, publicationId);
		await this.resetLegacyProjectColumn(publicationId);
	}

	async deleteOwnedPublication(publicationId: number, userId: number) {
		const publication = await this.publicationModel.findOwnedByUser(publicationId, userId);
		if (!publication) {
			throw new PublicationNotFoundApiException();
		}

		await this.dataSource
			.createQueryBuilder()
			.delete()
			.from(Publication)
			.where('id = :id', { id: publicationId })
			.execute();
	}

	async addPublicationToProject(
		userId: number,
		projectId: number,
		publications: PublicationInputDto[],
		isStepUp: boolean
	): Promise<void> {
		await this.dataSource.transaction(async (manager) => {
			await this.projectPermissionService.validateUserPermissions(
				manager,
				projectId,
				userId,
				ProjectPermissionEnum.EDIT_PUBLICATIONS,
				isStepUp
			);

			// add or reuse publications for the project
			for (const publication of publications) {
				const uniqueId =
					publication.source === 'doi' && publication.uniqueId ? publication.uniqueId : randomUUID();
				// Try to reuse if same DOI exists for this owner
				const existing = publication.uniqueId
					? await this.publicationModel.findByOwnerAndUniqueId(userId, publication.uniqueId)
					: null;

				if (existing) {
					await this.projectPublicationModel.linkPublication(projectId, existing.id, userId, manager);
					await this.resetLegacyProjectColumn(existing.id, manager);
				} else {
					const result = await manager
						.createQueryBuilder()
						.insert()
						.into(Publication)
						.values({
							ownerId: userId,
							title: publication.title,
							author: publication.authors,
							year: publication.year,
							journal: publication.journal,
							source: publication.source,
							uniqueId,
							projectId: null as any
						} as any)
						.execute();

					const newId = result.identifiers[0]?.['id'];
					if (newId) {
						await this.projectPublicationModel.linkPublication(projectId, newId, userId, manager);
					}
				}
			}
		});
	}

	private async ensureLegacyLink(publication: Publication, projectId?: number, manager?: EntityManager) {
		if (publication.projectId == null) {
			return;
		}

		const targetProjectId = projectId ?? publication.projectId;
		await this.projectPublicationModel.linkPublication(
			targetProjectId,
			publication.id,
			publication.ownerId,
			manager
		);
		await this.resetLegacyProjectColumn(publication.id, manager);
	}

	private async resetLegacyProjectColumn(publicationId: number, manager?: EntityManager) {
		const runner = manager ?? this.dataSource.manager;
		await runner
			.createQueryBuilder()
			.update(Publication)
			.set({ projectId: null as any })
			.where('id = :id', { id: publicationId })
			.execute();
	}
}
