# <%= projectName %>

## Prerequisites

- Node 10.x:
  - https://github.com/jasongin/nvs (Recommended)
- Azure CLI: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli?view=azure-cli-latest
- Azure Storage Emulator: https://docs.microsoft.com/en-us/azure/storage/common/storage-use-emulator
- Azure Functions Core Tool:
```cmd
npm i -g azure-functions-core-tools@core
```

## Local execution

```cmd
npm install
npm start
```

## Azure resource group deployment

```cmd
az login
az group create --name <%= projectName %>-dev --location "East US"
az group deployment create \
  --name Dev \
  --resource-group <%= projectName %>-dev \
--template-file deploy/azuredeploy.json \
  --parameters environment=dev
```

## Build app deployment package

```cmd
npm run build
```

## Deploy app deployment package in target environment

```cmd
az functionapp deployment source config-zip \
  -g <%= projectName %>-dev \
  -n <%= projectName %>-dev \
  --src dist/<%= projectName %>.zip
```

## Run end-to-end tests
```cmd
npm run test:e2e -- --global-var url=[environment url]
```