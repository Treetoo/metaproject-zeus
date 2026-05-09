import { Injectable } from '@nestjs/common';
import { Brackets, DataSource } from 'typeorm';
import { Publication, PublicationCredit } from 'resource-manager-database';
import { ApiException } from '../../error-module/api-exception';
import { PublicationNotFoundApiException } from '../../error-module/errors/publications/publication-not-found.api-exception';
import { ApprovePublicationDto } from '../dto/input/approve-publication.dto';

@Injectable()
export class PublicationApprovalService {
	constructor(private dataSource: DataSource) {}

	async getPublicationRequests(
		pagination,
		sorting,
		status?: string,
		search?: string,
		timeFilter?: string,
		startDate?: string,
		endDate?: string
	) {
		const builder = this.dataSource.getRepository(Publication).createQueryBuilder('p');

		if (status && ['pending', 'approved', 'rejected'].includes(status)) {
			builder.where('p.status = :status', { status });
		} else {
			builder.where('1=1');
		}

		if (search && search.trim().length > 0) {
			const searchTerm = `%${search.toLowerCase()}%`;
			builder.andWhere(
				new Brackets((qb) =>
					qb
						.orWhere('LOWER(p.title) LIKE :searchTerm', { searchTerm })
						.orWhere('LOWER(p.author) LIKE :searchTerm', { searchTerm })
						.orWhere('LOWER(p.journal) LIKE :searchTerm', { searchTerm })
						.orWhere('LOWER(p.uniqueId) LIKE :searchTerm', { searchTerm })
				)
			);
		}

		if (startDate && !isNaN(Date.parse(startDate))) {
			builder.andWhere('p.time.createdAt >= :startDate', { startDate: new Date(startDate) });
		}

		if (endDate && !isNaN(Date.parse(endDate))) {
			builder.andWhere('p.time.createdAt <= :endDate', { endDate: new Date(endDate) });
		} else if (timeFilter && timeFilter !== 'all') {
			const now = new Date();
			let daysBack = 365;
			switch (timeFilter) {
				case '6months':
					daysBack = 180;
					break;
				case '1year':
					daysBack = 365;
					break;
				case '2years':
					daysBack = 730;
					break;
				case '3years':
					daysBack = 1095;
					break;
			}
			const cutoffDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);
			builder.andWhere('p.time.createdAt >= :cutoffDate', { cutoffDate });
		}

		const columnAccessor = sorting?.columnAccessor || 'id';
		const direction = sorting?.direction || 'ASC';
		const order = direction === 'DESC' ? 'DESC' : 'ASC';

		const sortFieldMap: Record<string, string> = {
			id: 'p.id',
			title: 'p.title',
			authors: 'p.author',
			journal: 'p.journal',
			year: 'p.year',
			createdAt: 'p.time.createdAt'
		};

		const sortField = sortFieldMap[columnAccessor] || sortFieldMap['id'];
		builder.addOrderBy(sortField, order);

		const page = pagination.page ?? 1;
		const limit = pagination.limit ?? 10;
		builder.skip((page - 1) * limit).take(limit);

