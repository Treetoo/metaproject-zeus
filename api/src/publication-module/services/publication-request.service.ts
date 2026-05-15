import { Injectable } from '@nestjs/common';
import { Brackets, DataSource } from 'typeorm';
import { Publication, PublicationCredit, PublicationStakeholder, ProjectPublication } from 'resource-manager-database';
import { ApiException } from '../../error-module/api-exception';
import { PublicationNotFoundApiException } from '../../error-module/errors/publications/publication-not-found.api-exception';
import { ApprovePublicationDto } from '../dto/input/approve-publication.dto';

export interface PublicationDetailDto {
	id: number;
	ownerId: number;
	ownerName?: string;
	ownerUsername?: string;
	ownerEmail?: string;
	title: string;
	authors: string;
	year: number;
	journal: string;
	source: string;
	uniqueId: string;
	url: string;
	status: 'pending' | 'approved' | 'rejected';
	createdAt?: string;
	updatedAt?: string;
	reviewerId?: number | null;
	reviewedAt?: Date | null;
	reviewerNote?: string | null;
	weight?: number | null;
	project?: {
		id: number;
		title: string;
	} | null;
	creditors: {
		userId: number;
		username: string;
		name: string;
		email: string;
		status: 'pending' | 'approved' | 'rejected';
	}[];
	stakeholders: {
		userId: number;
		username: string;
		name: string;
		email: string;
	}[];
	requestedBy?: number;
}

@Injectable()
export class PublicationRequestService {
	constructor(private dataSource: DataSource) { }

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

	async getPublicationDetail(publicationId: number): Promise<PublicationDetailDto> {
		const publication = await this.dataSource.getRepository(Publication).findOne({
			where: { id: publicationId },
			relations: ['owner']
		});

		if (!publication) {
			throw new PublicationNotFoundApiException();
		}

		// Get project information via ProjectPublication
		const projectPub = await this.dataSource
			.createQueryBuilder()
			.select('p.id', 'projectId')
			.addSelect('p.title', 'projectTitle')
			.from('Project', 'p')
			.innerJoin(ProjectPublication, 'pp', 'pp.projectId = p.id')
			.where('pp.publicationId = :publicationId', { publicationId })
			.getRawOne();

		// Get creditors with user info
		const creditorsData = await this.dataSource
			.createQueryBuilder()
			.select('pc.userId', 'userId')
			.addSelect('pc.status', 'status')
			.addSelect('u.username', 'username')
			.addSelect('u.name', 'name')
			.addSelect('u.email', 'email')
			.from(PublicationCredit, 'pc')
			.innerJoin('User', 'u', 'u.id = pc.userId')
			.where('pc.publicationId = :publicationId', { publicationId })
			.getRawMany();

		// Get stakeholders with user info
		const stakeholdersData = await this.dataSource
			.createQueryBuilder()
			.select('ps.userId', 'userId')
			.addSelect('ps.status', 'status')
			.addSelect('u.username', 'username')
			.addSelect('u.name', 'name')
			.addSelect('u.email', 'email')
			.from(PublicationStakeholder, 'ps')
			.innerJoin('User', 'u', 'u.id = ps.userId')
			.where('ps.publicationId = :publicationId', { publicationId })
			.getRawMany();

		return {
			id: publication.id,
			ownerId: publication.ownerId,
			ownerName: publication.owner?.name,
			ownerUsername: publication.owner?.username,
			ownerEmail: publication.owner?.email,
			title: publication.title,
			authors: publication.author,
			year: publication.year,
			journal: publication.journal,
			source: publication.source,
			uniqueId: publication.uniqueId,
			url: publication.url,
			status: publication.status,
			createdAt: publication.time?.createdAt,
			updatedAt: publication.time?.updatedAt,
			reviewerId: publication.reviewerId,
			reviewedAt: publication.reviewedAt,
			reviewerNote: publication.reviewerNote,
			weight: publication.weight,
			project: projectPub
				? {
					id: projectPub.projectId,
					title: projectPub.projectTitle
				}
				: null,
			creditors: creditorsData.map((c) => ({
				userId: c.userId,
				username: c.username,
				name: c.name,
				email: c.email,
				status: c.status
			})),
			stakeholders: stakeholdersData.map((s) => ({
				userId: s.userId,
				username: s.username,
				name: s.name,
				email: s.email,
				status: s.status
			}))
		};
	}
}
