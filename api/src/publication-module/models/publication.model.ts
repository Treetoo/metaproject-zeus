import { Injectable } from '@nestjs/common';
import { Publication, PublicationCredit } from 'resource-manager-database';
import { DataSource, EntityManager } from 'typeorm';
import { Pagination } from '../../config-module/decorators/get-pagination';
import { Sorting } from '../../config-module/decorators/get-sorting';

@Injectable()
export class PublicationModel {
	constructor(private readonly dataSource: DataSource) {}

	async findById(publicationId: number, manager?: EntityManager): Promise<Publication | null> {
		const runner = manager ?? this.dataSource.manager;
		return runner.getRepository(Publication).findOne({
			where: { id: publicationId }
		});
	}

	async getUserPublications(
		ownerId: number,
		pagination: Pagination,
		sorting: Sorting | null,
		status?: string,
		search?: string,
		manager?: EntityManager
	) {
		const runner = manager ?? this.dataSource.manager;
		const publicationsBuilder = runner
			.createQueryBuilder()
			.select('p')
			.from(Publication, 'p')
			.where('p.ownerId = :ownerId', { ownerId })
			.offset(pagination.offset)
			.limit(pagination.limit);

		if (status && status !== 'all') {
			publicationsBuilder.andWhere('p.status = :status', { status });
		}

		if (search?.trim()) {
			publicationsBuilder.andWhere(
				'(LOWER(p.title) LIKE LOWER(:search) OR LOWER(p.author) LIKE LOWER(:search) OR LOWER(p.journal) LIKE LOWER(:search))',
				{ search: `%${search.trim().toLowerCase()}%` }
			);
		}

		if (sorting) {
			switch (sorting.columnAccessor) {
				case 'year':
					publicationsBuilder.orderBy('p.year', sorting.direction);
					break;
				default:
					publicationsBuilder.orderBy('p.id', sorting.direction);
			}
		}

		return publicationsBuilder.getManyAndCount();
	}

	async findOwnedByUser(
		publicationId: number,
		ownerId: number,
		manager?: EntityManager
	): Promise<Publication | null> {
		const runner = manager ?? this.dataSource.manager;
		return runner
			.createQueryBuilder()
			.select('p')
			.from(Publication, 'p')
			.where('p.id = :publicationId AND p.ownerId = :ownerId', { publicationId, ownerId })
			.getOne();
	}

	async findByOwnerAndUniqueId(
		ownerId: number,
		uniqueId: string,
		manager?: EntityManager
	): Promise<Publication | null> {
		const runner = manager ?? this.dataSource.manager;
		return runner
			.createQueryBuilder()
			.select('p')
			.from(Publication, 'p')
			.where('p.ownerId = :ownerId AND p.uniqueId = :uniqueId', { ownerId, uniqueId })
			.getOne();
	}

	async getUserCreditedPublications(
		userId: number,
		pagination: Pagination,
		sorting: Sorting | null,
		status?: string,
		search?: string,
		manager?: EntityManager
	) {
		const runner = manager ?? this.dataSource.manager;
		const publicationsBuilder = runner
			.createQueryBuilder()
			.select('p')
			.from(Publication, 'p')
			.innerJoin(PublicationCredit, 'pc', 'pc.publicationId = p.id')
			.where('pc.userId = :userId', { userId })
			.offset(pagination.offset)
			.limit(pagination.limit);

		if (status && status !== 'all') {
			publicationsBuilder.andWhere('p.status = :status', { status });
		}

		if (search?.trim()) {
			publicationsBuilder.andWhere(
				'(LOWER(p.title) LIKE LOWER(:search) OR LOWER(p.author) LIKE LOWER(:search) OR LOWER(p.journal) LIKE LOWER(:search))',
				{ search: `%${search.trim().toLowerCase()}%` }
			);
		}

		if (sorting) {
			switch (sorting.columnAccessor) {
				case 'year':
					publicationsBuilder.orderBy('p.year', sorting.direction);
					break;
				default:
					publicationsBuilder.orderBy('p.id', sorting.direction);
			}
		}

		return publicationsBuilder.getManyAndCount();
	}
}
