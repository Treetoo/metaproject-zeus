import * as path from 'node:path';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { json } from 'express';
import { RedocModule } from 'nest-redoc';
import { AppModule } from './app.module';
import { AppService } from './app.service';

async function bootstrap() {
	AppService.APP_ROOT = path.join(path.resolve(__dirname), '..', '..');

	const app = await NestFactory.create(AppModule);
	const configService = app.get(ConfigService);
	const applicationMode = configService.getOrThrow('APPLICATION_MODE');
	const isDevelopmentMode = applicationMode === 'development';

	// register validation pipe to protect all endpoints
	app.useGlobalPipes(
		new ValidationPipe({
			transform: true,
			disableErrorMessages: !isDevelopmentMode
		})
	);

	app.enableCors({
		origin: configService.getOrThrow('CORS_ALLOW_ORIGIN').split(',')
	});

	app.use(json({ limit: '10mb' }));

	const swaggerConfig = new DocumentBuilder()
		.setTitle('MetaProject Zeus API')
		.setDescription('Documentation for MetaProject Zeus API')
		.build();
	const document = SwaggerModule.createDocument(app, swaggerConfig);
	await RedocModule.setup('/apidoc', app, document, {
		title: 'MetaProject Zeus API documentation',
		logo: {
			url: `${configService.getOrThrow('FRONTEND_URL')}/public/images/zeus.png`,
			backgroundColor: '#FFFFFF',
			altText: 'MetaProject Zeus'
		},
		theme: {
			logo: {
				maxHeight: '64px'
			}
		},
		hideDownloadButton: true,
		hideHostname: true,
		sortOperationsAlphabetically: true,
		sortTagsAlphabetically: true,
		auth: {
			enabled: true,
			users: [
				{
					username: configService.getOrThrow('REDOC_USERNAME'),
					password: configService.getOrThrow('REDOC_PASSWORD')
				}
			]
		},
		tagGroups: [
			{
				name: 'General',
				tags: ['Health', 'Attribute']
			},
			{
				name: 'Project',
				tags: ['Project', 'Allocation', 'Resource']
			},
			{
				name: 'Publication',
				tags: [
					'Publication',
					'Publication Search',
					'Publication Credit',
					'Publication Request',
					'Publication Propagation',
					'My Publications'
				]
			},
			{
				name: 'User',
				tags: ['User', 'Auth']
			}
		]
	});

	await app.listen(3000);
}
bootstrap();
