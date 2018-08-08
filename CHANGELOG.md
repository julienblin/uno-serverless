# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

## [Unreleased]
### Added
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