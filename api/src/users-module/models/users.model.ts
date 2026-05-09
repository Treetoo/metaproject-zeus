import { DataSource } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { Role, User } from 'resource-manager-database';

@Injectable()
export class UsersModel {
	constructor(private readonly dataSource: DataSource) {}

	async findUserById(id: number): Promise<User | null> {
		return this.dataSource.getRepository(User).findOne({
			relations: {
				role: true,
				orcids: true
			},
			where: {
				id
			}
		});
	}

	async findUserByExternalId(externalId: string): Promise<User | null> {
		return this.dataSource.getRepository(User).findOne({
			relations: {
				role: true,
				orcids: true
			},
			where: {
				externalId
			}
		});
	}

	async getUserRole(id: number): Promise<Role | null> {
		const user = await this.dataSource.getRepository(User).findOne({
			where: {
				id
			},
			relations: ['role']
		});

		if (!user) {
			return null;
		}

		return user.role;
	}

	async searchUsers(query: string): Promise<User[]> {
		const repo = this.dataSource.getRepository(User);
		const qb = repo.createQueryBuilder('u');

		if (query && query.length >= 3) {
			qb.where('(u.name ILIKE :q OR u.username ILIKE :q OR u.email ILIKE :q)', {
				q: `%${query}%`
			});
		}

		return qb.take(50).getMany();
	}
}
