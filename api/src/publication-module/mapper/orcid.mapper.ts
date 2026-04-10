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
			title: publication.title,
			authors: publication.author,
			journal: publication.journal,
			uniqueId: publication.uniqueId,
			year: publication.year,
			isOwner: currentUserId ? publication['ownerId'] === currentUserId : false
		};
	}
}
