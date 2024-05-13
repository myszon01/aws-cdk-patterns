import { Construct } from 'constructs';
import { Duration, Stack } from 'aws-cdk-lib';
import { Alias, DockerImageFunction, Function } from 'aws-cdk-lib/aws-lambda';
import {
	Alarm,
	ComparisonOperator,
	Metric,
	Unit,
} from 'aws-cdk-lib/aws-cloudwatch';
import {
	ILambdaDeploymentConfig,
	LambdaDeploymentConfig,
	LambdaDeploymentGroup,
} from 'aws-cdk-lib/aws-codedeploy';

/**
 * Available strategies for blue/green deployments.
 *
 * @see https://docs.aws.amazon.com/codedeploy/latest/userguide/deployment-configurations.html#deployment-configuration-lambda
 *
 * @default - LambdaDeploymentConfig.LINEAR_10PERCENT_EVERY_2MINUTES
 *
 * @resource AWS::CodeDeploy::DeploymentConfig
 *
 */
interface BlueGreenLambdaDeploymentProps {

	/**
	 * Lamba Function to use Blue/Green Deployment on.
	 * @type DockerImageFunction | Function
	 */
	lambda: DockerImageFunction | Function;

	/**
	 * The namespace for logs.
	 * @type string
	 * @example DialplanDataAccess/Lambda
	 */
	cloudWatchNameSpace: string;

	/**
	 * Blue/Green deployment configuration.
	 * @type string
	 * @default LINEAR_10PERCENT_EVERY_2MINUTES
	 */
	deploymentStrategy?: string;

	/**
	 * How the alarm compares against metrics.
	 * @type ComparisonOperator
	 * @default GREATER_THAN_OR_EQUAL_TO_THRESHOLD
	 */
	alarmComparisonOperator?: ComparisonOperator;

	/**
	 * The name of the Lambda Alias to shift traffic. Updating the version of the alias will trigger a CodeDeploy deployment.
	 * @type string
	 * @default "prod"
	 */
	aliasName?: string;

	/**
	 * The value against which the specified statistic is compared to trigger the alarm.
	 * @type number
	 * @default 1
	 */
	alarmThreshold?: number;

	/**
	 * The number of periods over which data is compared to the specified threshold. This is not the time interval between metric collection.
	 * @type number
	 * @default 1
	 */
	alarmEvalPeriod?: number;

	/**
	 * The period in minutes.
	 * @type number
	 * @default 1 minutes
	 * @see https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/cloudwatch_concepts.html#CloudWatchPeriods
	 */
	alarmMetricPollPeriod?: number;

	/**
	 * The name of the metric you are creating.
	 * @type string
	 * @example CAUGHT_ERRORS
	 */
	cloudWatchMetricName: string;

	/**
	 * The name of the dimension.
	 * @type string
	 * @example DIALPLAN_DATA_ACCESS_LAMBDA
	 */
	dimensionName: string;

	/**
	 * The value of the dimension.
	 * @type string
	 * @example ERRORS
	 */
	dimensionValue: string;
}

export class BlueGreenLambdaDeployment {
	constructor(scope: Construct, id: string, props: BlueGreenLambdaDeploymentProps) {
		const {
			lambda,
			deploymentStrategy,
			alarmComparisonOperator,
			aliasName,
			alarmThreshold,
			alarmEvalPeriod,
			alarmMetricPollPeriod,
			dimensionValue,
			cloudWatchNameSpace,
			cloudWatchMetricName,
			dimensionName,
		} = props;

		const stack = Stack.of(scope);

		const version = lambda.currentVersion;

		const alias = new Alias(scope, `${id}Alias`, {
			aliasName: aliasName || 'prod',
			version,
		});


		const deploymentGroup = new LambdaDeploymentGroup(scope, `${id}BGDeploy`, {
			alias: alias,
			deploymentConfig: this.getLambdaDeploymentConfigFromString(deploymentStrategy)
		});

		const metric = new Metric({
			account: stack.account,
			region: stack.region,
			namespace: cloudWatchNameSpace,
			metricName: cloudWatchMetricName,
			dimensionsMap: { [dimensionName]: dimensionValue },
			unit: Unit.COUNT,
			period: Duration.minutes(alarmMetricPollPeriod || 1),
			statistic: 'Sum',
		});

		const errorLogAlarm = new Alarm(scope, `${id}BlueGreenErrorAlarm`, {
			comparisonOperator:
				alarmComparisonOperator ||
				ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
			threshold: alarmThreshold || 1,
			evaluationPeriods: alarmEvalPeriod || 1,
			metric,
		});

		deploymentGroup.addAlarm(errorLogAlarm);
	}

	getLambdaDeploymentConfigFromString(deploymentStrategy?: string): ILambdaDeploymentConfig {
				
		switch(deploymentStrategy) {
			case(LambdaDeploymentConfig.ALL_AT_ONCE.deploymentConfigName): 
				return LambdaDeploymentConfig.ALL_AT_ONCE;

			case(LambdaDeploymentConfig.CANARY_10PERCENT_30MINUTES.deploymentConfigName): 
				return LambdaDeploymentConfig.CANARY_10PERCENT_30MINUTES;

			case(LambdaDeploymentConfig.CANARY_10PERCENT_15MINUTES.deploymentConfigName): 
				return LambdaDeploymentConfig.CANARY_10PERCENT_15MINUTES;

			case(LambdaDeploymentConfig.CANARY_10PERCENT_10MINUTES.deploymentConfigName): 
				return LambdaDeploymentConfig.CANARY_10PERCENT_10MINUTES;

			case(LambdaDeploymentConfig.CANARY_10PERCENT_5MINUTES.deploymentConfigName): 
				return LambdaDeploymentConfig.CANARY_10PERCENT_5MINUTES;

			case(LambdaDeploymentConfig.LINEAR_10PERCENT_EVERY_10MINUTES.deploymentConfigName): 
				return LambdaDeploymentConfig.LINEAR_10PERCENT_EVERY_10MINUTES;

			case(LambdaDeploymentConfig.LINEAR_10PERCENT_EVERY_3MINUTES.deploymentConfigName): 
				return LambdaDeploymentConfig.LINEAR_10PERCENT_EVERY_3MINUTES;
			
			case(LambdaDeploymentConfig.LINEAR_10PERCENT_EVERY_2MINUTES.deploymentConfigName): 
				return LambdaDeploymentConfig.LINEAR_10PERCENT_EVERY_2MINUTES;

			case(LambdaDeploymentConfig.LINEAR_10PERCENT_EVERY_1MINUTE.deploymentConfigName): 
				return LambdaDeploymentConfig.LINEAR_10PERCENT_EVERY_1MINUTE;

			default: return LambdaDeploymentConfig.LINEAR_10PERCENT_EVERY_2MINUTES 
		}
	};
}
