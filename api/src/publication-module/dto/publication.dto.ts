export class PublicationDto {
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
	 * Url to publication the publication.
	 */
	url: string;

	/**
	 * Unique identifier of the publication. Either DOI, ISSN or ISBN.
	 */
	uniqueId: string;

	source: 'doi' | 'manual' | 'isbn' | 'nma' | 'ark' | 'issn' | 'handle' | 'orcid' | 'pubmed';
}
