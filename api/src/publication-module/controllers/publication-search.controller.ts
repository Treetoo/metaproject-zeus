import { Controller, Get, Param } from '@nestjs/common';
import { ApiBadRequestResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { MinRoleCheck } from 'src/permission-module/decorators/min-role.decorator';
import { RoleEnum } from 'src/permission-module/models/role.enum';
import { PublicationDto } from '../dto/publication.dto';
import { PublicationNotFoundApiException } from '../../error-module/errors/publications/publication-not-found.api-exception';
import { PublicationInvalidIdentifierTypeException } from '../../error-module/errors/publications/publication-invalid-identifier-type.api-exception';
import { ResearcherService } from '../services/researcher.service';
import { PublicationService } from '../services/publication.service';
import { PublicationIdentifierTypeDto } from '../dto/identifier-type.dto';
import { ResearcherWorksListDto } from '../dto/researcher-works.dto';

@Controller('/publication-search')
@ApiTags('Publication Search')
export class PublicationSearchController {
	constructor(
		private readonly publicationService: PublicationService,
		private readonly researcherService: ResearcherService
	) {}

	@MinRoleCheck(RoleEnum.USER)
	@Get('/publication-id/:type/:id')
	@ApiOperation({
		summary: 'Get publication by publication id and type.',
		description: 'Returns a publication by type and its id.'
	})
	@ApiOkResponse({
		description: 'Publication.',
		type: PublicationDto
	})
	@ApiBadRequestResponse({
		description: 'Invalid identifier type.',
		type: PublicationInvalidIdentifierTypeException
	})
	@ApiNotFoundResponse({
		description: 'Publication with given ID and type not found.',
		type: PublicationNotFoundApiException
	})
	public async getPublicationById(@Param('type') type: PublicationIdentifierTypeDto, @Param('id') id: string) {
		return this.publicationService.getPublicationByIdentifier(id, type);
	}

	@MinRoleCheck(RoleEnum.USER)
	@Get('/researcher-id/:id/:type')
	@ApiOperation({
		summary: 'Get publications by researcher ID.',
		description: 'Returns a list of publications by researcher ID and its type.'
	})
	@ApiOkResponse({
		description: 'ID.',
		type: ResearcherWorksListDto
	})
	@ApiBadRequestResponse({
		description: 'Invalid identifier type.',
		type: PublicationInvalidIdentifierTypeException
	})
	@ApiNotFoundResponse({
		description: 'Researcher with given ID and type not found.',
		type: PublicationNotFoundApiException
	})
	public async getPublicationByResearherId(@Param('id') id: string, @Param('type') type: string) {
		return await this.researcherService.searchByResearcherIdAndType(id, type);
	}
}
