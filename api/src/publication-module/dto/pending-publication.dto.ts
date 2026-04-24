import { ApiProperty } from '@nestjs/swagger';

export class PendingPublicationDto {
	@ApiProperty()
	id: number;

	@ApiProperty()
	publicationId: number;

	@ApiProperty()
	title: string;

	@ApiProperty()
	authors: string;

	@ApiProperty()
	year: number;

	@ApiProperty()
	journal: string;

	@ApiProperty()
	uniqueId: string;

	@ApiProperty()
	url: string;

	@ApiProperty({ enum: ['pending', 'approved', 'rejected'] })
	status: string;

	@ApiProperty()
	requestedBy: number;

	@ApiProperty()
	createdAt: Date;
}

export class PendingPublicationListDto {
	@ApiProperty({ type: [PendingPublicationDto] })
	data: PendingPublicationDto[];

	@ApiProperty()
	metadata: any;
}
