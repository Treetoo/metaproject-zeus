import { Column, Entity, Index, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { User } from './user';

@Entity()
@Unique(['userId', 'orcid'])
export class Orcid {
	@PrimaryGeneratedColumn()
	id: number;

	@Index()
	@Column()
	userId: number;

	@ManyToOne(() => User, user => user.orcids)
	user: User;

	@Column({ nullable: true })
	orcid: string;
}