		return builder.getManyAndCount();
	}

	async getAllPublicationsForExport(
		status?: string,
		search?: string,
		startDate?: string,
		endDate?: string
	): Promise<Publication[]> {
		const builder = this.dataSource.getRepository(Publication).createQueryBuilder('p');

		if (status && ['pending', 'approved', 'rejected'].includes(status)) {
			builder.where('p.status = :status', { status });
		} else {
			builder.where('1=1');
		}

		if (search && search.trim().length > 0) {
			const searchTerm = `%${search.toLowerCase()}%`;
			builder.andWhere(
				new Brackets((qb) =>
					qb
						.orWhere('LOWER(p.title) LIKE :searchTerm', { searchTerm })
						.orWhere('LOWER(p.author) LIKE :searchTerm', { searchTerm })
						.orWhere('LOWER(p.journal) LIKE :searchTerm', { searchTerm })
						.orWhere('LOWER(p.uniqueId) LIKE :searchTerm', { searchTerm })
				)
			);
		}

		if (startDate && !isNaN(Date.parse(startDate))) {
			builder.andWhere('p.time.createdAt >= :startDate', { startDate: new Date(startDate) });
		}

		if (endDate && !isNaN(Date.parse(endDate))) {
			builder.andWhere('p.time.createdAt <= :endDate', { endDate: new Date(endDate) });
		}

		builder.addOrderBy('p.id', 'ASC');

		return builder.getMany();
	}

	async exportPublications(
		status?: string,
		search?: string,
		startDate?: string,
		endDate?: string,
		fields?: string[]
	): Promise<{ headers: string[]; rows: string[][] }> {
		const publications = await this.getAllPublicationsForExport(status, search, startDate, endDate);

		const allFields = [
			{ key: 'title', label: 'Title' },
			{ key: 'authors', label: 'Authors' },
			{ key: 'journal', label: 'Journal' },
			{ key: 'year', label: 'Year' },
			{ key: 'uniqueId', label: 'ID' },
			{ key: 'status', label: 'Status' },
			{ key: 'createdAt', label: 'Created At' },
			{ key: 'reviewedAt', label: 'Reviewed At' },
			{ key: 'weight', label: 'Weight' },
			{ key: 'ownerId', label: 'Owner ID' }
		];

		const selectedFields = fields && fields.length > 0 ? fields : allFields.map((f) => f.key);
		const headers = allFields.filter((f) => selectedFields.includes(f.key)).map((f) => f.label);

		const rows = publications.map((pub) => {
			const row: string[] = [];
			for (const field of selectedFields) {
				let value: unknown;
				switch (field) {
					case 'title':
						value = pub.title ?? '';
						break;
					case 'authors':
						value = pub.author ?? '';
						break;
					case 'journal':
						value = pub.journal ?? '';
						break;
					case 'year':
						value = pub.year ?? '';
						break;
					case 'uniqueId':
						value = pub.uniqueId ?? '';
						break;
					case 'status':
						value = pub.status ?? '';
						break;
					case 'createdAt':
						value = pub.time?.createdAt ? new Date(pub.time.createdAt).toLocaleString() : '';
						break;
					case 'reviewedAt':
						value = pub.reviewedAt ? new Date(pub.reviewedAt).toLocaleString() : '';
						break;
					case 'weight':
						value = pub.weight ?? '';
						break;
					case 'ownerId':
						value = pub.ownerId ?? '';
						break;
					default:
						value = '';
				}
				const escapedValue = String(value).replace(/"/g, '""');
				row.push(`"${escapedValue}"`);
			}
			return row;
		});

		return { headers, rows };
	}

	async approvePublication(publicationId: number, reviewerId: number, approvalStatus: ApprovePublicationDto) {
		if (approvalStatus.weight === undefined || approvalStatus.weight < 1 || approvalStatus.weight > 3)
			throw new ApiException(400, 'Invalid or missing weight', 400);

		return this.dataSource.transaction(async (manager) => {
			await manager.update(Publication, publicationId, {
				status: 'approved',
				weight: approvalStatus.weight,
				reviewerId: reviewerId,
				reviewedAt: new Date(),
				reviewerNote: approvalStatus.reviewerNote ?? null
			});
		});
	}

	async rejectPublication(publicationId: number, reviewerId: number, approvalStatus: ApprovePublicationDto) {
		return this.dataSource.transaction(async (manager) => {
			const publication = await manager.findOne(Publication, { where: { id: publicationId } });

			if (!publication) {
				throw new PublicationNotFoundApiException();
			}

			await manager.update(Publication, publicationId, {
				status: 'rejected',
				reviewerNote: approvalStatus.reviewerNote ?? null,
				reviewerId: reviewerId,
				reviewedAt: new Date()
			});
		});
	}

	async getCreditRequests(
		pagination,
		sorting,
		status?: string,
		search?: string,
		timeFilter?: string,
		startDate?: string,
		endDate?: string
	) {
		// First get the count
		const countQuery = this.dataSource
			.createQueryBuilder()
			.select('COUNT(DISTINCT p.id)')
			.from(Publication, 'p')
			.innerJoin(PublicationCredit, 'pc', 'pc.publicationId = p.id');

		if (status && ['pending', 'approved', 'rejected'].includes(status)) {
			countQuery.where('pc.status = :status', { status });
		} else {
			countQuery.where('1=1');
		}

		if (search && search.trim().length > 0) {
			const searchTerm = `%${search.toLowerCase()}%`;
			countQuery.andWhere(
				new Brackets((qb) =>
					qb
						.orWhere('LOWER(p.title) LIKE :searchTerm', { searchTerm })
						.orWhere('LOWER(p.author) LIKE :searchTerm', { searchTerm })
						.orWhere('LOWER(p.journal) LIKE :searchTerm', { searchTerm })
						.orWhere('LOWER(p.uniqueId) LIKE :searchTerm', { searchTerm })
				)
			);
		}

		if (startDate && !isNaN(Date.parse(startDate))) {
			countQuery.andWhere('p.time.createdAt >= :startDate', { startDate: new Date(startDate) });
		}

		if (endDate && !isNaN(Date.parse(endDate))) {
			countQuery.andWhere('p.time.createdAt <= :endDate', { endDate: new Date(endDate) });
		}

		const countResult = await countQuery.getRawOne();
		const count = parseInt(countResult?.['count'] || '0');

		// Then get the data
		const dataQuery = this.dataSource
			.createQueryBuilder()
			.select('p')
			.addSelect('pc.status', 'creditStatus')
			.addSelect('pc.userId', 'requestedBy')
			.from(Publication, 'p')
			.innerJoin(PublicationCredit, 'pc', 'pc.publicationId = p.id');

		if (status && ['pending', 'approved', 'rejected'].includes(status)) {
			dataQuery.where('pc.status = :status', { status });
		} else {
			dataQuery.where('1=1');
		}

		if (search && search.trim().length > 0) {
			const searchTerm = `%${search.toLowerCase()}%`;
			dataQuery.andWhere(
				new Brackets((qb) =>
					qb
						.orWhere('LOWER(p.title) LIKE :searchTerm', { searchTerm })
						.orWhere('LOWER(p.author) LIKE :searchTerm', { searchTerm })
						.orWhere('LOWER(p.journal) LIKE :searchTerm', { searchTerm })
						.orWhere('LOWER(p.uniqueId) LIKE :searchTerm', { searchTerm })
				)
			);
		}

		if (startDate && !isNaN(Date.parse(startDate))) {
			dataQuery.andWhere('p.time.createdAt >= :startDate', { startDate: new Date(startDate) });
		}

		if (endDate && !isNaN(Date.parse(endDate))) {
			dataQuery.andWhere('p.time.createdAt <= :endDate', { endDate: new Date(endDate) });
		}

		const columnAccessor = sorting?.columnAccessor || 'id';
		const direction = sorting?.direction || 'ASC';
		const order = direction === 'DESC' ? 'DESC' : 'ASC';

		const sortFieldMap: Record<string, string> = {
			id: 'p.id',
			title: 'p.title',
			authors: 'p.author',
			journal: 'p.journal',
			year: 'p.year',
			createdAt: 'p.time.createdAt'
		};

		const sortField = sortFieldMap[columnAccessor] || sortFieldMap['id'];
		dataQuery.addOrderBy(sortField, order);

		const page = pagination.page ?? 1;
		const limit = pagination.limit ?? 10;
		dataQuery.skip((page - 1) * limit).take(limit);

		const rawData = await dataQuery.getRawMany();

		// Map raw results to Publication objects with creditStatus and requestedBy
		const data = rawData.map(row => ({
			id: row.p_id,
			ownerId: row.p_ownerId,
			title: row.p_title,
			author: row.p_author,
			year: row.p_year,
			journal: row.p_journal,
			source: row.p_source,
			uniqueId: row.p_uniqueId,
			url: row.p_url,
			status: row.p_status,
			createdAt: row.p_createdAt,
			updatedAt: row.p_updatedAt,
			creditStatus: row.creditStatus,
			requestedBy: row.requestedBy
		}));

		return [data, count] as [any[], number];
	}

	async approveCreditRequest(publicationId: number, reviewerId: number, approvalStatus: ApprovePublicationDto) {
		if (approvalStatus.weight === undefined || approvalStatus.weight < 1 || approvalStatus.weight > 3)
			throw new ApiException(400, 'Invalid or missing weight', 400);

		return this.dataSource.transaction(async (manager) => {
			await manager.update(PublicationCredit, { publicationId }, {
				status: 'approved'
			});
		});
	}

	async rejectCreditRequest(publicationId: number, reviewerId: number, approvalStatus: ApprovePublicationDto) {
		return this.dataSource.transaction(async (manager) => {
			const credit = await manager.findOne(PublicationCredit, { where: { publicationId } });

			if (!credit) {
				throw new PublicationNotFoundApiException();
			}

			await manager.update(PublicationCredit, { publicationId }, {
				status: 'rejected'
			});
		});
	}

	async getAllCreditRequestsForExport(
		status?: string,
		search?: string,
		startDate?: string,
		endDate?: string
	): Promise<any[]> {
		const builder = this.dataSource
			.createQueryBuilder()
			.select('p')
			.addSelect('pc.status', 'creditStatus')
			.addSelect('pc.userId', 'requestedBy')
			.from(Publication, 'p')
			.innerJoin(PublicationCredit, 'pc', 'pc.publicationId = p.id');

		if (status && ['pending', 'approved', 'rejected'].includes(status)) {
			builder.where('pc.status = :status', { status });
		} else {
			builder.where('1=1');
		}

		if (search && search.trim().length > 0) {
			const searchTerm = `%${search.toLowerCase()}%`;
			builder.andWhere(
				new Brackets((qb) =>
					qb
						.orWhere('LOWER(p.title) LIKE :searchTerm', { searchTerm })
						.orWhere('LOWER(p.author) LIKE :searchTerm', { searchTerm })
						.orWhere('LOWER(p.journal) LIKE :searchTerm', { searchTerm })
						.orWhere('LOWER(p.uniqueId) LIKE :searchTerm', { searchTerm })
				)
			);
		}

		if (startDate && !isNaN(Date.parse(startDate))) {
			builder.andWhere('p.time.createdAt >= :startDate', { startDate: new Date(startDate) });
		}

		if (endDate && !isNaN(Date.parse(endDate))) {
			builder.andWhere('p.time.createdAt <= :endDate', { endDate: new Date(endDate) });
		}

		builder.addOrderBy('p.id', 'ASC');

		const rawData = await builder.getRawMany();

		// Map raw results to Publication objects with creditStatus and requestedBy
		return rawData.map(row => ({
			id: row.p_id,
			ownerId: row.p_ownerId,
			title: row.p_title,
			author: row.p_author,
			year: row.p_year,
			journal: row.p_journal,
			source: row.p_source,
			uniqueId: row.p_uniqueId,
			url: row.p_url,
			status: row.p_status,
			createdAt: row.p_createdAt,
			updatedAt: row.p_updatedAt,
			creditStatus: row.creditStatus,
			requestedBy: row.requestedBy
		}));
	}

	async exportCreditRequests(
		status?: string,
		search?: string,
		startDate?: string,
		endDate?: string,
		fields?: string[]
	): Promise<{ headers: string[]; rows: string[][] }> {
		const publications = await this.getAllCreditRequestsForExport(status, search, startDate, endDate);

		const allFields = [
			{ key: 'title', label: 'Title' },
			{ key: 'authors', label: 'Authors' },
			{ key: 'journal', label: 'Journal' },
			{ key: 'year', label: 'Year' },
			{ key: 'uniqueId', label: 'ID' },
			{ key: 'status', label: 'Credit Status' },
			{ key: 'createdAt', label: 'Created At' },
			{ key: 'reviewedAt', label: 'Reviewed At' },
			{ key: 'weight', label: 'Weight' },
			{ key: 'requestedBy', label: 'Requested By' }
		];

		const selectedFields = fields && fields.length > 0 ? fields : allFields.map((f) => f.key);
		const headers = allFields.filter((f) => selectedFields.includes(f.key)).map((f) => f.label);

		const rows = publications.map((pub: any) => {
			const row: string[] = [];
			for (const field of selectedFields) {
				let value: unknown;
				switch (field) {
					case 'title':
						value = pub.title ?? '';
						break;
					case 'authors':
						value = pub.author ?? '';
						break;
					case 'journal':
						value = pub.journal ?? '';
						break;
					case 'year':
						value = pub.year ?? '';
						break;
					case 'uniqueId':
						value = pub.uniqueId ?? '';
						break;
					case 'status':
						value = pub.creditStatus ?? '';
						break;
					case 'createdAt':
						value = pub.time?.createdAt ? new Date(pub.time.createdAt).toLocaleString() : '';
						break;
					case 'reviewedAt':
						value = pub.reviewedAt ? new Date(pub.reviewedAt).toLocaleString() : '';
						break;
					case 'weight':
						value = pub.weight ?? '';
						break;
					case 'requestedBy':
						value = pub.requestedBy ?? '';
						break;
					default:
						value = '';
				}
				const escapedValue = String(value).replace(/"/g, '""');
				row.push(`"${escapedValue}"`);
			}
			return row;
		});

		return { headers, rows };
	}
}
