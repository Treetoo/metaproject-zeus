import { Injectable } from '@nestjs/common';
import { Publication } from 'resource-manager-database';
import { PublicationDetailDto } from '../dto/publication-detail.dto';

@Injectable()
export class PublicationMapper {
	public mapWorkApiResponseToDto(data: any) {
		return {
			title: data.message.title[0],
			authors: data.message.author.map((author: any) => author.given + ' ' + author.family).join(', '),
			year: data.message.created['date-parts'][0][0],
			uniqueId: data.message.DOI,
			journal: data.message['container-title'][0]
		};
	}

	public mapPublicationToPublicationDetailDto(
		publication: Publication,
		currentUserId?: number
	): PublicationDetailDto {
		return {
			id: publication.id,
			title: publication.title || 'Missing',
			authors: publication.author || 'Missing',
			journal: publication.journal || 'Missing',
			uniqueId: publication.uniqueId,
			status: publication.status,
			url: publication.url || 'Missing',
			year: publication.year ?? 1900,
			isOwner: currentUserId ? publication['ownerId'] === currentUserId : false
		};
	}
}
