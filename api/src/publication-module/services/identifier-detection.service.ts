import { Injectable } from '@nestjs/common';
import { PublicationIdentifierTypeDto, ResearcherIdentifierTypeDto } from '../dto/identifier-type.dto';

@Injectable()
export class IdentifierDetectionService {
	private static readonly publicationPatterns: Array<{ type: PublicationIdentifierTypeDto; pattern: RegExp }> = [
		{ type: 'doi', pattern: /^10\.\d{4,9}\/[-._;()/:A-Z0-9]+$/i },
		{ type: 'nma', pattern: /^https:\/\/nma\.eosc\.cz\/.+/i },
		{ type: 'pubmed', pattern: /^\d+$/ },
		{ type: 'isbn', pattern: /^(?:\d{9}[\dX]|\d{13})$/i },
		{ type: 'arxiv', pattern: /^(\d{4}\.\d{4,5}(v\d+)?|[a-z\-]+(\.[A-Z]{2})?\/\d{7}(v\d+)?)$/i },
		{ type: 'openalex', pattern: /^w\d+$/i }
	];

	private static readonly researcherPatterns: Array<{ type: ResearcherIdentifierTypeDto; pattern: RegExp }> = [
		{ type: 'orcid', pattern: /^(\d{4}-){3}\d{3}[\dX]$/i },
		{ type: 'res_openalex', pattern: /^a\d+$/i }
	];

	static detectPublicationIdType(id: string): PublicationIdentifierTypeDto {
		const trimmed = id.trim();
		const matches = this.publicationPatterns.filter(({ pattern }) => pattern.test(trimmed)).map(({ type }) => type);

		if (matches.length === 0) {
			return 'auto';
		}

		if (matches.length === 1) {
			return matches[0];
		}

		return 'auto';
	}

	static detectResearcherIdType(id: string): ResearcherIdentifierTypeDto {
		const trimmed = id.trim();
		const matches = this.researcherPatterns.filter(({ pattern }) => pattern.test(trimmed)).map(({ type }) => type);

		if (matches.length === 0) {
			return 'auto';
		}

		if (matches.length === 1) {
			return matches[0];
		}

		return 'auto';
	}
}
