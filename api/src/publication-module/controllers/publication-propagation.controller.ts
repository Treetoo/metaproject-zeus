import { Controller, Post, Res } from '@nestjs/common';
import { ApiOperation, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { PublicationPropagationService } from '../services/publication-propagation.service';
import { MinRoleCheck } from '../../permission-module/decorators/min-role.decorator';
import { RoleEnum } from '../../permission-module/models/role.enum';

@Controller('publications/propagation')
@ApiTags('Publication Propagation')
@ApiBearerAuth()
export class PublicationPropagationController {
	constructor(private readonly propagationService: PublicationPropagationService) {}

	@Post()
	@MinRoleCheck(RoleEnum.ADMIN)
	@ApiOperation({
		summary: 'Manually trigger publication propagation',
		description: 'Triggers the fairshare weight calculation for all users based on their stakeholder publications. Admin only. Returns the generated file content.'
	})
	async triggerPropagation(@Res() res: Response) {
		const result = await this.propagationService.calculateFairshareWeights();

		res.setHeader('Content-Type', 'text/plain');
		res.setHeader('Content-Disposition', `attachment; filename="${this.propagationService.getFileName()}"`);
		res.send(result.content);
	}
}
