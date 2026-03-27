export class OrcidWorkDto {
	/**
	 * DOI identifier
	 */
	doi: string;

	title: string;
	year?: number;
	authors?: string;
}

export class OrcidWorksListDto {
	orcid: string;
	works: OrcidWorkDto[];
}
