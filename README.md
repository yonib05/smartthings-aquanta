# Smartthings unofficial Aquanta Controller

I created this project over the span of a few hours this past weekend to allow me to add my 2 Aquanta Controllers to Smartthings. This isn't terribly robust but works for my needs. This project is scrappy many thanks to @Zoopra9457 who was both the inspiration and the Aquanta API backend knowlege through his [Aquanta homebridge](https://github.com/zoopra9457/homebridge-aquanta) project.


## Requirements:
- Some basic experience with nodejs & nodejs installed
- AWS Account with Lambda and Cognito
- Samsung Developer account


## Setup (from memory more or less):
- Create/Login to your AWS account (I just created an account and plan to use it under the free tier)
- Create a Lambda function in one of these 3 regions ap-northeast-1 (Tokyo), us-east-1 (N. Virginia), eu-west-1 (Ireland)
- Upload zipped Code to the lambda function (see bellow)
- Set these env variables
  - AQUANTA_EMAIL - Email you use to login to Aquanta
  - AQUANTA_PASSWORD - Password you use to login to Aquanta
- Create A cognito user pool with just 1 user and setup Oauth
  - This process is for smartthings as this would normally be designed to manage the credentials but since we passed it in as env variables we don't really care too much.
- Head to the Samsung smartthings [Developer workspace(https://smartthings.developer.samsung.com/workspace/projects)] Create a Device Integration using the SmartThings Cloud Connector
- Configure the Lambda Arn and the Cognito credentials
- Create a new Device Capability using the smarthings [CLI(https://github.com/SmartThingsCommunity/smartthings-cli)] command ```smartthings capabilities:create -i ./Capabilities/WaterHeater.json```
- Create the Capabilities presentation by using ```smartthings capabilities:presentation:create xxxxxYourCapabilityIDxxxxx 1 -i ./Capabilities/WaterHeaterPresentation.json```
- Create a device profile in the Smartthings Dev Portal I added Health Check and my Custom Capability defined in the previous steps
- Publish and Test the app by Navigating to the app and installing your integration



## Deploying on Lambda
1. Run `npm install --production` to install all the dependencies
2. Then run ```npm run build``` to package
3. Create a new Lambda and upload the code using the `"Upload from Zip"` option


## License
MIT

## Support
This is an unofficial repo I did this for fun so please open issues and I will do by best to address them but honestly hoping Aquanta steps up and builds and official integration.
