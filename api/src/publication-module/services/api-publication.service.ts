import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { XMLParser } from 'fast-xml-parser';
import { lastValueFrom } from 'rxjs';
import * as dotenv from 'dotenv';
import { PublicationDto } from '../dto/publication.dto';
import { PublicationNotFoundApiException } from '../../error-module/errors/publications/publication-not-found.api-exception';
import { PublicationMapper } from '../mapper/publication.mapper';
import { ResearcherWorksListDto } from '../dto/researcher-works.dto';
import { PublicationIdentifierTypeDto } from '../dto/identifier-type.dto';
import { ApiException } from 'src/error-module/api-exception';

type DoiResolver = {
	name: string;
	baseUrl: string;
	endpoint: (doi: string) => string;
	mapper: (data: any) => PublicationDto;
};

@Injectable()
export class ApiPublicationService {
	private readonly mailTo: string;
	private readonly resolvers: DoiResolver[] = [
		{
			name: 'crossref',
			baseUrl: 'https://api.crossref.org',
			endpoint: (doi) => `works/${doi}`,
			mapper: (data) => this.publicationMapper.mapCrossRefApiResponseToDto(data)
		},
		{
			name: 'datacite',
			baseUrl: 'https://api.datacite.org',
			endpoint: (doi) => `dois/${doi}`,
			mapper: (data) => this.publicationMapper.mapDataCiteApiResponseToDto(data.data)
		}
	];

	constructor(
		private readonly httpService: HttpService,
		configService: ConfigService,
		private readonly publicationMapper: PublicationMapper
	) {
		const mailTo = configService.get<string>('API_PUBLICATION_MAIL_TO');

		if (!mailTo) {
			throw new Error('API_PUBLICATION_MAIL_TO is not defined in the environment');
		}

		this.mailTo = mailTo;
	}

	async getPublicationByIdAndType(id: string, type: PublicationIdentifierTypeDto): Promise<PublicationDto> {
		if (type === 'doi') return await this.getPublicationByDoi(id);
		if (type === 'arxiv') return await this.getPublicationByArxivId(id);
		if (type === 'pubmed') return await this.getPublicationByPubmedId(id);
		if (type === 'nma') return await this.getPublicationByNma(id);
		if (type === 'isbn') return await this.getPublicationByIsbn(id);

		throw new ApiException(400, "Invalid identifier type", 400);
	}

	async getPublicationsByResearcherIdAndType(id: string, type: string): Promise<ResearcherWorksListDto> {
		console.log(type);
		if (type === 'orcid') return await this.getWorksByOrcidId(id);
		if (type === 'openalex') { } // TODO:

		throw new ApiException(400, "Invalid identifier type", 400);
	}


	async getPublicationByPubmedId(pmid: string): Promise<PublicationDto> {
		const baseUrl = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';
		const endPoint = `esummary.fcgi?db=pubmed&id=${pmid}&retmode=json`;
		const response = await this.fetchExternalApi(baseUrl, endPoint);
		return this.publicationMapper.mapPubmedApiResponseToDto(response.data.result, pmid);
	}

	async getPublicationByIsbn(isbn: string): Promise<PublicationDto> {
		dotenv.config();
		const baseUrl = 'https://www.googleapis.com/books/v1';
		const endPoint = `volumes?q=isbn:${isbn}&key=${process.env['GOOGLE_BOOKS_API']}`;
		const response = await this.fetchExternalApi(baseUrl, endPoint);
		return this.publicationMapper.mapIsbnApiResponseToDto(response.data.items[0], isbn);
	}

	async getPublicationByArxivId(arxiv: string): Promise<PublicationDto> {
		const baseUrl = 'http://export.arxiv.org/api';
		const endPoint = `query?id_list=${arxiv}`;
		const response = await this.fetchExternalApi(baseUrl, endPoint);
		const parser = new XMLParser();
		const xmlData = parser.parse(response.data);
		return this.publicationMapper.mapArxivApiResponseToDto(xmlData, arxiv);
	}

	async getPublicationByDoi(doi: string): Promise<PublicationDto> {
		for (const resolver of this.resolvers) {
			try {
				const response = await this.fetchExternalApi(resolver.baseUrl, resolver.endpoint(doi));
				return resolver.mapper(response.data);
			} catch (error) {
				if (error instanceof PublicationNotFoundApiException) {
					continue;
				}
				throw error;
			}
		}
		throw new PublicationNotFoundApiException();
	}

	async getPublicationByNma(nma: string): Promise<PublicationDto> {
		const response = await this.fetchExternalApi(nma, '');
		return this.publicationMapper.mapNmaApiResponseToDto(response.data);
	}

	private async getWorksByOrcidId(id: string) {
		const base = 'https://api.openalex.org';
		const endpoint = `works?filter=author.orcid:${id}`;
		const response = await this.fetchExternalApi(base, endpoint);
		return this.publicationMapper.mapOrcidApiResponseToDto(response.data, id);
	}

	// TODO: Check if its usefull
	// private async fetchExternalApi(baseUrl: string, endpoint: string) {
	// 	try {
	// 		return await this.fetchExternalApi(baseUrl, endpoint);
	// 	} catch (error) {
	// 		if (error.response?.status === 404) {
	// 			throw new PublicationNotFoundApiException();
	// 		}
	// 		throw error;
	// 	}
	// }

	// Generic HTTP layer
	private async fetchExternalApi(baseUrl: string, endpoint: string) {
		const response$ = this.httpService.request({
			url: baseUrl + (endpoint ? `/${endpoint}` : ''),
			method: 'GET',
			headers: {
				'User-Agent': `ResourceManager/1.0 (mailto:${this.mailTo})`
			},
			timeout: 10000
		});

		return lastValueFrom(response$);
	}
}
