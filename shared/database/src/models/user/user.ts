import { Column, Entity, Index, ManyToOne, OneToMany, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { TimeEntity } from '../time-entity';
import { Role } from './role';
import { Project } from '../project/project';
import { ProjectUser } from '../project/project-user';

@Entity()
@Unique("externalLogin", ["source", "externalId"])
@Unique("externalEmail", ["source", "email"])
export class User {
	@PrimaryGeneratedColumn()
	id: number;

	@Column({enum: ['perun']})
	source: string;

	@Column({nullable: true})
	@Index()
	externalId: string;

	@Column({ nullable: false })
	@Index()
	email: string;

	@Column({ default: false })
	emailVerified: boolean;

	@Column({ nullable: true })
	username: string;

	@Column({ nullable: true })
	name: string;

	@Column({ nullable: true })
	orcid: string;

	@Column({ nullable: true })
	locale: string;

	@Column()
	roleId: number;

	@ManyToOne(() => Role, role => role.users)
	role: Role;

	@OneToMany(() => Project, project => project.pi)
	assignedProjects: Project[];

	@Column(() => TimeEntity)
	time: TimeEntity;

	@OneToMany(() => ProjectUser, projectUser => projectUser.user)
	memberships: ProjectUser[];
}