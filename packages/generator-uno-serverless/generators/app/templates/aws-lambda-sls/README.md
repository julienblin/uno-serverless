# <%= projectName %>

## Prerequisites

- Node 8.10.x:
  - https://github.com/jasongin/nvs (Recommended)
- [Amazon AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/installing.html)
  - Configure it for the target AWS environment: https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-getting-started.html

## Local execution

```cmd
npm install
npm start
```

## Unit tests
```cmd
npm test
npm run test:watch
```

## Deployment
```cmd
npm run deploy -- [environment]
```

## Run end-to-end tests
```cmd
npm run test:e2e -- --global-var url=[environment url]
```