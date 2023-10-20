import {
  Construct
} from 'constructs';
import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as api from 'aws-cdk-lib/aws-apigateway';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as defaults from '@aws-solutions-constructs/core';
export interface AwsApigatewayS3Props {
  // Define construct properties here
  readonly bucketProps ? : s3.BucketProps | any;
  readonly additionalBuckets?: s3.IBucket[] | any;
  readonly apiGatewayProps ? : api.RestApiProps | any;
  readonly logGroupProps ? : logs.LogGroupProps | any;
  readonly allowCreateOperation ? : Boolean | any;
  // Expose PUT on a Folder/Item resource to upload an object to an Amazon S3 bucket. { (/folder/item {Put})}
  readonly allowReadOperation ? : Boolean | any;
  // Expose GET on a Folder resource to view a list of all of the objects in an Amazon S3 bucket. (/folder {Get})
  // Expose GET on a Folder/Item resource to view or download an object from an Amazon S3 bucket. (/folder/item {Get})
  // Expose HEAD on a Folder/Item resource to get object metadata in an Amazon S3 bucket. (/folder/item {Head})
  readonly allowDeleteOperation ? : Boolean | any;
  // Expose DELETE on a Folder/Item resource to remove an object from an Amazon S3 bucket. (/folder/item {Delete})
}
export class AwsApigatewayS3 extends Construct {
  public readonly s3Bucket: s3.Bucket;
  public readonly apiGateway: api.RestApi;
  public readonly apiGatewayCloudWatchLogGroupRole: iam.Role | undefined;
  public readonly apiGatewayLogGroup: logs.LogGroup;
  public readonly apiGatewayRole: iam.Role;
  public apiGatewayResourceFolder: api.Resource;
  public apiGatewayResourceItem: api.Resource;

