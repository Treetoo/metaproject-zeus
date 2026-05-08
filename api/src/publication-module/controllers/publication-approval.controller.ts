import { Controller, Get, Param, Post, Body, Query, Res } from '@nestjs/common';
import { ApiQuery, ApiOkResponse, ApiOperation, ApiTags, ApiCreatedResponse } from '@nestjs/swagger';
import { Response } from 'express';
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
	@MinRoleCheck(RoleEnum.USER)
	@ApiQuery({
		name: 'status',
		required: false,
		enum: ['pending', 'approved', 'rejected'],
		description: 'Filter by status'
	})
	@ApiQuery({ name: 'search', required: false, description: 'Search by title, authors, journal, or unique ID' })
	@ApiOkResponse({ description: 'Publication requests', type: PublicationListDto })
	async listPublicationRequests(
		@GetPagination() pagination: Pagination,
		@GetSorting() sorting: Sorting,
		@Query('status') status?: string,
		@Query('search') search?: string
	) {
		const [publications, count] = await this.approvalService.getPublicationRequests(
			pagination,
			sorting,
			status,
			search
		);

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
		return this.approvalService.approvePublication(id, user.id, body);
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
	async reject(@Param('id') id: number, @RequestUser() user: UserDto, @Body() body: ApprovePublicationDto) {
		return this.approvalService.rejectPublication(id, user.id, body);
	}

	@Get('export')
	@MinRoleCheck(RoleEnum.DIRECTOR)
	@ApiQuery({
		name: 'status',
		required: false,
		enum: ['pending', 'approved', 'rejected'],
		description: 'Filter by status'
	})
	@ApiQuery({ name: 'search', required: false, description: 'Search by title, authors, journal, or unique ID' })
	@ApiQuery({
		name: 'startDate',
		required: false,
		description: 'Filter by start date (ISO timestamp)'
	})
	@ApiQuery({
		name: 'endDate',
		required: false,
		description: 'Filter by end date (ISO timestamp)'
	})
	@ApiQuery({
		name: 'fields',
		required: false,
		description:
			'Comma-separated list of fields to export (title,authors,journal,year,uniqueId,status,createdAt,reviewedAt,weight,ownerId)'
	})
	@ApiOperation({ summary: 'Export publications as CSV' })
	async exportPublications(
		@Res() res: Response,
		@Query('status') status?: string,
		@Query('search') search?: string,
		@Query('startDate') startDate?: string,
		@Query('endDate') endDate?: string,
		@Query('fields') fields?: string
	) {
		const fieldArray = fields ? fields.split(',').map((f) => f.trim()) : [];
		const { headers, rows } = await this.approvalService.exportPublications(
			status,
			search,
			startDate,
			endDate,
			fieldArray
		);

		const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');

		res.setHeader('Content-Type', 'text/csv; charset=utf-8');
		res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
		res.setHeader('Pragma', 'no-cache');
		res.setHeader(
			'Content-Disposition',
			`attachment; filename="publications-export-${new Date().toISOString().split('T')[0]}.csv"`
		);
		res.send(csvContent);
	}
}
