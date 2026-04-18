import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ProjectPublication } from 'resource-manager-database';
import { PublicationNotFoundApiException } from '../../error-module/errors/publications/publication-not-found.api-exception';

@Injectable()
export class PublicationApprovalService {
  constructor(
    private dataSource: DataSource,
    // Inject PBS client/service here
  ) {}

  async getPendingRequests(pagination, sorting) {
    const builder = this.dataSource.getRepository(ProjectPublication)
      .createQueryBuilder('pp')
      .innerJoinAndSelect('pp.publication', 'publication')
      .innerJoinAndSelect('pp.project', 'project')
      .where('pp.status = :status', { status: 'pending' });

    // Apply sorting
    const columnAccessor = sorting?.columnAccessor || 'id';
    const direction = sorting?.direction || 'ASC';
    const order = direction === 'DESC' ? 'DESC' : 'ASC';

    // Map frontend column accessors to backend fields
    const sortFieldMap: Record<string, { table: string; field: string }> = {
      'id': { table: 'pp', field: 'id' },
      'title': { table: 'publication', field: 'title' },
      'authors': { table: 'publication', field: 'author' },
      'journal': { table: 'publication', field: 'journal' },
      'year': { table: 'publication', field: 'year' },
      'createdAt': { table: 'pp.time', field: 'createdAt' },
      'projectId': { table: 'pp', field: 'projectId' },
      'projectName': { table: 'project', field: 'title' }
    };

    const sortField = sortFieldMap[columnAccessor] || sortFieldMap['id'];
    builder.addOrderBy(`${sortField.table}.${sortField.field}`, order);

    // Apply pagination
    const page = pagination.page ?? 1;
    const limit = pagination.limit ?? 10;
    builder.skip((page - 1) * limit).take(limit);

    return builder.getManyAndCount();
  }


  async approvePublication(projectPublicationId: number, reviewerId: number, weight: number) {
    return this.dataSource.transaction(async (manager) => {
      // 1. Update status and weight
      await manager.update(ProjectPublication, projectPublicationId, {
        status: 'approved',
        weight: weight,
        reviewerId: reviewerId,
        reviewedAt: new Date()
      });

      // TODO: Report to PBS?
    });
  }

  async rejectPublication(projectPublicationId: number, reviewerId: number) {
     return this.dataSource.transaction(async (manager) => {
      const link = await manager.findOne(ProjectPublication, { where: { id: projectPublicationId } });

      if (!link) {
        throw new PublicationNotFoundApiException();
      }

      await manager.update(ProjectPublication, projectPublicationId, {
        status: 'rejected',
        reviewerId: reviewerId,
        reviewedAt: new Date()
      });
    });
  }
}
