import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Query } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequestUser } from '../../auth-module/decorators/user.decorator';
import { UserDto } from '../../users-module/dtos/user.dto';
import { PublicationService } from '../services/publication.service';
import { GetPagination, Pagination } from '../../config-module/decorators/get-pagination';
import { GetSorting, Sorting } from '../../config-module/decorators/get-sorting';
import { PublicationListDto } from '../dto/publication-list.dto';
import { PublicationMapper } from '../mapper/publication.mapper';
import { PaginationMapper } from '../../config-module/mappers/pagination.mapper';
import { MinRoleCheck } from '../../permission-module/decorators/min-role.decorator';
import { RoleEnum } from '../../permission-module/models/role.enum';
import {
	CreateOwnedPublicationDto,
	AssignPublicationDto,
	CreateOwnedPublicationByIdDto
} from '../dto/input/publication-assign.dto';
import { IsStepUp } from '../../auth-module/decorators/is-step-up.decorator';

@Controller('/my/publications')
@ApiTags('My Publications')
export class UserPublicationController {
	constructor(
		private readonly publicationService: PublicationService,
		private readonly paginationMapper: PaginationMapper,
		private readonly publicationMapper: PublicationMapper
	) {}

	@Get()
	@MinRoleCheck(RoleEnum.USER)
	@ApiOperation({ summary: 'List my publications', description: 'List publications owned by current user.' })
	@ApiOkResponse({ description: 'Your publications.', type: PublicationListDto })
	async listMine(
		@RequestUser() user: UserDto,
		@GetPagination() pagination: Pagination,
		@GetSorting() sorting: Sorting | null,
		@Query('status') status?: string,
		@Query('search') search?: string
	) {
		const [publications, count] = await this.publicationService.getUserPublications(
			user.id,
			pagination,
			sorting,
			status,
			search
		);
		const items = publications.map((p) => this.publicationMapper.mapPublicationToPublicationDetailDto(p, user.id));
		return this.paginationMapper.toPaginatedResult(pagination, count, items);
	}

	@Post()
	@HttpCode(201)
	@MinRoleCheck(RoleEnum.USER)
	@ApiOperation({ summary: 'Create my publication' })
	@ApiCreatedResponse({ description: 'Publication created.' })
	async createMine(
		@RequestUser() user: UserDto,
		@Body() body: CreateOwnedPublicationDto,
		@IsStepUp() isStepUp: boolean
	) {
		await this.publicationService.createOwnedPublication(user.id, body, isStepUp);
	}

	@Put('/:id')
	@HttpCode(200)
	@MinRoleCheck(RoleEnum.USER)
	@ApiOperation({ summary: 'Update my publication' })
	@ApiCreatedResponse({ description: 'Publication updated.' })
	async updateMine(@Param('id') id: number, @RequestUser() user: UserDto, @Body() body: CreateOwnedPublicationDto) {
		await this.publicationService.updateOwnedPublication(user.id, id, body);
	}

	@Post('/add-by-id')
	@HttpCode(201)
	@MinRoleCheck(RoleEnum.USER)
	@ApiOperation({ summary: 'Create my publication by id' })
	@ApiCreatedResponse({ description: 'Publication created.' })
	async createMineById(
		@RequestUser() user: UserDto,
		@Body() body: CreateOwnedPublicationByIdDto,
		@IsStepUp() isStepUp: boolean
	) {
		const id = await this.publicationService.createOwnedPublicationById(user.id, body, isStepUp);
		return { id };
	}

	@Post('/:id/assign')
	@HttpCode(200)
	@MinRoleCheck(RoleEnum.USER)
	@ApiOperation({ summary: 'Assign my publication to a project' })
	async assign(
		@Param('id') id: number,
		@RequestUser() user: UserDto,
		@Body() body: AssignPublicationDto,
		@IsStepUp() isStepUp: boolean
	) {
		await this.publicationService.assignOwnedPublication(user.id, id, body, isStepUp);
	}

	@Delete('/:id')
	@HttpCode(204)
	@MinRoleCheck(RoleEnum.USER)
	@ApiOperation({ summary: 'Delete my publication permanently' })
	async deleteMine(@Param('id') id: number, @RequestUser() user: UserDto) {
		await this.publicationService.deleteOwnedPublication(id, user.id);
	}

	@Get('/credited')
	@MinRoleCheck(RoleEnum.USER)
	@ApiOperation({
		summary: 'List my credited publications',
		description: 'List publications where current user is credited.'
	})
	@ApiOkResponse({ description: 'Your credited publications.', type: PublicationListDto })
	async listMyCredited(
		@RequestUser() user: UserDto,
		@GetPagination() pagination: Pagination,
		@GetSorting() sorting: Sorting | null,
		@Query('status') status?: string,
		@Query('search') search?: string
	) {
		const [publications, count] = await this.publicationService.getUserCreditedPublications(
			user.id,
			pagination,
			sorting,
			status,
			search
		);
		const items = publications.map((p: any) => ({
			...this.publicationMapper.mapPublicationToPublicationDetailDto(p, user.id),
			creditStatus: p.creditStatus
		}));
		return this.paginationMapper.toPaginatedResult(pagination, count, items);
	}

	@Get('/stakeholder')
	@MinRoleCheck(RoleEnum.USER)
	@ApiOperation({
		summary: 'List my stakeholder publications',
		description: 'List publications where current user is a stakeholder.'
	})
	@ApiOkResponse({ description: 'Your stakeholder publications.', type: PublicationListDto })
	async listMyStakeholder(
		@RequestUser() user: UserDto,
		@GetPagination() pagination: Pagination,
		@GetSorting() sorting: Sorting | null,
		@Query('status') status?: string,
		@Query('search') search?: string
	) {
		const [publications, count] = await this.publicationService.getUserStakeholderPublications(
			user.id,
			pagination,
			sorting,
			status,
			search
		);
		const items = publications.map((p) => this.publicationMapper.mapPublicationToPublicationDetailDto(p, user.id));
		return this.paginationMapper.toPaginatedResult(pagination, count, items);
	}

	@Post('/credit-request/:publicationId')
	@HttpCode(201)
	@MinRoleCheck(RoleEnum.USER)
	@ApiOperation({
		summary: 'Request credit for a publication',
		description: 'Add the current user as a credit to the specified publication.'
	})
	@ApiCreatedResponse({ description: 'Credit request created successfully.' })
	async requestCredit(
		@Param('publicationId') publicationId: number,
		@RequestUser() user: UserDto
	) {
		await this.publicationService.addCreditRequest(user.id, publicationId);
	}
}
