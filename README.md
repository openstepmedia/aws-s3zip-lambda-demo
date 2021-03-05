# AWS WebSocket API S3 Zip Demo


```
.
├── README.md                   <-- This instructions file
├── onconnect                   <-- Source code onconnect
├── ondisconnect                <-- Source code ondisconnect
├── onzip                       <-- Source code onzip
└── template.dev.yaml           <-- SAM template for Lambda Functions - Test
```

# Deploying to AWS

## AWS CLI commands

If you prefer, you can install the [AWS SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-install.html) and use it to package, deploy, and describe your application.  These are the commands you'll need to use:

```
sam deploy --guided

aws cloudformation describe-stacks \
    --stack-name simple-websocket-chat-app --query 'Stacks[].Outputs'
```
**Note:** `.gitignore` contains the `samconfig.toml`, hence make sure backup this file, or modify your .gitignore locally.

### Use npm scripts

For Dev:

```
npm run build:dev && npm run deploy:dev
```

**Note:** `cross-vars` must be installed globally: `npm install -g cross-vars`

## HTML Integration

See test/functional/awswebsocket.html

## Testing the S3 Zip WebSocket API

testing is using the japa framework

```
cd test\unit
node onzip.spec.js
```


