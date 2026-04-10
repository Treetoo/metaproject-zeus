export class PublicationInputDto {
	/**
	 * Title of the publication.
	 */
	title: string;

	/**
	 * Authors of the publication. Multiple authors are separated by comma.
	 */
	authors: string;

	/**
	 * Year of the publication.
	 */
	year: number;

	/**
	 * Journal where the publication was published.
	 */
	journal: string;

	/**
	 * Unique identifier of the publication. Either DOI, ISSN or ISBN. If empty publications was added manually, and it needs to be generated.
	 */
	uniqueId?: string;

	/**
	 * Source of the publication. Either it was searched by DOI or added manually.
	 */
	source: 'doi' | 'manual' | 'isbn' | 'nma' | 'ark' | 'issn' | 'handle';
}

export class PublicationRequestListDto {
	publications: PublicationInputDto[];
}
