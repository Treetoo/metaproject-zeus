import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import { PublicationDto } from '../dto/publication.dto';
import { PublicationNotFoundApiException } from '../../error-module/errors/publications/publication-not-found.api-exception';
import { OrcidNotFoundApiException } from '../../error-module/errors/publications/orcid-not-found.api-exception';
import { PublicationMapper } from '../mapper/publication.mapper';
import { OrcidWorksListDto } from '../dto/orcid-work.dto';

@Injectable()
export class ApiPublicationService {
	private readonly mailTo: string;

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

	async getDoisByOrcid(orcid: string): Promise<OrcidWorksListDto> {
		const response = await this.getWorksByOrcid(orcid);
		return this.publicationMapper.mapOrcidApiResponseToDto(response.data, orcid);
	}

	async getPublicationByDoi(doi: string): Promise<PublicationDto> {
		console.log("ingetpubbydoi")
		const response = await this.getWorkByDoi(doi);
		return this.publicationMapper.mapWorkApiResponseToDto(response.data);
	}

	private async getWorksByOrcid(orcid: string) {
		try {
			return await this.fetchExternalApi(
				'https://api.openalex.org',
				`works?filter=author.orcid:${orcid}`
			);
		} catch (error) {
			if (error.response?.status === 404) {
				throw new OrcidNotFoundApiException();
			}
			throw error;
		}
	}

	private async getWorkByDoi(doi: string) {
		console.log(await this.getDoisByOrcid("0000-0002-8529-9990"))
		console.log("Hello i'm here")
		try {
			return await this.fetchExternalApi(
				'https://api.crossref.org',
				`works/${doi}`
			);
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
			url: `${baseUrl}/${endpoint}`,
			method: 'GET',
			headers: {
				'User-Agent': `ResourceManager/1.0 (mailto:${this.mailTo})`
			},
			timeout: 10000
		});

		return lastValueFrom(response$);
	}
}
