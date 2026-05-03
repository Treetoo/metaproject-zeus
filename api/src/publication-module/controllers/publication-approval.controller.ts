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
	constructor(
		private readonly approvalService: PublicationApprovalService,
		private readonly paginationMapper: PaginationMapper
	) {}

	@Get()
	@MinRoleCheck(RoleEnum.DIRECTOR)
	@ApiOkResponse({ description: 'Pending publications', type: PublicationListDto })
	async listPending(
		@RequestUser() user: UserDto,
		@GetPagination() pagination: Pagination,
		@GetSorting() sorting: Sorting
	) {
		const [publications, count] = await this.approvalService.getPendingRequests(pagination, sorting);

		const items = publications.map((publication) => ({
			id: publication.id,
			publicationId: publication.id,
			title: publication.title,
			authors: publication.author,
			year: publication.year,
			journal: publication.journal,
			uniqueId: publication.uniqueId,
			url: publication.url,
			status: publication.status,
			requestedBy: publication.ownerId,
			createdAt: publication.time?.createdAt
		}));

		return this.paginationMapper.toPaginatedResult(pagination, count, items);
	}

	@Post(':id/approve')
	@MinRoleCheck(RoleEnum.DIRECTOR)
	@ApiOperation({
		summary: 'Approve adding a publication.',
		description: 'Approves adding a publication.'
	})
	@ApiCreatedResponse({
		description: 'Publications approved.'
	})
	async approve(@Param('id') id: number, @RequestUser() user: UserDto, @Body() body: ApprovePublicationDto) {
		return this.approvalService.approvePublication(id, user.id, body.weight);
	}

	@Post(':id/reject')
	@MinRoleCheck(RoleEnum.DIRECTOR)
	@ApiOperation({
		summary: 'Reject adding a publications.',
		description: 'Rejects adding a publication.'
	})
	@ApiCreatedResponse({
		description: 'Publications rejected.'
	})
	async reject(@Param('id') id: number, @RequestUser() user: UserDto) {
		return this.approvalService.rejectPublication(id, user.id);
	}
}
