import { Column, Entity, Index, ManyToOne, OneToMany, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { TimeEntity } from '../time-entity';
import { Project } from '../project/project';
import { User } from '../user/user';
import { PublicationCredit } from './publication-credit';
import { PublicationStakeholder } from './publication-stakeholder';

export type PublicationSource = 'manual' | 'doi' | 'pubmed' | 'isbn' | 'nma';

@Entity()
@Unique(['ownerId', 'uniqueId'])
export class Publication {
	@PrimaryGeneratedColumn()
	id: number;

	@Column({
		length: 8192
	})
	title: string;

	@Column({
		length: 8192
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

	@Column({
		type: 'enum',
		enum: ['pending', 'approved', 'rejected'],
		default: 'pending'
	})
	status: 'pending' | 'approved' | 'rejected';

	@Column({ nullable: true })
	reviewerId: number | null;

	@Column({ type: 'timestamp', nullable: true })
	reviewedAt: Date | null;

	@Column({ type: 'float', nullable: true })
	weight: number | null;

	@Column({ nullable: true, length: 8192 })
	reviewerNote: string | null;

	@Column({ length: 2048 })
	url: string;

	@ManyToOne(() => User)
	owner: User;

	@OneToMany(() => PublicationCredit, (credit) => credit.publication)
	credits: PublicationCredit[];

	@OneToMany(() => PublicationStakeholder, (stakeholder) => stakeholder.publication)
	stakeholders: PublicationStakeholder[];

	// Each publication belongs to exactly one project
	@Column({ nullable: true })
	@Index()
	projectId: number | null;

	@ManyToOne(() => Project)
	project: Project;

	@Column(() => TimeEntity)
	time: TimeEntity;
}
