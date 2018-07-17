# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- TemplateEngine interface + uno-serverless-handlebars implementation
- Core event services
- Azure Queue Storage event publisher
- duration() helper based on [ms](https://www.npmjs.com/package/ms)
- support for etag concurrency check on DocumentDb

### Changed
- Generator template for Azure functions: better start script & zipping
- Health checks for BlobStorage no longer writes a temp file, only create container if not exists