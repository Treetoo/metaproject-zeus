import { Injectable } from '@nestjs/common';
import { PublicationIdentifierTypeDto } from '../dto/identifier-type.dto';

@Injectable()
export class IdentifierDetectionService {
	private static readonly patterns: Array<{ type: PublicationIdentifierTypeDto; pattern: RegExp }> = [
		{ type: 'doi', pattern: /^10\.\d{4,9}\/[-._;()/:A-Z0-9]+$/i },
		{ type: 'nma', pattern: /^https:\/\/nma\.eosc\.cz\/.+/i },
		{ type: 'arxiv', pattern: /^ark:\/\d+\/.+/i },
		{ type: 'pubmed', pattern: /^\d+$/ },
		{ type: 'isbn', pattern: /^(?:\d{9}[\dX]|\d{13})$/i },
		{ type: 'arxiv', pattern: /^(\d{4}\.\d{4,5}(v\d+)?|[a-z\-]+(\.[A-Z]{2})?\/\d{7}(v\d+)?)$/i }
	];

	static detect(id: string): PublicationIdentifierTypeDto {
		const trimmed = id.trim();
		const matches = this.patterns.filter(({ pattern }) => pattern.test(trimmed)).map(({ type }) => type);

		if (matches.length === 0) {
			return 'unknown';
		}

		if (matches.length === 1) {
			return matches[0];
		}

		return 'unknown';
	}
}
