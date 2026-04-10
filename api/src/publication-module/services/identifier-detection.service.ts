import { Injectable } from '@nestjs/common'
import { PublicationIdentifierTypeDto } from '../dto/identifier-type.dto'

@Injectable()
export class IdentifierDetectionService {
	private static readonly patterns: Array<{ type: PublicationIdentifierTypeDto; pattern: RegExp }> = [
		{ type: "doi", pattern: /^10\.\d{4,9}\/[-._;()/:A-Z0-9]+$/i },
		{ type: "nma", pattern: /^https:\/\/nma\.eosc\.cz\/.+/i },
		{ type: "ark", pattern: /^ark:\/\d+\/.+/i },
		{ type: "handle", pattern: /^(hdl:)?\d+(\.\d+)*\/.+/i },
		{ type: "pubmed", pattern: /^\d+$/ },
		{ type: "isbn", pattern: /^(?:\d{9}[\dX]|\d{13})$/i },
		{ type: "issn", pattern: /^\d{4}-\d{3}[\dX]$/i },
	];

	static detect(id: string): PublicationIdentifierTypeDto {
		const trimmed = id.trim();
		const matches = this.patterns.filter(({ pattern }) => pattern.test(trimmed)).map(({ type }) => type);

		if (matches.length === 0) {
			return "unknown";
		}

		if (matches.length === 1) {
			return matches[0];
		}

		if (matches.includes("doi") && matches.includes("handle") && matches.length === 2)
			return "doi"

		return "unknown";
	}
}
