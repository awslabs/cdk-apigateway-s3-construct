import { Stack } from "aws-cdk-lib";
import { AwsApigatewayS3 } from '../lib';
import { Template } from "aws-cdk-lib/assertions";
import * as api from "aws-cdk-lib/aws-apigateway";

test('Test Properties', () => {
    const stack = new Stack();

    const pattern = new AwsApigatewayS3(stack, 'api-gateway-s3', {
    
    });

    // Assertion 1
    expect(pattern.apiGateway !== null);
    // Assertion 2
    expect(pattern.s3Bucket !== null);
    // Assertion 3
    expect(pattern.apiGatewayCloudWatchLogGroupRole !== null);
    expect(pattern.apiGatewayLogGroup !== null);
    expect(pattern.apiGatewayRole !== null);
});

test('Test deployment for properties', () => {
    const stack = new Stack();
  
    new AwsApigatewayS3(stack, 'api-gateway-s3', {
      
    });
  
    const template = Template.fromStack(stack);
    template.hasResourceProperties("AWS::ApiGateway::Method", {
      HttpMethod: "PUT",
      AuthorizationType: "AWS_IAM"
    });
});

test('Test deployment w/o allowReadOperation', () => {
    const stack = new Stack();
  
    new AwsApigatewayS3(stack, 'api-gateway-s3', {
        allowReadOperation: false,
        allowCreateOperation: true
    });
  
    const template = Template.fromStack(stack);
    template.hasResourceProperties("AWS::ApiGateway::Method", {
      HttpMethod: "PUT",
      AuthorizationType: "AWS_IAM"
    });
});

test('Test deployment with allowReadOperation', () => {
    const stack = new Stack();
  
    new AwsApigatewayS3(stack, 'api-gateway-s3', {
      allowReadOperation: true,
    });
  
    const template = Template.fromStack(stack);
    template.hasResourceProperties("AWS::ApiGateway::Method", {
      HttpMethod: "GET",
      AuthorizationType: "AWS_IAM"
    });
  });

