import { PublicationIdentifierTypeDto } from '../identifier-type.dto';

export class AssignPublicationDto {
	projectId: number;
}

export class CreateOwnedPublicationDto {
	title: string;
	authors: string;
	year: number;
	journal: string;
	url: string;
	uniqueId?: string;
	project: AssignPublicationDto;
	source: Exclude<PublicationIdentifierTypeDto, 'unknown'> | 'manual';
	stakeholderIds?: number[];
}

export class CreateOwnedPublicationByIdDto {
	uniqueId: string;
	type: PublicationIdentifierTypeDto;
	project: AssignPublicationDto;
	stakeholderIds?: number[];
}
