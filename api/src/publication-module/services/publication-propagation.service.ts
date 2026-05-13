import * as fs from 'fs';
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DataSource } from 'typeorm';
import { User, PublicationStakeholder } from 'resource-manager-database';

interface UserWeight {
	id: number;
	login: string;
	group: string;
	weight: number;
}

@Injectable()
export class PublicationPropagationService {
	private readonly logger = new Logger(PublicationPropagationService.name);
	private readonly HOW_OLD_PUBLICATIONS = 3; // in years
	private readonly OUTPUT_DIRECTORY = '/tmp/perun';
	private readonly SERVICE_NAME = 'pbs_publication_fairshare';

	constructor(private readonly dataSource: DataSource) { }

	@Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
	async propagatePublications() {
		this.logger.log('Starting publication propagation for fairshare calculation');
		try {
			const result = await this.calculateFairshareWeights();
			this.logger.log(
				`Propagation completed successfully. Written ${result.lines} entries to ${result.fileName}`
			);
		} catch (error) {
			this.logger.error(`Publication propagation failed: ${error.message}`, error.stack);
			throw error;
		}
	}

	async calculateFairshareWeights(): Promise<{ fileName: string; lines: number; content: string }> {
		const now = new Date();
		const currentYear = now.getFullYear();
		const yearSince = currentYear - this.HOW_OLD_PUBLICATIONS;

		// Get all users
		const allUsers = await this.dataSource.getRepository(User).find();

		// Build a map of userId -> user login
		const userLogins = new Map<number, string>();
		for (const user of allUsers) {
			if (user.username) {
				userLogins.set(user.id, user.username);
			}
		}

		// For each user: user.weight = 1 + sum(
		//   publication(stakeholder.pubid).weight * weight_decay(publication(stakeholder.pubid)) * stakeholder.weight
		// ) for all approved stakeholder records within time window
		const allUsersWithWeights: UserWeight[] = [];

		for (const user of allUsers) {
			// Get all approved stakeholder records for this user
			const stakeholderRecords = await this.dataSource.getRepository(PublicationStakeholder).find({
				where: {
					userId: user.id,
					status: 'approved'
				},
				relations: ['publication']
			});

			let userWeight = 1; // Start with base weight of 1

			for (const stakeholder of stakeholderRecords) {
				const pub = stakeholder.publication;

				// Only consider approved publications
				if (pub.status !== 'approved' || !pub.reviewedAt) continue;

				// Check if publication is within the time window
				const reviewYear = new Date(pub.reviewedAt).getFullYear();
				if (reviewYear < yearSince || reviewYear > currentYear) continue;

				// Calculate decay factor
				const decay = this.calculateAgeFactor(new Date(pub.reviewedAt));

				// publication.weight * decay * stakeholder.weight
				const pubWeight = pub.weight ?? 1;
				const stakeholderWeight = stakeholder.weight ?? 1;
				const contribution = pubWeight * decay * stakeholderWeight;

				userWeight += contribution;
			}

			// Only include users with weight > 1 (i.e., they have stakeholder publications)
			const login = userLogins.get(user.id) || `user_${user.id}`;
			allUsersWithWeights.push({
				login,
				id: user.id,
				group: 'root',
				weight: userWeight
			});
		}

		// Log results
		this.logger.log(`Processed ${allUsers.length} users`);
		this.logger.log(`${allUsersWithWeights.length} users have stakeholder publication weights`);

		// Sort users by weight (descending), then by login (ascending)
		allUsersWithWeights.sort((a, b) => {
			if (b.weight !== a.weight) return b.weight - a.weight;
			return a.login.localeCompare(b.login);
		});

		// Generate output file content
		const lines: string[] = [];
		let uid = 10;

		// Write users
		for (const user of allUsersWithWeights) {
			lines.push(`${user.login}\t${uid}\t${user.group}\t${Math.round(user.weight)}`);
			uid++;
		}

		const content = lines.join('\n');

		// Ensure output directory exists
		if (!fs.existsSync(this.OUTPUT_DIRECTORY)) {
			fs.mkdirSync(this.OUTPUT_DIRECTORY, { recursive: true });
		}

		// Write to file
		const fileName = `${this.OUTPUT_DIRECTORY}/${this.SERVICE_NAME}`;
		fs.writeFileSync(fileName, content);

		this.logger.log(`File written to ${fileName} with ${lines.length} entries`);

		return { fileName, lines: lines.length, content };
	}

	getFileName(): string {
		return `${this.SERVICE_NAME}_${new Date().toISOString().split('T')[0]}.txt`;
	}

	/**
	 * Calculate age factor for publication weight decay.
	 * Publications lose weight as they get older, following the formula:
	 * (1 - ((currentYear - approvedYear - 1) / HOW_OLD_PUBLICATIONS))
	 */
	private calculateAgeFactor(reviewedAt: Date): number {
		const reviewYear = reviewedAt.getFullYear();
		const currentYear = new Date().getFullYear();
		const ageFactor = 1 - (currentYear - reviewYear - 1) / this.HOW_OLD_PUBLICATIONS;
		return Math.max(0, ageFactor); // Ensure non-negative
	}
}
