import { Body, Controller, Delete, Get, HttpCode, Param, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequestUser } from '../../auth-module/decorators/user.decorator';
import { UserDto } from '../../users-module/dtos/user.dto';
import { PublicationService } from '../services/publication.service';
import { PublicationRequestListDto } from '../dto/input/publication-input.dto';
import { PublicationListDto } from '../dto/publication-list.dto';
import { ProjectNotFoundApiException } from '../../error-module/errors/projects/project-not-found.api-exception';
import { GetPagination, Pagination } from '../../config-module/decorators/get-pagination';
import { GetSorting, Sorting } from '../../config-module/decorators/get-sorting';
import { PublicationMapper } from '../mapper/publication.mapper';
import { MinRoleCheck } from '../../permission-module/decorators/min-role.decorator';
import { RoleEnum } from '../../permission-module/models/role.enum';
import { PaginationMapper } from '../../config-module/mappers/pagination.mapper';
import { IsStepUp } from '../../auth-module/decorators/is-step-up.decorator';

@Controller('/publication')
@ApiTags('Publication')
export class PublicationController {
	constructor(
		private readonly publicationService: PublicationService,
		private readonly paginationMapper: PaginationMapper,
		private readonly publicationMapper: PublicationMapper
	) {}

	@Get('/:projectId')
	@MinRoleCheck(RoleEnum.USER)
	@ApiOperation({
		summary: 'Get project publications',
		description: 'Get project publications. This method supports pagination.'
	})
	@ApiOkResponse({
		description: 'Publications of the project.',
		type: PublicationListDto
	})
	@ApiNotFoundResponse({
		description: 'Project not found or user has no access to this project.',
		type: ProjectNotFoundApiException
	})
	async getProjectPublications(
		@Param('projectId') projectId: number,
		@RequestUser() user: UserDto,
		@GetPagination() pagination: Pagination,
		@GetSorting() sorting: Sorting | null,
		@IsStepUp() isStepUp: boolean
	) {
		const [publications, count] = await this.publicationService.getProjectPublications(
			projectId,
			user.id,
			pagination,
			sorting,
			isStepUp
		);

		const items = publications.map((publication) =>
			this.publicationMapper.mapPublicationToPublicationDetailDto(publication, user.id)
		);
		return this.paginationMapper.toPaginatedResult(pagination, count, items);
	}

	@Delete('/:publicationId')
	@HttpCode(204)
	@MinRoleCheck(RoleEnum.USER)
	@ApiOperation({
		summary: 'Deletes publication from the project',
		description: 'Deletes publication from the project if user has correct permissions and access.'
	})
	@ApiNotFoundResponse({
		description: 'Publication with provided ID not found or user has no permission to access it.'
	})
	public async deletePublication(
		@Param('publicationId') publicationId: number,
		@RequestUser() user: UserDto,
		@IsStepUp() isStepUp: boolean
	) {
		await this.publicationService.deleteProjectPublication(publicationId, user.id, isStepUp);
	}

	@Post('/:projectId')
	@HttpCode(201)
	@MinRoleCheck(RoleEnum.USER)
	@ApiOperation({
		summary: 'Add publications to project',
		description: 'Adds publications to project. This is bulk endpoint, either all publications are added or none.'
	})
	@ApiCreatedResponse({
		description: 'Publications added to project.'
	})
	public async getPublicationByDoi(
		@Param('projectId') projectId: number,
		@RequestUser() user: UserDto,
		@Body() publicationsBody: PublicationRequestListDto,
		@IsStepUp() isStepUp: boolean
	) {
		await this.publicationService.addPublicationToProject(
			user.id,
			projectId,
			publicationsBody.publications,
			isStepUp
		);
	}
}
