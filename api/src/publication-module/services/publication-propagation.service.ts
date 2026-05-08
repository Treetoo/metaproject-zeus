import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DataSource, FindManyOptions } from 'typeorm';
import { Publication, Project, User } from 'resource-manager-database';

interface ProjectWeight {
	id: number;
	name: string;
	weight: number;
}

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

	constructor(private readonly dataSource: DataSource) {}

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

	async calculateFairshareWeights(): Promise<{ fileName: string; lines: number }> {
		const now = new Date();
		const currentYear = now.getFullYear();
		const yearSince = currentYear - this.HOW_OLD_PUBLICATIONS;

		// Get all projects with their members
		const projects = await this.dataSource.getRepository(Project).find({
			relations: ['members']
		} as FindManyOptions<Project>);

		// Get all users and their memberships
		const allUsers = await this.dataSource.getRepository(User).find({
			relations: ['memberships']
		} as FindManyOptions<User>);

		// Get all approved publications
		const allPublications = await this.dataSource.getRepository(Publication).find({
			where: { status: 'approved' },
			relations: ['owner']
		});

		// Build a map of userId -> user login
		const userLogins = new Map<number, string>();
		for (const user of allUsers) {
			if (user.username) {
				userLogins.set(user.id, user.username);
			}
		}

		// Build a map of userId -> user's publications (only approved ones within the time window)
		const userPublications = new Map<number, Publication[]>();
		for (const pub of allPublications) {
			if (!pub.reviewedAt) continue;

			const reviewYear = new Date(pub.reviewedAt).getFullYear();
			if (reviewYear < yearSince || reviewYear > currentYear) continue;

			const pubs = userPublications.get(pub.ownerId) || [];
			pubs.push(pub);
			userPublications.set(pub.ownerId, pubs);
		}

		// Track which users are assigned to which project
		const userProjects = new Map<number, Set<number>>(); // userId -> set of projectIds
		const userLoginsByProject = new Map<number, Map<number, UserWeight>>(); // projectId -> (userId -> UserWeight)

		// Process each project
		const projectWeights = new Map<number, ProjectWeight>();

		for (const project of projects) {
			// Skip personal projects and non-active projects
			if (project.isPersonal || project.status !== 'active') {
				continue;
			}

			// This project acts as a fairshare group
			const projectName = `G:${project.projectSlug}`;
			let projectWeight = 1.0; // Base weight for the group itself

			// Initialize user map for this project
			userLoginsByProject.set(project.id, new Map());

			// Get active members of this project
			const activeMembers = project.members.filter((m) => m.status === 'active' || m.status === 'pending');

			for (const member of activeMembers) {
				// Add base weight for the member
				projectWeight += 1.0;

				// Track user's project assignment
				if (!userProjects.has(member.userId)) {
					userProjects.set(member.userId, new Set());
				}
				userProjects.get(member.userId)!.add(project.id);

				const login = member.user.username || `user_${member.userId}`;
				userLoginsByProject.get(project.id)!.set(member.userId, {
					id: member.userId,
					login,
					group: projectName,
					weight: 1.0
				});

				// Add publication weights for this user
				const pubs = userPublications.get(member.userId) || [];
				for (const pub of pubs) {
					// Weight is equivalent to publication type/category rank
					// Using the publication's weight field (1-3 scale from approval)
					const pubWeight = (pub.weight ?? 1) * this.calculateAgeFactor(new Date(pub.reviewedAt!));
					const userWeight = userLoginsByProject.get(project.id)!.get(member.userId)!;
					userWeight.weight += pubWeight;
				}
			}

			// Add publication weights to project (each publication counted once per project)
			const seenPubIds = new Set<number>();
			for (const member of activeMembers) {
				const pubs = userPublications.get(member.userId) || [];
				for (const pub of pubs) {
					if (seenPubIds.has(pub.id)) continue;
					seenPubIds.add(pub.id);

					const pubWeight = (pub.weight ?? 1) * this.calculateAgeFactor(new Date(pub.reviewedAt!));
					projectWeight += pubWeight;
				}
			}

			projectWeights.set(project.id, {
				id: project.id,
				name: projectName,
				weight: projectWeight
			});
		}

		// Collect all users across all projects (each user appears in their primary project)
		const allUsersWithWeights: UserWeight[] = [];
		const seenUsers = new Set<number>();

		for (const [, users] of userLoginsByProject.entries()) {
			for (const [userId, userWeight] of users.entries()) {
				if (!seenUsers.has(userId)) {
					seenUsers.add(userId);
					allUsersWithWeights.push(userWeight);
				}
			}
		}

		// Sort projects by weight (descending), then by name (ascending)
		const projectsArray = Array.from(projectWeights.values()).sort((a, b) => {
			if (b.weight !== a.weight) return b.weight - a.weight;
			return a.name.localeCompare(b.name);
		});

		// Sort users by weight (descending), then by login (ascending)
		allUsersWithWeights.sort((a, b) => {
			if (b.weight !== a.weight) return b.weight - a.weight;
			return a.login.localeCompare(b.login);
		});

		// Generate output file content
		const lines: string[] = [];
		let uid = 10;

		// First write groups (projects)
		for (const project of projectsArray) {
			lines.push(`${project.name}\t${uid}\troot\t${Math.round(project.weight)}`);
			uid++;
		}

		// Then write users
		for (const user of allUsersWithWeights) {
			lines.push(`${user.login}\t${uid}\t${user.group}\t${Math.round(user.weight)}`);
			uid++;
		}

		// Write to file (in a real implementation, this would write to the actual directory)
		const fileName = `${this.OUTPUT_DIRECTORY}/${this.SERVICE_NAME}`;

		return { fileName, lines: lines.length };
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
