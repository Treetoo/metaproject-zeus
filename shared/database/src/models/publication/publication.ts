import { Column, Entity, Index, ManyToOne, OneToMany, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { TimeEntity } from '../time-entity';
import { Project } from '../project/project';
import { User } from '../user/user';
import { ProjectPublication } from './project-publication';

export type PublicationSource = 'manual' | 'doi';

@Entity()
// Original code:
// @Unique(['uniqueId', 'projectId'])
@Unique(['ownerId', 'uniqueId'])
export class Publication {
	@PrimaryGeneratedColumn()
	id: number;

	@Column({
		length: 4096
	})
	title: string;

	@Column({
		length: 4096
	})
	author: string;

	@Column({ unsigned: true })
	year: number;

	@Column()
	uniqueId: string;

	@Column()
	journal: string;

	@Column()
	source: PublicationSource;

	// Owner of the publication (who registered it)
	@Column()
	@Index()
	ownerId: number;

	@ManyToOne(() => User)
	owner: User;

	// Project association is now optional
	@Column({ nullable: true })
	@Index()
	projectId: number | null;

	@ManyToOne(() => Project)
	project: Project;

	@OneToMany(() => ProjectPublication, (link) => link.publication)
	projectLinks: ProjectPublication[];

	@Column(() => TimeEntity)
	time: TimeEntity;
}
