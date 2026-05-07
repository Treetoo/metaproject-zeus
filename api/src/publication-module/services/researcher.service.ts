import { Injectable } from '@nestjs/common';
import { ApiException } from "src/error-module/api-exception";
import { ApiPublicationService } from "./api-publication.service";
import { IdentifierDetectionService } from "./identifier-detection.service";

@Injectable()
export class ResearcherService {
	constructor(
		private readonly apiPublicationService: ApiPublicationService,
	) { }

	async searchByPublicationById(
		researcherId: string,
		idType: string
	) {
		if (idType !== 'unknown') {
			return this.apiPublicationService.getPublicationsByResearcherIdAndType(researcherId, idType);
		}

		idType = IdentifierDetectionService.detectResearcherIdType(researcherId);

		if (idType !== 'unknown') {
			return this.apiPublicationService.getPublicationsByResearcherIdAndType(researcherId, idType);
		}

		throw new ApiException(400, 'Unable to detect type from identifier.', 400);
	}
}
