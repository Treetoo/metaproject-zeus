import { Module } from '@nestjs/common';
import { PerunModule } from '../perun-module/perun.module';
import { UsersModel } from './models/users.model';
import { UserMapper } from './services/user.mapper';
import { UserOrcidController } from './controllers/user-orcid.controller';

@Module({
	imports: [PerunModule],
	controllers: [UserOrcidController],
	providers: [UsersModel, UserMapper],
	exports: [UsersModel, UserMapper]
})
export class UsersModule {}
