import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { User, Orcid } from 'resource-manager-database';
import { PerunDataDto } from '../dto/perun-data.dto';

@Injectable()
export class PerunDataService {
	private readonly logger = new Logger(PerunDataService.name);

	constructor(private readonly dataSource: DataSource) {}

	async processPerunData(data: PerunDataDto): Promise<{ success: boolean; message: string; processed: number }> {
		const users = data.users;
		let processed = 0;

		for (const [perunUserId, userEntry] of Object.entries(users)) {
			const orcidArray = userEntry.attributes?.['urn:perun:user:attribute-def:virt:eduPersonORCID'] || [];
			const persistentLogin =
				userEntry.attributes?.['urn:perun:user:attribute-def:virt:login-namespace:einfraid-persistent'];

			if (!persistentLogin) {
				this.logger.warn(`No persistent login for Perun user ${perunUserId}, skipping`);
				continue;
			}

			const user = await this.dataSource.getRepository(User).findOne({
				where: {
					source: 'perun',
					externalId: persistentLogin
				}
			});

			if (!user) {
				this.logger.warn(`User not found for externalId: ${persistentLogin}`);
				continue;
			}

			const existingOrcids = await this.dataSource.getRepository(Orcid).find({
				where: { userId: user.id }
			});

			const existingOrcidSet = new Set(existingOrcids.map((o) => o.orcid));
			const newOrcids: string[] = [];

			for (const rawOrcid of orcidArray) {
				const orcid = rawOrcid.replace(/^https?:\/\/orcid\.org\//, '');
				if (!existingOrcidSet.has(orcid)) {
					newOrcids.push(orcid);
					existingOrcidSet.add(orcid);
				}
			}

			for (const oldOrcid of existingOrcidSet) {
				if (!orcidArray.some((r) => r.replace(/^https?:\/\/orcid\.org\//, '') === oldOrcid)) {
					await this.dataSource.getRepository(Orcid).delete({ userId: user.id, orcid: oldOrcid });
				}
			}

			for (const orcid of newOrcids) {
				await this.dataSource.getRepository(Orcid).save({ userId: user.id, orcid });
				this.logger.log(`Added ORCID ${orcid} for user ${user.username} (${user.id})`);
			}

			if (newOrcids.length === 0) {
				this.logger.debug(`ORCIDs already up to date for user ${user.username}`);
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
