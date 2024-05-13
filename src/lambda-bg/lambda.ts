// External Imports
import {Construct} from "constructs";
import {Duration} from "aws-cdk-lib";
import {Repository} from "aws-cdk-lib/aws-ecr";
import {DockerImageCode, DockerImageFunction} from "aws-cdk-lib/aws-lambda";
import {Effect, PolicyStatement} from "aws-cdk-lib/aws-iam";
import {LambdaDeploymentConfig} from "aws-cdk-lib/aws-codedeploy";
import {BlueGreenLambdaDeployment} from "./blue-green-lambda-deployment";

export interface LambdaEnvVars {
    [key: string]: string
}

export interface LambdaProps {
    name: string;
    applicationName: string;
    ecrRepoArn: string;
    ecrImageTag: string;
    envVars?: LambdaEnvVars;
    blueGreenConfig: {
        enabled: boolean;
        deploymentStrategy?: string;
    };
    datadog: {
        ddEnv: string;
        ddApiKeySecretArn: string;
        ddVersion?: string;
        ddSite?: string ;
        awsLambdaExecWrapper?: string;
    }
}

export class Lambda {
    public readonly createdLambda: DockerImageFunction;

    constructor(scope: Construct, props: LambdaProps) {
        const {
            name,
            applicationName,
            ecrRepoArn,
            ecrImageTag,
            envVars,
            blueGreenConfig,
            datadog
        } = props;
        const cwRollbackMetricName = "CAUGHT_ROLLBACK_ERRORS"

        this.createdLambda = new DockerImageFunction(scope, `${name}`, {
            timeout: Duration.seconds(30),
            memorySize: 1024,
            code: DockerImageCode.fromEcr(
                Repository.fromRepositoryArn(
                    scope,
                    `${name}Repository`,
                    ecrRepoArn
                ),
                {
                    tagOrDigest: ecrImageTag,
                }
            ),
            environment: {
                CLOUDWATCH_ROLLBACK_METRIC_NAME: cwRollbackMetricName,
                CLOUDWATCH_NAME_SPACE: applicationName,
                CLOUDWATCH_FUNCTION_NAME: name,
                DD_SERVICE: applicationName,
                DD_ENV: datadog.ddEnv,
                DD_VERSION: datadog.ddVersion || "latest",
                DD_SITE: datadog.ddSite || "datadoghq.com",
                DD_API_KEY_SECRET_ARN: datadog.ddApiKeySecretArn,
                AWS_LAMBDA_EXEC_WRAPPER: datadog.awsLambdaExecWrapper || "/opt/datadog_wrapper",
                ...envVars,
            }
        });

        // Add SecretsManager role to lambda
        this.createdLambda.addToRolePolicy(
            new PolicyStatement({
                effect: Effect.ALLOW,
                actions: ["secretsmanager:GetSecretValue"],
                resources: [
                    datadog.ddApiKeySecretArn
                ],
            })
        );

        // Add cloudwatch:PutMetricData permissions to lambdas
        this.createdLambda.addToRolePolicy(
            new PolicyStatement({
                sid: "cloudWatchPermissions",
                actions: ["cloudwatch:PutMetricData"],
                resources: [`*`],
                conditions: {
                    StringEquals: {
                        "cloudwatch:namespace": `${applicationName}`,
                    },
                },
            })
        );

        // Add Blue/Green deployment strategy
        new BlueGreenLambdaDeployment(scope, `${name}BlueGreen`, {
            cloudWatchMetricName: cwRollbackMetricName,
            cloudWatchNameSpace: applicationName,
            dimensionValue: cwRollbackMetricName,
            deploymentStrategy: blueGreenConfig.enabled ? blueGreenConfig.deploymentStrategy : LambdaDeploymentConfig.ALL_AT_ONCE.deploymentConfigName,
            lambda: this.createdLambda,
            dimensionName: name,
        });
    }
}
