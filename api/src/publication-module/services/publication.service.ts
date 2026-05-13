import { randomUUID } from 'crypto';
import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { Publication, PublicationCredit, PublicationStakeholder } from 'resource-manager-database';
import { ApiException } from 'src/error-module/api-exception';
import { PublicationInputDto } from '../dto/input/publication-input.dto';
import { AssignPublicationDto, CreateOwnedPublicationDto } from '../dto/input/publication-assign.dto';
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
import { PublicationAlreadyPresentApiException } from '../../error-module/errors/publications/publication-already-present.api-exception';
import { PublicationAlreadyCreditedApiException } from '../../error-module/errors/publications/publication-already-credited.api-exception';
import { PublicationUpdateNotAllowedApiException } from '../../error-module/errors/publications/publication-update-not-allowed.api-exception';
import { PublicationNotFoundInSearchApiException } from '../../error-module/errors/publications/publication-not-found-in-search.api-exception';
import { PublicationIdentifierTypeDto } from '../dto/identifier-type.dto';
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
	) { }

	async getUserPublications(
		userId: number,
		pagination: Pagination,
		sorting: Sorting | null,
		status?: string,
		search?: string
	) {
		return this.publicationModel.getUserPublications(userId, pagination, sorting, status, search);
	}

	async getUserCreditedPublications(
		userId: number,
		pagination: Pagination,
		sorting: Sorting | null,
		status?: string,
		search?: string
	) {
		return this.publicationModel.getUserCreditedPublications(userId, pagination, sorting, status, search);
	}

	async getUserStakeholderPublications(
		userId: number,
		pagination: Pagination,
		sorting: Sorting | null,
		status?: string,
		search?: string
	) {
		return this.publicationModel.getUserStakeholderPublications(userId, pagination, sorting, status, search);
	}

	async getAllPublicationsWithCreditStatus(
		userId: number,
		pagination: Pagination,
		sorting: Sorting | null,
		status?: string,
		search?: string
	) {
		return this.publicationModel.getAllPublicationsWithCreditStatus(userId, pagination, sorting, status, search);
	}

	async addCreditRequest(requestingUserId: number, publicationId: number) {
		const publication = await this.publicationModel.findById(publicationId);
		if (!publication) {
			throw new PublicationNotFoundApiException();
		}

		// Validate that the user is not trying to request credit for someone else
		// The requestingUserId is from the authenticated token, so they can only request credit for themselves
		const existingCredit = await this.dataSource
			.createQueryBuilder()
			.select()
			.from(PublicationCredit, 'pc')
			.where('pc.publicationId = :publicationId', { publicationId })
			.andWhere('pc.userId = :userId', { userId: requestingUserId })
			.getOne();

		if (existingCredit) {
			if (existingCredit.status === 'approved') {
				throw new PublicationAlreadyCreditedApiException();
			}
			// If pending or rejected, allow re-requesting
			return;
		}

		await this.dataSource
			.createQueryBuilder()
			.insert()
			.into(PublicationCredit)
			.values({
				publicationId,
				userId: requestingUserId,
				status: 'pending'
			})
			.execute();
	}

	async getPublicationByIdentifier(identifier: string, type: PublicationIdentifierTypeDto = 'unknown') {
		if (type === 'unknown') {
			type = IdentifierDetectionService.detectPublicationIdType(identifier);
		}

		if (type === 'unknown') {
			throw new ApiException(
				400,
				'Unknown identifier type. Please specify the identifier type (DOI, PMID, ISBN, etc.) and try again.',
				400
			);
		}

		try {
			return await this.apiPublicationService.getPublicationByIdAndType(identifier, type);
		} catch (error) {
			if (error instanceof PublicationNotFoundApiException) {
				throw new PublicationNotFoundInSearchApiException(
					`No publication found for the provided ${type} identifier. Please verify the identifier and try again.`
				);
			}
			throw error;
		}
	}

	async updateOwnedPublication(userId: number, publicationId: number, input: CreateOwnedPublicationDto) {
		const publication = await this.publicationModel.findOwnedByUser(publicationId, userId);
		if (!publication) {
			throw new PublicationNotFoundApiException();
		}

		if (publication.status === 'approved') {
			throw new PublicationUpdateNotAllowedApiException();
		}

		await this.dataSource
			.createQueryBuilder()
			.update(Publication)
			.set({
				title: input.title,
				author: input.authors,
				year: input.year,
				journal: input.journal,
				url: input.url,
				status: 'pending'
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

				// Handle creditors (which includes fair share and stakeholders)
				if (input.creditors && input.creditors.length > 0) {
					// Create credit records for all creditors
					const creditValues = input.creditors.map((c) => ({
						publicationId,
						userId: c.userId,
						status: 'approved' as const
					}));
					if (creditValues.length > 0) {
						await manager
							.createQueryBuilder()
							.insert()
							.into(PublicationCredit)
							.values(creditValues)
							.orIgnore()
							.execute();
					}

					// Create stakeholder records for users with fairShareEligible = true
					const stakeholderValues = input.creditors
						.filter((c) => c.fairShareEligible)
						.map((c) => ({
							publicationId,
							userId: c.userId,
							status: 'approved' as const
						}));
					if (stakeholderValues.length > 0) {
						await manager
							.createQueryBuilder()
							.insert()
							.into(PublicationStakeholder)
							.values(stakeholderValues)
							.orIgnore()
							.execute();
					}
				}

				await this.resetLegacyProjectColumn(publicationId, manager);
			});

			return publicationId;
		} catch (error) {
			if (error.code === '23505') {
				throw new PublicationAlreadyPresentApiException();
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
			.from(PublicationCredit)
			.where('publicationId = :publicationId', { publicationId })
			.execute();

		await this.dataSource
			.createQueryBuilder()
			.delete()
			.from(PublicationStakeholder)
			.where('publicationId = :publicationId', { publicationId })
			.execute();

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
