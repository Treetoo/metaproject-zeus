import { Injectable } from '@nestjs/common';
import { Publication } from 'resource-manager-database';
import { PublicationDetailDto } from '../dto/publication-detail.dto';
import { PublicationDto } from '../dto/publication.dto';
import { ResearcherWorksListDto } from '../dto/researcher-works.dto';

@Injectable()
export class PublicationMapper {
	public mapCrossRefApiResponseToDto(data: any): PublicationDto {
		return {
			title: data.message.title[0],
			authors: data.message.author.map((author: any) => author.given + ' ' + author.family).join(', '),
			year: data.message.created['date-parts'][0][0],
			uniqueId: data.message.DOI,
			url: data.message.URL || 'https://doi.org/' + data.message.DOI,
			journal: data.message['container-title'][0],
			source: 'doi'
		};
	}

	public mapDataCiteApiResponseToDto(data: any): PublicationDto {
		return {
			title: data.attributes.titles[0].title || 'Missing',
			authors:
				data.attributes.creators.map((author: any) => author.name.replace(',', ' ')).join(', ') || 'Missing',
			year: data.attributes.publicationYear,
			uniqueId: data.attributes.doi,
			url: data.attributes.url ?? 'https://doi.org/' + data.message.DOI,
			journal: data.attributes.publisher || 'Missing',
			source: 'doi'
		};
	}

	public mapPubmedApiResponseToDto(data: any, id: string): PublicationDto {
		const match = data[id].pubdate.match(/^(\d{4})/);
		return {
			title: data[id].title || 'Missing',
			authors: data[id].authors.map((author: any) => author.name).join(', ') || 'Missing',
			year: match ? parseInt(match[1]) : 1900,
			uniqueId: id,
			url: 'https://pubmed.ncbi.nlm.nih.gov/' + id,
			journal: data.fulljournalname || data.source || 'Missing',
			source: 'pubmed'
		};
	}

	public mapNmaApiResponseToDto(data: any): PublicationDto {
		return {
			title: data.metadata.title || 'Missing',
			authors: data.metadata.creators
				.map((author: any) => author.person_or_org.name.replace(',', ' '))
				.join(', '),
			year: new Date(Date.parse(data.metadata.publication_date)).getFullYear(),
			uniqueId: data.pids.oai.identifier,
			url: data.metadata.persistent_url || 'Missing',
			journal: data.metadata.publisher || 'Missing',
			source: 'nma'
		};
	}

	public mapIsbnApiResponseToDto(data: any, isbn: string): PublicationDto {
		const volumeInfo = data.volumeInfo;
		return {
			title: volumeInfo.title,
			authors: volumeInfo.authors?.join(', ') || 'Missing',
			year: new Date(Date.parse(volumeInfo.publishedDate)).getFullYear() ?? 1900,
			uniqueId: isbn,
			url: volumeInfo.canonicalVolumeLink || 'Missing',
			journal: volumeInfo.publisher || 'Missing',
			source: 'isbn'
		};
	}

	public mapArxivApiResponseToDto(data: any, arxivId: string): PublicationDto {
		const entry = data.feed.entry;
		const entries = Array.isArray(entry) ? entry : [entry];
		const paper = entries[0];

		const title = paper.title?.replace(/\n+/g, ' ').trim() || 'Missing';
		const authorsRaw = paper.author || 'Missing';
		const authorsArray = Array.isArray(authorsRaw) ? authorsRaw : authorsRaw ? [authorsRaw] : [];
		const authors = authorsArray.map((a: any) => a.name ?? '').join(', ') || 'Missing';
		const published = paper.published || '';
		const year = parseInt(published.substring(0, 4)) || 1900;
		const url = paper.id || `https://arxiv.org/abs/${arxivId}`;
		const journal_ref = paper['arxiv:journal_ref'] || 'Missing';

		return {
			title,
			authors,
			year,
			uniqueId: arxivId,
			url,
			journal: journal_ref,
			source: 'arxiv'
		};
	}

	public mapOrcidApiResponseToDto(data: any, id: string): ResearcherWorksListDto {
		const works = (data.results || []).map((work: any): PublicationDto => {
			const workId = work.id;
			const title = work.display_name || work.title || '';

			let authors: string = '';
			if (work.authorships && Array.isArray(work.authorships)) {
				authors = work.authorships
					.map((authorship: any) => authorship.author?.display_name || authorship.raw_author_name)
					.filter(Boolean)
					.join(', ');
			}

			const year = work.publication_year;
			const url = work.primary_location?.pdf_url ?? work.primary_location?.landing_page_url ?? 'Missing';

			return {
				title: title || 'Missing',
				authors: authors || 'Missing',
				year: year || 'Missing',
				uniqueId: workId || 'Missing',
				url: url || 'Missing',
				journal: work.primary_location.raw_source_name || 'Missing',
				source: 'orcid'
			};
		});

		return {
			id: id,
			works
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
			uniqueId: publication.uniqueId || 'Missing',
			status: publication.status || 'Missing',
			year: publication.year || 1900,
			url: publication.url || 'Missing',
			reviewerNote: publication.reviewerNote ?? '',
			isOwner: currentUserId ? publication['ownerId'] === currentUserId : false
		};
	}
}
