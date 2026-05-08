import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bullmq';
import { PerunApiService } from './services/perun-api.service';
import { PerunGroupService } from './services/managers/perun-group.service';
import { PerunFacade } from './perun.facade';
import { PerunGroupConsumer } from './consumers/perun-group.consumer';
import { PerunMembersService } from './services/managers/perun-members.service';
import { PerunAttributesService } from './services/managers/perun-attributes.service';
import { PerunAuthzService } from './services/managers/perun-authz.service';
import { FailedStageModel } from './models/failed-stage.model';
import { PerunRegistrarService } from './services/managers/perun-registrar.service';
import { PerunFailedGroupsController } from './controllers/perun-failed-groups.controller';
import { FailedStageService } from './services/failed-stage.service';
import { FailedStageMapper } from './mappers/failed-stage.mapper';
import { PerunInvitationsConsumer } from './consumers/perun-invitations.consumer';
import { PerunInvitationsService } from './services/managers/perun-invitations.service';
import { PerunWebhookController } from './controllers/perun-webhook.controller';
import { PerunDataService } from './services/perun-data.service';

@Module({
	imports: [
		HttpModule,
		BullModule.registerQueue({
			name: 'perunGroup'
		}),
		BullModule.registerQueue({
			name: 'perunInvitations'
		})
	],
	exports: [PerunFacade],
	providers: [
		FailedStageModel,
		PerunApiService,
		PerunGroupService,
		PerunFacade,
		PerunGroupConsumer,
		PerunInvitationsConsumer,
		PerunMembersService,
		PerunAttributesService,
		PerunAuthzService,
		PerunRegistrarService,
		PerunInvitationsService,
		FailedStageService,
		FailedStageMapper,
		PerunDataService
	],
	controllers: [PerunFailedGroupsController, PerunWebhookController]
})
export class PerunModule {}
