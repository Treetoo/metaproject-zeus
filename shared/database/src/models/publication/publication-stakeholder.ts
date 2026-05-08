import { Column, Entity, Index, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { TimeEntity } from '../time-entity';
import { Publication } from './publication';
import { User } from '../user/user';

@Entity()
@Unique(['publicationId', 'userId'])
export class PublicationStakeholder {
	@PrimaryGeneratedColumn()
	id: number;

	@ManyToOne(() => Publication, (publication) => publication.stakeholders)
	@Index()
	publication: Publication;

	@Column()
	publicationId: number;

	@ManyToOne(() => User)
	@Index()
	user: User;

	@Column()
	userId: number;

	@Column(() => TimeEntity)
	time: TimeEntity;
}
