import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ProjectModule } from '../project-module/project.module';
import { ApiConfigModule } from '../config-module/api-config.module';
import { ApiPublicationService } from './services/api-publication.service';
import { PublicationSearchController } from './controllers/publication-search.controller';
import { PublicationMapper } from './mapper/publication.mapper';
import { PublicationService } from './services/publication.service';
import { PublicationController } from './controllers/publication.controller';
import { ProjectPublicationController } from './controllers/project-publication.controller';
import { UserPublicationController } from './controllers/user-publication.controller';
import { PublicationModel } from './models/publication.model';
import { ProjectPublicationModel } from './models/project-publication.model';
import { PublicationRequestController } from './controllers/publication-request.controller';
import { PublicationCreditController } from './controllers/publication-credit.controller';
import { ResearcherService } from './services/researcher.service';
import { PublicationPropagationService } from './services/publication-propagation.service';
import { PublicationPropagationController } from './controllers/publication-propagation.controller';
import { PublicationRequestService } from './services/publication-request.service';
import { PublicationCreditService } from './services/publication-credit.service';

@Module({
	imports: [HttpModule, ProjectModule, ApiConfigModule],
	exports: [],
	providers: [
		ApiPublicationService,
		PublicationMapper,
		PublicationService,
		PublicationModel,
		ProjectPublicationModel,
		PublicationRequestService,
		PublicationCreditService,
		ResearcherService,
		PublicationPropagationService
	],
	controllers: [
		PublicationSearchController,
		PublicationController,
		ProjectPublicationController,
		UserPublicationController,
		PublicationRequestController,
		PublicationCreditController,
		PublicationPropagationController
	]
})
export class PublicationModule { }
