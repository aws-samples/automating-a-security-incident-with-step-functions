# Automated security orchestrator with AWS Step Functions

This is an AWS SAM template for an Automated policy orchestrator - Below is an explanation of how to deploy the template and build the Step Function state machine:

![Application Architecture](/src/img/architecture.png)

```bash
.
├── README.MD                   <-- This instructions file
├── src
│   └── askUser                 <-- Source code for askUser lambda function
│   └── PolicyChangeApprove     <-- Source code for PolicyChangeApprove lambda function
│   └── RecieveUserAPI          <-- Source code for RecieveUserAPI lambda function
│   └── RevertPolicy            <-- Source code for RevertPolicy lambda function
│   └── ValidatePolicy          <-- Source code for ValidatePolicy lambda function
├── template.yaml               <-- SAM template
├── package.json                <-- SAM package
├── padpolicy.json              <-- Example policy document
```

## Requirements

* AWS CLI already configured with Administrator permission
* [AWS SAM CLI installed](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-install.html) - **minimum version 0.48**.



## Set up

Follow the instructions below in order to deploy from this repository:


1. [Create an AWS account](https://portal.aws.amazon.com/gp/aws/developer/registration/index.html)  if you do not already have one and login.

1. Clone the repo onto your local development machine:

 ```bash 
 git clone https://github.com/aws-samples/automating-a-security-incident-with-step-functions.git
 ```
 
 3. In the root directory, from the command line, run:

 ```bash
 sam deploy --guided
 ```

Follow the prompts in the deploy process to set the applicaiton, email address and restrictedActions:

* Application name: **an identifiable name for the application.**
* EmailAddress: **an administrator’s email address for receiving approval requests.**
* restrictedActions: **The IAM Policy actions you want to restrict.**


## Creating the Step function

[Screenshot]: /src/imag/Step-Functions-Management_Console.png "Step Functions state machine"

Navigate to the [Step Functions console](https://console.aws.amazon.com/states/home?#/statemachines) and click on **edit**.

### State machine Definition
All states will be defined insite `States{}` object:
```bash
{
    "Comment": "Defect detection state machine",
    "StartAt": "ModifyState",
    "States": {
        
    }
}
```
#### ModifyState
Re-structures the input data into a more usable format:
```bash
"ModifyState": {
    "Type": "Pass",
    "Parameters": {
        "policy.$": "$.detail.requestParameters.policyDocument",
        "accountId.$": "$.detail.userIdentity.accountId",
        "region.$": "$.region",
        "policyMeta.$":"$.detail.responseElements.policy"
    },
    "ResultPath": "$",
    "Next": "ValidatePolicy"
},
```

#### ValidatePolicy
Invokes the ValidatePolicy Lambda that checks the new policy document against the restricted actions:
```bash
"ValidatePolicy": {
    "Type": "Task",
    "ResultPath":"$.taskresult",
    "Resource": "{Replace-This-With-ValidatePolicy-Arn}",
    "Next": "ChooseAction"
},
```

#### TempRemove
Creates a new default version of the policy with only Log permissions and deletes previously created policy version:
```bash
"TempRemove": {
    "Type": "Task",
    "ResultPath":"$.taskresult",
    "Resource": "{Replace-This-With-{RevertPolicy-Arn}",
    "Next": "AskUser"
},
```

#### ChooseAction
Choice state, branches depending on input from ValidatePolicy step:
```bash
"ChooseAction": {
    "Type" : "Choice",
    "Choices": [
        {
        "Variable": "$.taskresult.action",
        "StringEquals": "remedy",
        "Next": "TempRemove"
        },
        {
        "Variable": "$.taskresult.action",
        "StringEquals": "alert",
        "Next": "AllowWithNotification"
        }
    ],
    "Default": "AllowWithNotification"
},
```

#### AllowWithNotification
No restricted actions detected, user is still notified of change (via SNS email) then executions ends:
```bash
"AllowWithNotification": {
    "Type": "Task",
    "Resource": "arn:aws:states:::sns:publish",
    "Parameters": {
        "TopicArn": "{Replace-This-With-{AlertTopic-Arn}",
        "Subject": "Policy change detected!",
        "Message.$": "$.taskresult.message"
    },
    "End": true
},
```

#### AskUser
Restricted action detected, send approval email to user via SNS, with taskToken that initiates the callback pattern:
```bash
"AskUser":{
    "Type": "Task",
    "Resource":"arn:aws:states:::lambda:invoke.waitForTaskToken",
    "Parameters":{  
        "FunctionName":"askUser",
        "Payload":{  
            "token.$":"$$.Task.Token"
            }
    },
    "ResultPath":"$.taskresult",
    "Next": "usersChoice"
},
```

#### usersChoice
Branch based on user's approval/deny action:
```bash
"usersChoice": {
    "Type" : "Choice",
    "Choices": [
        {
        "Variable": "$.taskresult.action",
        "StringEquals": "delete",
        "Next": "denied"
        },
        {
        "Variable": "$.taskresult.action",
        "StringEquals": "allow",
        "Next": "approved"
        }
    ],
    "Default": "denied"
},
```

#### denied
User denied policy creation, end execution with no further action:
```bash
 "denied": {
    "Type": "Pass",
    "End":true
},
```

#### Approved
Restore initial policy document by creating as a new version:
```bash
"approved": {
    "Type": "Task",
    "Resource": "{Replace-This-With-{PolicyChangerApproveARN}",
    "TimeoutSeconds": 3600,
    "End": true
}
```

## Testing

Use the AWS CLI to create a new policy.  An example policy document has been included in this repository named `badpolicy.json` .

```bash
aws iam create-policy --policy-name my-bad-policy --policy-document file://badpolicy.json
```

## Cleanup

In order to delete our Serverless Application recently deployed you can use the following AWS CLI Command:

```bash
aws cloudformation delete-stack --stack-name sam-app
```

## Bringing to the next level

Here are a few things you can try to get more acquainted with building serverless applications using SAM:

### Learn how SAM Build can help you with dependencies

* Uncomment state machine definition `template.js`

### Step-through debugging

* **[Enable step-through debugging docs for supported runtimes]((https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-using-debugging.html))**

Next, you can use AWS Serverless Application Repository to deploy ready to use Apps that go beyond hello world samples and learn how authors developed their applications: [AWS Serverless Application Repository main page](https://aws.amazon.com/serverless/serverlessrepo/)

# Appendix
## SAM and AWS CLI commands

All commands used throughout this document

```bash
# create a bucket
aws s3 mb s3://BUCKET_NAME
```

```bash
# Build and package application
sam build && sam package \
--output-template-file package.yaml \
--s3-bucket BUCKET_NAME
```

Next, the following command will create a Cloudformation Stack and deploy your SAM resources.

```bash
# Deploy SAM application
sam deploy \
    --template-file package.yaml \
    --stack-name sam-app \
    --capabilities CAPABILITY_NAMED_IAM \
    --parameter-overrides EmailAddress={YOUR-EMAIL-ADDRESS}

```

```bash
# Creating a new Policy
aws iam create-policy --policy-name my-bad-policy --policy-document file://badpolicy.json
```
![Step Function Workflow](/src/img/Step-Functions-Management-Console.png)
