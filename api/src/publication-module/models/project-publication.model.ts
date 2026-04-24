import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { Publication, ProjectPublication } from 'resource-manager-database';
import { Pagination } from '../../config-module/decorators/get-pagination';
import { Sorting } from '../../config-module/decorators/get-sorting';

@Injectable()
export class ProjectPublicationModel {
	constructor(private readonly dataSource: DataSource) {}

	async linkPublication(projectId: number, publicationId: number, addedByUserId: number, manager?: EntityManager) {
		const runner = manager ?? this.dataSource.manager;
		await runner
			.createQueryBuilder()
			.insert()
			.into(ProjectPublication)
			.values({ projectId, publicationId, addedByUserId } as any)
			.orIgnore()
			.execute();
	}

	async unlinkPublication(projectId: number, publicationId: number, manager?: EntityManager) {
		const runner = manager ?? this.dataSource.manager;
		return runner
			.createQueryBuilder()
			.delete()
			.from(ProjectPublication)
			.where('projectId = :projectId AND publicationId = :publicationId', { projectId, publicationId })
			.execute();
	}

	async findLink(
		projectId: number,
		publicationId: number,
		manager?: EntityManager
	): Promise<ProjectPublication | null> {
		const runner = manager ?? this.dataSource.manager;
		return runner.getRepository(ProjectPublication).findOne({ where: { projectId, publicationId } });
	}

	async getProjectPublications(
		projectId: number,
		pagination: Pagination,
		sorting: Sorting | null,
		manager?: EntityManager
	) {
		await this.ensureLegacyLinks(projectId, manager);

		const runner = manager ?? this.dataSource.manager;
		const builder = runner
			.createQueryBuilder(ProjectPublication, 'pp')
			.innerJoinAndSelect('pp.publication', 'publication')
			.where('pp.projectId = :projectId', { projectId })
			.offset(pagination.offset)
			.limit(pagination.limit);

		if (sorting) {
			switch (sorting.columnAccessor) {
				case 'year':
					builder.orderBy('publication.year', sorting.direction);
					break;
				default:
					builder.orderBy('publication.id', sorting.direction);
			}
		}

		return builder.getManyAndCount();
	}

	async countLinksForPublication(publicationId: number, manager?: EntityManager): Promise<number> {
		const runner = manager ?? this.dataSource.manager;
		return runner.getRepository(ProjectPublication).count({ where: { publicationId } });
	}

	async getSingleLinkForPublication(
		publicationId: number,
		manager?: EntityManager
	): Promise<ProjectPublication | null> {
		const runner = manager ?? this.dataSource.manager;
		return runner
			.createQueryBuilder(ProjectPublication, 'pp')
			.where('pp.publicationId = :publicationId', { publicationId })
			.getOne();
	}

	private async ensureLegacyLinks(projectId: number, manager?: EntityManager) {
		const runner = manager ?? this.dataSource.manager;
		const legacyPublications = await runner.getRepository(Publication).find({ where: { projectId } });

		if (!legacyPublications.length) {
			return;
		}

		for (const publication of legacyPublications) {
			await this.linkPublication(projectId, publication.id, publication.ownerId, runner);
			await runner
				.createQueryBuilder()
				.update(Publication)
				.set({ projectId: null as any })
				.where('id = :id', { id: publication.id })
				.execute();
		}
	}
}
