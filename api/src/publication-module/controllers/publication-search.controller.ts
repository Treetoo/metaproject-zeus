import { Controller, Get, Param } from '@nestjs/common';
import { ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PublicationDto } from '../dto/publication.dto';
import { PublicationNotFoundApiException } from '../../error-module/errors/publications/publication-not-found.api-exception';
import { Public } from '../../auth-module/decorators/public.decorator';
import { ResearcherService } from '../services/researcher.service';
import { PublicationService } from '../services/publication.service';
import { PublicationIdentifierTypeDto } from '../dto/identifier-type.dto';

@Controller('/publication-search')
@ApiTags('Publication')
export class PublicationSearchController {
	constructor(
		private readonly publicationService: PublicationService,
		private readonly researcherService: ResearcherService
	) {}

	@Get('/publication-id/:id/:type')
	@Public()
	@ApiOperation({
		summary: 'Get publication by DOI.',
		description: 'Get publication by DOI.'
	})
	@ApiOkResponse({
		description: 'Publication.',
		type: PublicationDto
	})
	@ApiNotFoundResponse({
		description: 'Publication with DOI not found.',
		type: PublicationNotFoundApiException
	})
	public async getPublicationById(@Param('id') id: string, @Param('type') type: PublicationIdentifierTypeDto) {
		return this.publicationService.getPublicationByIdentifier(id, type);
	}

	@Get('/researcher-id/:id/:type')
	@Public()
	@ApiOperation({
		summary: 'Get publications by researcher ID.',
		description: 'Get publications by researcher ID.'
	})
	@ApiOkResponse({
		description: 'ID.',
		type: PublicationDto
	})
	@ApiNotFoundResponse({
		description: 'Researcher ID not found.',
		type: PublicationNotFoundApiException
	})
	public async getPublicationByResearherId(@Param('id') id: string, @Param('type') type: string) {
		return await this.researcherService.searchByPublicationById(id, type);
	}
}
