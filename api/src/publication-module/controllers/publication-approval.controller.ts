import { Controller, Get, Param, Post, Body } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags, ApiCreatedResponse } from '@nestjs/swagger';
import { RequestUser } from '../../auth-module/decorators/user.decorator';
import { UserDto } from '../../users-module/dtos/user.dto';
import { MinRoleCheck } from '../../permission-module/decorators/min-role.decorator';
import { RoleEnum } from '../../permission-module/models/role.enum';
import { PublicationApprovalService } from '../services/publication-approval.service';
import { GetPagination, Pagination } from '../../config-module/decorators/get-pagination';
import { ApprovePublicationDto } from '../dto/input/approve-publication.dto';
import { PaginationMapper } from '../../config-module/mappers/pagination.mapper';
import { GetSorting, Sorting } from '../../config-module/decorators/get-sorting';
import { PublicationListDto } from '../dto/publication-list.dto';

@Controller('publications/approval')
@ApiTags('Publication Approval')
export class PublicationApprovalController {
	constructor(private approvalService: PublicationApprovalService,
		private readonly paginationMapper: PaginationMapper,
	) { }

	@Get()
	@MinRoleCheck(RoleEnum.DIRECTOR)
	@ApiOkResponse({ description: 'Pending publications', type: PublicationListDto }) // Add proper response type
	async listPending(
		@RequestUser() user: UserDto,
		@GetPagination() pagination: Pagination,
		@GetSorting() sorting: Sorting
	) {
		const [projectPublications, count] = await this.approvalService.getPendingRequests(pagination, sorting);

		// Map ProjectPublication[] to Publication[] (or a new DTO that includes status/project)
		const items = projectPublications.map(pp => ({
			id: pp.id,
			publicationId: pp.publication.id,
			title: pp.publication.title,
			authors: pp.publication.author,
			year: pp.publication.year,
			journal: pp.publication.journal,
			uniqueId: pp.publication.uniqueId,
			status: pp.status,           // Include the status
			projectId: pp.project.id,    // Include project info if needed
			projectName: pp.project.title,
			requestedBy: pp.addedByUserId,
			//createdAt: pp.createdAt
		}));

		// Use pagination mapper to format response correctly
		return this.paginationMapper.toPaginatedResult(pagination, count, items);
	}

	@Post(':id/approve')
	@MinRoleCheck(RoleEnum.DIRECTOR)
	@ApiOperation({
		summary: 'Approve adding a publications to a project',
		description: 'Approves adding a publication to a project.'
	})
	@ApiCreatedResponse({
		description: 'Publications approved.'
	})
	async approve(
		@Param('id') id: number,
		@RequestUser() user: UserDto,
		@Body() body: ApprovePublicationDto // { weight: number }
	) {
		return this.approvalService.approvePublication(id, user.id, body.weight);
	}

	@Post(':id/reject')
	@MinRoleCheck(RoleEnum.DIRECTOR)
	@ApiOperation({
		summary: 'Reject adding a publications to a project',
		description: 'Rejects adding a publication to a project.'
	})
	@ApiCreatedResponse({
		description: 'Publications rejected.'
	})
	async reject(
		@Param('id') id: number,
		@RequestUser() user: UserDto
	) {
		return this.approvalService.rejectPublication(id, user.id);
	}
}
