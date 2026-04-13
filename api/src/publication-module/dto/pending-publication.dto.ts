import { ApiProperty } from '@nestjs/swagger';

export class PendingPublicationDto {
	@ApiProperty()
	id: number;                    // ProjectPublication ID

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

	@ApiProperty({ enum: ['pending', 'approved', 'rejected'] })
	status: string;

	@ApiProperty()
	projectId: number;

	@ApiProperty()
	projectName: string;

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
