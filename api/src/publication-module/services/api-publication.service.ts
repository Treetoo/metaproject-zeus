import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import { PublicationDto } from '../dto/publication.dto';
import { PublicationNotFoundApiException } from '../../error-module/errors/publications/publication-not-found.api-exception';
import { ResearcherIdNotFoundApiException } from '../../error-module/errors/publications/researcher-id-not-found.api-exception';
import { PublicationMapper } from '../mapper/publication.mapper';
import { ResearcherWorksListDto } from '../dto/researcher-works.dto';
import { type PublicationInputDto } from '../dto/input/publication-input.dto';

type DoiResolver = {
	name: string;
	baseUrl: string;
	endpoint: (doi: string) => string;
	mapper: (data: any) => PublicationDto
}

@Injectable()
export class ApiPublicationService {
	private readonly mailTo: string;
	private readonly resolvers: DoiResolver[] = [
		{
			name: 'crossref',
			baseUrl: 'https://api.crossref.org',
			endpoint: (doi) => `works/${doi}`,
			mapper: (data) => this.publicationMapper.mapCrossRefApiResponseToDto(data),
		},
		{
			name: 'datacite',
			baseUrl: 'https://api.datacite.org',
			endpoint: (doi) => `dois/${doi}`,
			mapper: (data) => this.publicationMapper.mapDataCiteApiResponseToDto(data.data),
		}
	]

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


	async getPublicationById(id: string): Promise<PublicationDto> {
		let publication: PublicationDto;

		const patterns = {
			DOI: /^10\.\d{4,9}\/[-._;()/:A-Z0-9]+$/i,
			HANDLE: /^(hdl:)?\d+(\.\d+)*\/.+$/i,
			ARK: /^ark:\/\d+\/.+$/i,
			PUBMED: /^(PMID:\s*)?\d+$/i,
			NMA: /^https:\/\/nma\.eosc\.cz\/.*/,// adjust if you have a stricter format
		};



		if (patterns.DOI.test(id)) publication = await this.getPublicationByDoi(id)
		else if (patterns.HANDLE.test(id)) console.log("in handle");
		// if (patterns.ARK.test(id)) return "ARK";
		else if (patterns.PUBMED.test(id)) publication = await this.getPublicationByPubmedId(id);
		if (patterns.NMA.test(id)) publication = await this.getPublicationByNma(id);

		createPublication

		return this.getPublicationByDoi(id)
	}

	async getPublicationsByResearcherId(orcid: string): Promise<ResearcherWorksListDto> {
		const response = await this.getWorksByResearcherId(orcid);
		return this.publicationMapper.mapOrcidApiResponseToDto(response.data, orcid);
	}

	async getPublicationByPubmedId(pmid: string): Promise<PublicationDto> {
		const baseUrl = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';
		const endPoint = `esummary.fcgi?db=pubmed&id=${pmid}&retmode=json`;
		const response = await this.fetchPubIdResolver(baseUrl, endPoint);
		return this.publicationMapper.mapPubmedApiResponseToDto(response.data.result, pmid);
	}

	async getPublicationByIsbn(isbn: string): Promise<PublicationDto> {
		const baseUrl = 'https://www.googleapis.com/books/v1/';
		const endPoint = `volumes?q=isbb:${isbn}`;
		const response = await this.fetchPubIdResolver(baseUrl, endPoint);
		return this.publicationMapper.mapPubmedApiResponseToDto(response.data.items[0], isbn);
	}

	async getPublicationByDoi(doi: string): Promise<PublicationDto> {
		for (const resolver of this.resolvers) {
			try {
				const response = await this.fetchPubIdResolver(resolver.baseUrl, resolver.endpoint(doi));
				return resolver.mapper(response.data);
			} catch (error) {
				if (error instanceof PublicationNotFoundApiException) {
					continue;
				}
				throw error;
			}
		}
		throw new PublicationNotFoundApiException;
	}

	async getPublicationByNma(nma: string): Promise<PublicationDto> {
		const response = await this.fetchPubIdResolver(nma, "");
		return this.publicationMapper.mapNmaApiResponseToDto(response.data);
	}

	private async getWorksByResearcherId(id: string) {
		try {
			return await this.fetchExternalApi(
				'https://api.openalex.org',
				`works?filter=author.id:${id}`
			);
		} catch (error) {
			if (error.response?.status === 404) {
				throw new ResearcherIdNotFoundApiException();
			}
			throw error;
		}
	}

	private async fetchPubIdResolver(baseUrl: string, endpoint: string) {
		try {
			return await this.fetchExternalApi(baseUrl, endpoint);
		} catch (error) {
			if (error.response?.status === 404) {
				throw new PublicationNotFoundApiException();
			}
			throw error;
		}
	}

	// Generic HTTP layer
	private async fetchExternalApi(baseUrl: string, endpoint: string) {
		const response$ = this.httpService.request({
			url: baseUrl + (endpoint ? `/${endpoint}` : ""),
			method: 'GET',
			headers: {
				'User-Agent': `ResourceManager/1.0 (mailto:${this.mailTo})`
			},
			timeout: 10000
		});

		return lastValueFrom(response$);
	}
}
