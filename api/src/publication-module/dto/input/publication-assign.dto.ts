export class AssignPublicationDto {
	projectId: number;
}

export class CreateOwnedPublicationDto {
	title: string;
	authors: string;
	year: number;
	journal: string;
	uniqueId?: string;
	source: 'doi' | 'manual' | 'isbn' | 'nma' | 'ark' | 'issn' | 'handle';
}
