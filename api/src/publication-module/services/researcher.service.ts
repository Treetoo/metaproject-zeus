import { Injectable } from '@nestjs/common';
import { ApiException } from 'src/error-module/api-exception';
import { ApiPublicationService } from './api-publication.service';
import { IdentifierDetectionService } from './identifier-detection.service';

@Injectable()
export class ResearcherService {
	constructor(private readonly apiPublicationService: ApiPublicationService) {}

	async searchByResearcherIdAndType(researcherId: string, idType: string = 'unknown') {
		if (idType === 'unknown') {
			idType = IdentifierDetectionService.detectResearcherIdType(researcherId);
		}

		if (idType === 'unknown') {
			throw new ApiException(400, 'Unable to detect type from identifier.', 400);
		}
		return this.apiPublicationService.getPublicationsByResearcherIdAndType(researcherId, idType);
	}
}
