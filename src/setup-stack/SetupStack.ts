import {CfnOutput, Stack} from "aws-cdk-lib";
import {Construct} from "constructs";
import {StackProps} from "aws-cdk-lib/core/lib/stack";
import {PolicyStatement} from "aws-cdk-lib/aws-iam";
import {createEcrRepositories} from "./createEcrRepositories";
import {createEcrPushRole} from "./createEcrPushRole";
import {createCdkDeployRole} from "./createCdkDeployRole";
import {createSsmImageTag} from "./createSsmImageTag";

interface SetupStackProps extends StackProps {
    github: Github
    appId: string,
    environments: Environment[],
    ecrParameters?: EcrParameters
    repositories?: string[] | null
}

export interface Environment {
    environmentName: string,
    bootstrapQualifier: string
}

export interface Github {
    owner: string,
    repo: string,
}

export interface EcrParameters {
    registryName: string,
    repositories: string[]
}

export class SetupStack extends Stack {
    public readonly policyStatements: PolicyStatement[]

    constructor(scope: Construct, id: string, props: SetupStackProps) {
        super(scope, id, props);
        const shortId = id.substring(0, 25);

        const {
            appId,
            github,
            environments,
            ecrParameters
        } = props;
        const { account, region } = this

        this.policyStatements = [
            new PolicyStatement({
                sid: "iamPermissions",
                actions: ["iam:PassRole"],
                resources: [`arn:aws:iam::${account}:role/${shortId}*`],
            }),
        ];

        if (ecrParameters) {
            createEcrRepositories(this, ecrParameters)
            environments?.forEach(environment => {
                const ssmImageTagName = createSsmImageTag(this, appId, environment)
                new CfnOutput(this, `${environment.environmentName}SsmImageTagName`, { value: ssmImageTagName });
            })
            const ecrPushRoleArn = createEcrPushRole(this, github, ecrParameters.registryName);
            new CfnOutput(this, 'EcrPushRoleArn', { value: ecrPushRoleArn });
        }

        // create other roles needed for deployment and pipeline setup
        environments?.forEach(environment => {
            const roleArn = createCdkDeployRole(this, github, appId, environment)
            new CfnOutput(this, `${environment.environmentName}DeployRoleArn`, { value: roleArn });
        })
    }



}