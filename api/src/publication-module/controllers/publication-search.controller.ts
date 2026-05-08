import { Controller, Get, Param } from '@nestjs/common';
import { ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PublicationDto } from '../dto/publication.dto';
import { PublicationNotFoundApiException } from '../../error-module/errors/publications/publication-not-found.api-exception';
import { Public } from '../../auth-module/decorators/public.decorator';
import { ApiPublicationService } from '../services/api-publication.service';
import { ResearcherService } from '../services/researcher.service';

@Controller('/publication-search')
@ApiTags('Publication')
export class PublicationSearchController {
	constructor(
		private readonly apiPublicationService: ApiPublicationService,
		private readonly researcherService: ResearcherService
	) {}

	@Get('/doi/:doi')
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
	public async getPublicationByDoi(@Param('doi') doi: string) {
		return this.apiPublicationService.getPublicationByDoi(doi);
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
