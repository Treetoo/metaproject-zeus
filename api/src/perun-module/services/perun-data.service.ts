import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { User } from 'resource-manager-database';
import { PerunDataDto } from '../dto/perun-data.dto';

@Injectable()
export class PerunDataService {
	private readonly logger = new Logger(PerunDataService.name);

	constructor(private readonly dataSource: DataSource) {}

	async processPerunData(data: PerunDataDto): Promise<{ success: boolean; message: string; processed: number }> {
		const users = data.users;
		let processed = 0;

		for (const userEntry of users) {
			const orcid = userEntry.attributes?.['urn:perun:user:attribute-def:def:orcid'];

			if (!orcid) {
				this.logger.warn(`No ORCID found for user ${userEntry.userName} (${userEntry.userId})`);
				continue;
			}

			const user = await this.dataSource.getRepository(User).findOne({
				where: {
					source: 'perun',
					externalId: userEntry.userId
				}
			});

			if (!user) {
				this.logger.warn(`User not found for externalId: ${userEntry.userId}`);
				continue;
			}

			if (user.orcid !== orcid) {
				user.orcid = orcid;
				await this.dataSource.getRepository(User).save(user);
				this.logger.log(`Updated ORCID ${orcid} for user ${user.username} (${user.id})`);
			} else {
				this.logger.debug(`ORCID ${orcid} already set for user ${user.username}`);
			}

			processed++;
		}

		return {
			success: true,
			message: `Processed ${processed} users with ORCID data`,
			processed
		};
	}
}
