import { Column, Entity, Index, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { TimeEntity } from '../time-entity';
import { Project } from '../project/project';
import { Publication } from './publication';
import { User } from '../user/user';

@Entity()
@Unique(['projectId', 'publicationId'])
export class ProjectPublication {
	@PrimaryGeneratedColumn()
	id: number;

	@Column({
		type: 'enum',
		enum: ['pending', 'approved', 'rejected'],
		default: 'pending'
	})
	status: 'pending' | 'approved' | 'rejected';

	@Column({ type: 'int', nullable: true })
	weight: number | null;

	@Column({ nullable: true })
	reviewerId: number | null;

	@Column({ type: 'timestamp', nullable: true })
	reviewedAt: Date | null;

	@Column()
	@Index()
	projectId: number;

	@Column()
	@Index()
	publicationId: number;

	@Column()
	@Index()
	addedByUserId: number;

	@ManyToOne(() => Project, { onDelete: 'CASCADE' })
	project: Project;

	@ManyToOne(() => Publication, (publication) => publication.projectLinks, { onDelete: 'CASCADE' })
	publication: Publication;

	@ManyToOne(() => User)
	addedByUser: User;

	@Column(() => TimeEntity)
	time: TimeEntity;
}
