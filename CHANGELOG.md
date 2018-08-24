# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

## [Unreleased]
### Added
- SQSEventPublisher to publish events using AWS Simple Queue Service
- SQSEvent & SQSEventBatch as specialized handlers for Simple Queue Service-backed lambdas

## [0.49.0] - 2018-08-23
### Added
- CLI: Added openapi3 schema generation option to update openapi3 YAML file definition with schemas.

### Changed
- Fixed a bug in httpRouter when proxy parameter is null or undefined, preventing routing at the root level
- Fixed options signature for RSSigningKeyService (undefined result for promises)

## [0.48.0] - 2018-08-23
### Added
- DocumentDb: Added operator Neq (Fix #48)
- DocumentDb: Added option overwrite to set to allow pure create operation (Fix #52)
- Templates: Support translations/resources (Fix #32)
- Custom payload for errors + standard oauthError (Fix #56)
- Body validation and class assignment in HttpUnoEvent

### Changed
- [BREAKING] DocumentDb: Querying with parameter id will automatically prefix the id value with the entity type if entity filter is also in the query (e.g. select().entity("orders").where<Orders>({ id: "value"})). (Fix #51)
- health handler makes sure that raw errors coming from health checks will be appropriately serialized (Fix #49)
- TokenService verify throws unauthorizedError when failing verification (instead of standard JWT error) (Fix #47)
- Updated all dependencies to latest versions
- Better internalization of HttpStatusCodes (Fix #55)
- Validation can now set default values if provided
- JSONSchema accepts format property

### Removed
- Deprecated buildNonStandardError method in favor of buildErrorWithCustomPayload (Fix #56)
- Deprecated validateBody middleware in favor of event.body({ validate: schema})

## [0.47.0] - 2018-08-13
### Added
- uno-serverless-cli with composable commands
- CLI: generate-schemas to generate JSON, YAML and Typescript schemas from Typescript interfaces.
- AzureSearchClient plugged to Azure Search Rest API
- toRecord convenient function to convert arrays of objects to records (dictionaries)

## [0.46.0] - 2018-08-03
### Added
- AWS Lambda / Serverless generator (Fix #36)
- DocumentDb: Add defaultConsistencyLevel option (Fix #39)

### Changed
- [BREAKING] validateAndTrow is renamed to validateAndThrow (Fix #31)
- Updated webpack configuration in Azure Functions generator to use Spawn plugin instead of shell (Fix #35)
- principalFromBasicAuthorizationHeader is more strict and validates the presence of Basic header value (instead of being permissive) (Fix #37)
- principalFromBearerToken is more strict and validates the presence of Bearer header value (instead of being permissive) (Fix #37)
- validationError copies all the sub-error properties now (Fix #40)

## [0.45.0] - 2018-07-23
### Added
- StandardErrorCodes: Error codes in framework now use enum values. (Fix #27)

### Changed
- [BREAKING] DocumentDbQuery: Operators order is changed from last to first (Fix #)

## [0.44.0] - 2018-07-20
### Added
- KeyVaultConfigService to pull configuration from Azure KeyVault
- StaticConfigService & ProcessEnvConfigService now implements CheckHealth

### Changed
- Fixed uno-serverless dependency to http-status-codes package

## [0.43.0] - 2018-07-19
### Added
- HashService with bcrypt implementation
- SymmetricEncryptionService with AES 256 GCM implementation

### Changed
- TokenService returns expiration alongside signed token.

## [0.42.0] - 2018-07-18
### Added
- TemplateEngine interface + uno-serverless-handlebars implementation
- Core event services
- Azure Queue Storage event publisher
- duration() helper based on [ms](https://www.npmjs.com/package/ms)
- support for etag concurrency check on DocumentDb
- forbiddenError
- principalFromBasicAuthorizationHeader

### Changed
- Generator template for Azure functions: better start script & zipping
- Health checks for BlobStorage no longer writes a temp file, only create container if not exists
- Internalized HttpStatusCodes.
- Context.log now has support for info, warn & error.