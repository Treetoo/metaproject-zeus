import { Injectable } from '@nestjs/common';
import { PublicationIdentifierTypeDto } from '../dto/identifier-type.dto';

@Injectable()
export class IdentifierDetectionService {
	private static readonly publicationPatterns: Array<{ type: PublicationIdentifierTypeDto; pattern: RegExp }> = [
		{ type: 'doi', pattern: /^10\.\d{4,9}\/[-._;()/:A-Z0-9]+$/i },
		{ type: 'nma', pattern: /^https:\/\/nma\.eosc\.cz\/.+/i },
		{ type: 'pubmed', pattern: /^\d+$/ },
		{ type: 'isbn', pattern: /^(?:\d{9}[\dX]|\d{13})$/i },
		{ type: 'arxiv', pattern: /^(\d{4}\.\d{4,5}(v\d+)?|[a-z\-]+(\.[A-Z]{2})?\/\d{7}(v\d+)?)$/i }
		//TODO Alex
	];

	private static readonly researcherPatterns: Array<{ type: PublicationIdentifierTypeDto; pattern: RegExp }> = [
		{ type: 'orcid', pattern: /^(\d{4}-){3}\d{3}[\dX]$/i },
		//TODO Alex
	];

	;

	static detectPublicationIdType(id: string): PublicationIdentifierTypeDto {
		const trimmed = id.trim();
		const matches = this.publicationPatterns.filter(({ pattern }) => pattern.test(trimmed)).map(({ type }) => type);

		if (matches.length === 0) {
			return 'unknown';
		}

		if (matches.length === 1) {
			return matches[0];
		}

		return 'unknown';
	}

	static detectResearcherIdType(id: string): PublicationIdentifierTypeDto {
		const trimmed = id.trim();
		const matches = this.researcherPatterns.filter(({ pattern }) => pattern.test(trimmed)).map(({ type }) => type);
		console.log("trying to match")

		if (matches.length === 0) {
			return 'unknown';
		}

		if (matches.length === 1) {
			return matches[0];
		}

		return 'unknown';
	}
}
