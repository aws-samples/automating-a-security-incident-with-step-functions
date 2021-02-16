/*  
SPDX-FileCopyrightText: 2020 Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: MIT-0 
*/
let restrictedActions = process.env.restrictedActions.split(",");
const AWS = require('aws-sdk')
var iam = new AWS.IAM({apiVersion: '2010-05-08'});
exports.handler = async(event, context) => {


    /* The following command Create a new blank policy version as a placeholder*/
    var params = {
      PolicyArn: event.policyMeta.arn, /* required */
      PolicyDocument: event.policy, /*revert to original edit which is still saved in the SFN data*/
      SetAsDefault: true
    };

    try {
      const res = await iam.createPolicyVersion(params).promise()
    }catch(err){
      console.error(err)
    }
    
    return {
      "message": `Policy ${event.policyMeta.policyName} Has been approved ${event.policy} `,
      "action": "remedy"
    };

}
