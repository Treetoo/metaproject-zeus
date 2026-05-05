import { Controller, Post, Body, HttpCode, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags, ApiHeader } from '@nestjs/swagger';
import { Public } from '../../auth-module/decorators/public.decorator';
import { PerunWebhookGuard } from '../guards/perun-webhook.guard';
import { PerunDataDto } from '../dto/perun-data.dto';
import { PerunDataService } from '../services/perun-data.service';

@Controller('perun/webhook')
@ApiTags('Perun Webhook')
@Public()
@UseGuards(PerunWebhookGuard)
export class PerunWebhookController {
	constructor(private readonly perunDataService: PerunDataService) {}

	@Post('data')
	@HttpCode(200)
	@ApiOperation({
		summary: 'Receive Perun data with ORCID',
		description:
			'Endpoint to receive data from Perun containing ORCID information. This endpoint is designed to be called by the generic_sender.py script from Perun. Requires Basic Auth authentication configured via PERUN_WEBHOOK_SECRET environment variable.'
	})
	@ApiHeader({
		name: 'Authorization',
		required: true,
		description: 'Basic Auth credentials for Perun webhook authentication',
		schema: { type: 'string', example: 'Basic <base64-encoded-credentials>' }
	})
	async receivePerunData(@Body() data: PerunDataDto) {
		return this.perunDataService.processPerunData(data);
	}
}
