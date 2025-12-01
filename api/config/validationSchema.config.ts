import * as Joi from 'joi';

export const validationSchema = Joi.object({
	APPLICATION_MODE: Joi.string().valid('development', 'production', 'test'),
	// database
	POSTGRES_HOST: Joi.string(),
	POSTGRES_PORT: Joi.number(),
	POSTGRES_USER: Joi.string(),
	POSTGRES_PASSWORD: Joi.string(),
	POSTGRES_DATABASE: Joi.string(),
	// CORS
	CORS_ALLOW_ORIGIN: Joi.string(),
	//
	API_PUBLICATION_MAIL_TO: Joi.string(),
	// identity
	IDENTITY_ISSUER: Joi.string(),
	IDENTITY_CLIENT_ID: Joi.string(),
	IDENTITY_CLIENT_SECRET: Joi.string(),
	IDENTITY_AUTHORIZATION_URL: Joi.string(),
	IDENTITY_TOKEN_URL: Joi.string(),
	IDENTITY_CALLBACK_URL: Joi.string(),
	IDENTITY_USER_INFO_URL: Joi.string(),
	// session
	SESSION_SECRET: Joi.string(),
	// cache
	REDIS_HOST: Joi.string(),
	REDIS_PORT: Joi.number(),
	REDIS_PASSWORD: Joi.string(),
	// openstack integration
	OPENSTACK_REPO_PATH: Joi.string(),
	OPENSTACK_ALLOWED_DOMAINS: Joi.string(),
	OPENSTACK_GIT_BASE_BRANCH: Joi.string(),
	OPENSTACK_GIT_TARGET_BRANCH: Joi.string(),
	OPENSTACK_GIT_AUTHOR_NAME: Joi.string(),
	OPENSTACK_GIT_AUTHOR_EMAIL: Joi.string(),
	OPENSTACK_GITLAB_PROJECT_ID: Joi.alternatives(Joi.number(), Joi.string()),
	OPENSTACK_GITLAB_HOST: Joi.string(),
	OPENSTACK_GITLAB_TOKEN: Joi.string(),
	// collector integration
	COLLECTOR_API_KEY: Joi.string(),
	// mock auth (for development/testing without OIDC)
	MOCK_AUTH_ENABLED: Joi.boolean().default(false)
});
