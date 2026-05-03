export class PublicationDetailDto {
	/**
	 * Unique identifier of the publication.
	 */
	id: number;

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
	 * Unique identifier of the publication. Either DOI, ISSN or ISBN.
	 */
	uniqueId: string;

	/**
	 * Link to the publication page.
	 */
	url: string;

	/**
	 * Publications status. Either pending, approved or rejected.
	 */
	status: string;

	/**
	 * True if the current user is the owner of this publication.
	 */
	isOwner: boolean;
}
