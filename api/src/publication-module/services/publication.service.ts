import { randomUUID } from 'crypto';
import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { Publication } from 'resource-manager-database';
import { PublicationInputDto } from '../dto/input/publication-input.dto';
import { AssignPublicationDto, CreateOwnedPublicationDto, CreateOwnedPublicationByIdDto } from '../dto/input/publication-assign.dto';
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
import { PublicationIdentifierTypeDto } from '../dto/identifier-type.dto'
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
	) { }

	async getUserPublications(userId: number, pagination: Pagination, sorting: Sorting | null) {
		return this.publicationModel.getUserPublications(userId, pagination, sorting);
	}



	async createOwnedPublicationById(userId: number, input: CreateOwnedPublicationByIdDto): Promise<number> {
		if (input.type !== 'unknown') {
			return this.createBySpecificType(userId, input.uniqueId, input.type);
		}

		input.type = IdentifierDetectionService.detect(input.uniqueId);
		return this.createBySpecificType(userId, input.uniqueId, input.type);

	}

	private async createBySpecificType(userId: number, uniqueId: string, type: PublicationIdentifierTypeDto) {
		if (type === 'unknown') {
			console.log("Invalid type")
			throw new PublicationNotFoundApiException();
		}
		console.log(uniqueId)
		console.log(type)
		const externalData = await this.apiPublicationService.getPublicationByIdAndType(uniqueId, type);
		console.log(externalData)

		if (!externalData) {
			throw new PublicationNotFoundApiException();
		}

		return this.createOwnedPublication(userId, {
			...externalData,
			source: type,
			uniqueId: uniqueId
		});
	}


	async updateOwnedPublication(userId: number, publicationId: number, input: CreateOwnedPublicationDto) {
		const publication = await this.publicationModel.findOwnedByUser(publicationId, userId);
		if (!publication) {
			throw new PublicationNotFoundApiException();
		}

		await this.dataSource
			.createQueryBuilder()
			.update(Publication)
			.set({
				title: input.title,
				author: input.authors,
				year: input.year,
				journal: input.journal,
			})
			.where('id = :id AND ownerId = :ownerId', { id: publicationId, ownerId: userId })
			.execute();
	}

	async createOwnedPublication(userId: number, input: CreateOwnedPublicationDto): Promise<number> {
		const result = await this.dataSource
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
				uniqueId: input.source === 'doi' && input.uniqueId ? input.uniqueId : randomUUID()
			} as any)
			.execute();
		return result.identifiers[0]['id'] as number;
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
			let r = link['publication'];
			r.status = link['status'];
			return r;
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
