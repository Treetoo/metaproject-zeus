import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Publication } from 'resource-manager-database';
import { ApiException } from '../../error-module/api-exception';
import { PublicationNotFoundApiException } from '../../error-module/errors/publications/publication-not-found.api-exception';
import { ApprovePublicationDto } from '../dto/input/approve-publication.dto';

@Injectable()
export class PublicationApprovalService {
	constructor(private dataSource: DataSource) {}

	async getPendingRequests(pagination, sorting) {
		const builder = this.dataSource
			.getRepository(Publication)
			.createQueryBuilder('p')
			.where('p.status = :status', { status: 'pending' });

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
}