  getAllS3BucketsToAdd =(localS3Bucket:s3.Bucket,additionalBuckets?:s3.IBucket[])=>{
    let allS3BucketsToAdd = [localS3Bucket.bucketArn, `${localS3Bucket.bucketArn}/*`]
    additionalBuckets?.forEach(s3Bucket=>{
      allS3BucketsToAdd.push(s3Bucket.bucketArn)
      allS3BucketsToAdd.push(`${s3Bucket.bucketArn}/*`)
    })
    return allS3BucketsToAdd
  }
  addReadOperationConfiguration(localApiGateway: api.RestApi, localS3Bucket: s3.Bucket, additionalBuckets?:s3.IBucket[]) {
    // Expose GET on a Folder resource to view a list of all of the objects in an Amazon S3 bucket. (/folder {Get})
    let methodOptionFolderGetProps = {
      authorizationType: api.AuthorizationType.IAM,
      requestParameters: {
        'method.request.path.folder': true
      },
      methodResponses: [{
          statusCode: "200",
          responseParameters: {
            'method.response.header.Content-Length': false,
            'method.response.header.Content-Type': false,
            'method.response.header.Date': false,
          },
          responseModels: {
            "application/json": {
              modelId: "Empty"
            }
          }
        },
        {
          statusCode: "400",
        },
        {
          statusCode: "500",
        }
      ]
      // requestParameters:[]
    }
    let awsS3IntegrationFolderGetProps = new api.AwsIntegration({
      service: 's3',
      path: '{bucket}',
      options: {
        passthroughBehavior: api.PassthroughBehavior.WHEN_NO_MATCH,
        credentialsRole: this.apiGatewayRole,
        requestParameters: {
          'integration.request.path.bucket': 'method.request.path.folder'
        },
        integrationResponses: [{
            statusCode: "200",
            responseParameters: {
              'method.response.header.Content-Length': 'integration.response.header.Content-Length',
              'method.response.header.Content-Type': 'integration.response.header.Content-Type',
              'method.response.header.Date': 'integration.response.header.Date'
            }
          },
          {
            statusCode: "400",
            selectionPattern: "4\\d{2}"
          },
          {
            statusCode: "500",
            selectionPattern: "5\\d{2}"
          }
        ]
      },
      integrationHttpMethod: "GET"

    })
    let apiGatewayResourceFolderGet = this.apiGatewayResourceFolder.addMethod('GET', awsS3IntegrationFolderGetProps, methodOptionFolderGetProps)

    // Expose GET on a Folder/Item resource to view or download an object from an Amazon S3 bucket. (/folder/item {Get}) --Start
    let methodOptionFolderItemGetProps = {
      authorizationType: api.AuthorizationType.IAM,
      requestParameters: {
        'method.request.path.folder': true,
        "method.request.path.item": true
      },
      methodResponses: [{
          statusCode: "200",
          responseParameters: {
            "method.response.header.Content-Type": false,
            "method.response.header.content-type": false
          },
          responseModels: {
            "application/json": {
              modelId: "Empty"
            }
          }
        },
        {
          statusCode: "400",
        },
        {
          statusCode: "500",
        }
      ]
    }
    let awsS3IntegrationFolderItemGetProps = new api.AwsIntegration({
      service: 's3',
      path: '{bucket}/{object}',
      options: {
        passthroughBehavior: api.PassthroughBehavior.WHEN_NO_MATCH,
        credentialsRole: this.apiGatewayRole,
        requestParameters: {
          'integration.request.path.bucket': 'method.request.path.folder',
          'integration.request.path.object': 'method.request.path.item'
        },
        integrationResponses: [{
            statusCode: "200",
            responseParameters: {
              'method.response.header.Content-Type': 'integration.response.header.Content-Type',
              'method.response.header.content-type': 'integration.response.header.content-type'
            }
          },
          {
            statusCode: "400",
            selectionPattern: "4\\d{2}"
          },
          {
            statusCode: "500",
            selectionPattern: "5\\d{2}"
          }
        ]
      },
      integrationHttpMethod: "GET"

    })
    let apiGatewayResourceItemGet = this.apiGatewayResourceItem.addMethod("GET",awsS3IntegrationFolderItemGetProps,methodOptionFolderItemGetProps)
    // Expose GET on a Folder/Item resource to view or download an object from an Amazon S3 bucket. (/folder/item {Get}) --End

    // Expose HEAD on a Folder/Item resource to get object metadata in an Amazon S3 bucket. (/folder/item {Head}) --Start
    let methodOptionFolderItemHeadProps = {
      authorizationType: api.AuthorizationType.IAM,
      requestParameters: {
        'method.request.path.folder': true,
        "method.request.path.item": true
      },
      methodResponses: [{
          statusCode: "200",
          responseParameters: {
            'method.response.header.Content-Length': false,
            'method.response.header.Content-Type': false
          },
          responseModels: {
            "application/json": {
              modelId: "Empty"
            }
          }
        },
        {
          statusCode: "400",
        },
        {
          statusCode: "500",
        }
      ]
    }
    let awsS3IntegrationFolderItemHeadProps = new api.AwsIntegration({
      service: 's3',
      path: '{bucket}/{object}',
      options: {
        passthroughBehavior: api.PassthroughBehavior.WHEN_NO_MATCH,
        credentialsRole: this.apiGatewayRole,
        requestParameters: {
          'integration.request.path.bucket': 'method.request.path.folder',
          'integration.request.path.object': 'method.request.path.item'
        },
        integrationResponses: [{
            statusCode: "200",
            responseParameters: {
              'method.response.header.Content-Length': 'integration.response.header.Content-Length',
              'method.response.header.Content-Type': 'integration.response.header.Content-Type'
            }
          },
          {
            statusCode: "400",
            selectionPattern: "4\\d{2}"
          },
          {
            statusCode: "500",
            selectionPattern: "5\\d{2}"
          }
        ]
      },
      integrationHttpMethod: "HEAD"
    })
    let apiGatewayResourceItemHead = this.apiGatewayResourceItem.addMethod("HEAD",awsS3IntegrationFolderItemHeadProps,methodOptionFolderItemHeadProps)
    // Expose HEAD on a Folder/Item resource to get object metadata in an Amazon S3 bucket. (/folder/item {Head}) --End

    // let allS3BucketsToAdd = [localS3Bucket.bucketArn, `${localS3Bucket.bucketArn}/*`]

    // Adding minimum permission to the APIGW execution role
    this.apiGatewayRole.addToPolicy(new iam.PolicyStatement({
      actions: [
        "s3-object-lambda:GetObject",
        "s3-object-lambda:GetObjectVersion",
        "s3-object-lambda:ListBucket",
        "s3-object-lambda:ListBucketVersions",
        "s3:GetObject",
        "s3:GetObjectVersion",
        "s3:GetObjectAttributes",
        "s3:ListBucket"
      ],
      resources: this.getAllS3BucketsToAdd(localS3Bucket,additionalBuckets),
    }))
  }

