import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { HttpModule } from '@nestjs/axios';
import { UsersModule } from '../users-module/users.module';
import { ProjectModule } from '../project-module/project.module';
import { AuthGuard } from './guards/auth.guard';
import { AuthService } from './services/auth.service';
import { AuthController } from './controllers/auth.controller';
import { OidcService } from './services/oidc.service';
import { TokenService } from './services/token.service';
import { TokenCache } from './cache/token.cache';
import { AuthMapper } from './mapper/auth.mapper';

@Module({
	providers: [
		{
			provide: APP_GUARD,
			useClass: AuthGuard
		},
		AuthService,
		OidcService,
		TokenService,
		TokenCache,
		AuthMapper
	],
	controllers: [AuthController],
	imports: [UsersModule, HttpModule, ProjectModule]
})
export class AuthModule {}
