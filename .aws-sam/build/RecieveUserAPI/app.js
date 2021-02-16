/*  
SPDX-FileCopyrightText: 2020 Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: MIT-0 
*/
console.log('Loading function');
const aws = require('aws-sdk');
const stepfunctions = new aws.StepFunctions();

exports.handler = async(event, context) => {

    var NextAction = 'delete'
    if(event.requestContext.resourcePath =='/allow'){
        NextAction= 'allow'
    }
    var taskToken = event.queryStringParameters.token
    taskTokenClean = taskToken.split(" ").join("+");
   

console.log(event)

    var params = {
        output: JSON.stringify({"action":NextAction}),
        taskToken: taskTokenClean
    }
    

    try {
        const res = await stepfunctions.sendTaskSuccess(params).promise()
    }catch(err){
        console.error(err)
    }         
    
   return {
        statusCode: '200',
        body: JSON.stringify({action:NextAction}),
        headers: {
            'Content-Type': 'application/json',
        }
    }
   
};