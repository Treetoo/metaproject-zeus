import { PublicationIdentifierTypeDto } from '../identifier-type.dto';

export class AssignPublicationDto {
	projectId: number;
}

export type CreditorInput = {
	userId: number;
	fairShareEligible: boolean;
	isStakeholder: boolean;
};

export class CreateOwnedPublicationDto {
	title: string;
	authors: string;
	year: number;
	journal: string;
	url: string;
	uniqueId?: string;
	project: AssignPublicationDto;
	source: Exclude<PublicationIdentifierTypeDto, 'unknown'> | 'manual';
	creditors?: CreditorInput[];
}

export class CreateOwnedPublicationByIdDto {
	uniqueId: string;
	type: PublicationIdentifierTypeDto;
	project: AssignPublicationDto;
	creditors?: CreditorInput[];
}
