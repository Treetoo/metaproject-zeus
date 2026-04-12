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
    console.log(await this.dataSource.getRepository(ProjectPublication)
      .createQueryBuilder('pp')
      .innerJoinAndSelect('pp.publication', 'publication')
      .innerJoinAndSelect('pp.project', 'project').getManyAndCount());

    const builder = this.dataSource.getRepository(ProjectPublication)
      .createQueryBuilder('pp')
      .innerJoinAndSelect('pp.publication', 'publication')
      .innerJoinAndSelect('pp.project', 'project')
      .where('pp.status = :status', { status: 'pending' });

    // Apply sorting and pagination logic here...
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