  addCreateOperationConfiguration(localApiGateway: api.RestApi, localS3Bucket: s3.Bucket, additionalBuckets?:s3.IBucket[]) {
    // Expose PUT on a Folder/Item resource to upload an object to an Amazon S3 bucket. { (/folder/item {Put})} ---Start
    let methodOptionFolderItemPutProps = {
      authorizationType: api.AuthorizationType.IAM,
      requestParameters: {
        'method.request.header.Content-Type':false,
        'method.request.path.folder': true,
        "method.request.path.item": true
      },
      methodResponses: [{
          statusCode: "200",
          responseParameters: {
            'method.response.header.Content-Length': false,
            'method.response.header.Content-Type': false
          },
          responseModels: {
            "application/json": {
              modelId: "Empty"
            }
          }
        },
        {
          statusCode: "400",
        },
        {
          statusCode: "500",
        }
      ]
    }
    let awsS3IntegrationFolderItemPutProps = new api.AwsIntegration({
      service: 's3',
      path: '{bucket}/{object}',
      options: {
        passthroughBehavior: api.PassthroughBehavior.WHEN_NO_MATCH,
        credentialsRole: this.apiGatewayRole,
        requestParameters: {
          'integration.request.header.Content-Type': 'method.request.header.Content-Type',
          'integration.request.path.bucket': 'method.request.path.folder',
          'integration.request.path.object': 'method.request.path.item'
        },
        integrationResponses: [{
            statusCode: "200",
            responseParameters: {
              'method.response.header.Content-Length': 'integration.response.header.Content-Length',
              'method.response.header.Content-Type': 'integration.response.header.Content-Type'
            }
          },
          {
            statusCode: "400",
            selectionPattern: "4\\d{2}"
          },
          {
            statusCode: "500",
            selectionPattern: "5\\d{2}"
          }
        ]
      },
      integrationHttpMethod: "PUT"
    })
    let apiGatewayResourceItemPut = this.apiGatewayResourceItem.addMethod("PUT",awsS3IntegrationFolderItemPutProps,methodOptionFolderItemPutProps)
    // Expose PUT on a Folder/Item resource to upload an object to an Amazon S3 bucket. { (/folder/item {Put})} ---Start

    // No dependent actions:PutObject: https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazons3.html
    this.apiGatewayRole.addToPolicy(new iam.PolicyStatement({
      actions: [
        "s3:PutObject",
        "s3:PutObjectTagging",
        "s3:PutObjectVersionTagging",
        "s3:PutBucketTagging",
        "s3:PutBucketVersioning"
      ],
      resources: this.getAllS3BucketsToAdd(localS3Bucket,additionalBuckets),
    }))

  }

  addDeleteOperationConfiguration(localApiGateway: api.RestApi, localS3Bucket: s3.Bucket, additionalBuckets?:s3.IBucket[]) {
    // Expose DELETE on a Folder/Item resource to remove an object from an Amazon S3 bucket. (/folder/item {Delete})--Start
    let methodOptionFolderItemDeleteProps = {
      authorizationType: api.AuthorizationType.IAM,
      requestParameters: {
        'method.request.path.folder': true,
        "method.request.path.item": true
      },
      methodResponses: [{
          statusCode: "200",
          responseParameters: {
            'method.response.header.Content-Length': false,
            'method.response.header.Content-Type': false
          },
          responseModels: {
            "application/json": {
              modelId: "Empty"
            }
          }
        },
        {
          statusCode: "400",
        },
        {
          statusCode: "500",
        }
      ]
    }
    let awsS3IntegrationFolderItemDeleteProps = new api.AwsIntegration({
      service: 's3',
      path: '{bucket}/{object}',
      options: {
        passthroughBehavior: api.PassthroughBehavior.WHEN_NO_MATCH,
        credentialsRole: this.apiGatewayRole,
        requestParameters: {
          'integration.request.path.bucket': 'method.request.path.folder',
          'integration.request.path.object': 'method.request.path.item'
        },
        integrationResponses: [{
            statusCode: "200",
          },
          {
            statusCode: "400",
            selectionPattern: "4\\d{2}"
          },
          {
            statusCode: "500",
            selectionPattern: "5\\d{2}"
          }
        ]
      },
      integrationHttpMethod: "DELETE"
    })
    let apiGatewayResourceItemDelete = this.apiGatewayResourceItem.addMethod("DELETE",awsS3IntegrationFolderItemDeleteProps,methodOptionFolderItemDeleteProps)
    this.apiGatewayRole.addToPolicy(new iam.PolicyStatement({
      actions: [
        "s3:DeleteObject",
        "s3:DeleteObjectVersion",
      ],
      resources: this.getAllS3BucketsToAdd(localS3Bucket,additionalBuckets),
    }))
  }

  constructor(scope: Construct, id: string, props: AwsApigatewayS3Props={}) {
    super(scope, id);

    // L3 Resource Definition goes here
    // Helper Resource:
    // IAM Execution Role: Service role for APIGW
    this.apiGatewayRole = new iam.Role(this, 'Role', {
      assumedBy: new iam.ServicePrincipal('apigateway.amazonaws.com'),
      description: 'Role assumed by apigateway for proxy invocations',
    });

    // 1. S3 Bucket: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_s3.Bucket.html
    let localS3Bucket = new s3.Bucket(scope, 'Bucket', props.bucketProps?props.bucketProps:{});

    // Not Needed, this is handled in the RegionalRestApi in @aws-solutions-constructs/core
    // // 2. class LogGroup (construct): https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_logs.LogGroup.html#initializer
    // let localApiGatewayLogGroup = new logs.LogGroup(this, 'Log Group', props.logGroupProps);

    // 3.class RestApi (construct):https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_apigateway.RestApi.html
    
    let regionalRestApi = defaults.RegionalRestApi(this, props.apiGatewayProps?props.apiGatewayProps:{},props.logGroupProps?props.logGroupProps:{})
   
    let localApiGateway = regionalRestApi.api;
    // This structure is always required:
    this.apiGatewayResourceFolder = localApiGateway.root.addResource('{folder}')
    this.apiGatewayResourceItem = this.apiGatewayResourceFolder.addResource('{item}')
    // console.log(`allowCreateOperation --${props.allowCreateOperation}`)
    // console.log(`allowReadOperation --${props.allowReadOperation}`)
    // console.log(`allowDeleteOperation --${props.allowDeleteOperation}`)

    if (props.allowReadOperation!== undefined?props.allowReadOperation:true) {
      // console.log("inside read")
      this.addReadOperationConfiguration(localApiGateway, localS3Bucket, props.additionalBuckets!== undefined?props.additionalBuckets:[])
    }

    if (props.allowCreateOperation!== undefined?props.allowCreateOperation:true) {
      // console.log("inside create")
      this.addCreateOperationConfiguration(localApiGateway, localS3Bucket, props.additionalBuckets!== undefined?props.additionalBuckets:[])
    }

    if (props.allowDeleteOperation!== undefined?props.allowCreateOperation:true) {
      // console.log("inside delete")
      this.addDeleteOperationConfiguration(localApiGateway, localS3Bucket,props.additionalBuckets!== undefined?props.additionalBuckets:[])
    }
    // Adding Class Properties :
    this.s3Bucket = localS3Bucket
    this.apiGateway = localApiGateway 
    this.apiGatewayCloudWatchLogGroupRole = regionalRestApi.role
    this.apiGatewayLogGroup = regionalRestApi.logGroup
  }
}