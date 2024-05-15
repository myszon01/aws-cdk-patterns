import {CfnOutput, Stack} from "aws-cdk-lib";
import {Construct} from "constructs";
import {StackProps} from "aws-cdk-lib/core/lib/stack";
import {ManagedPolicy, PolicyStatement} from "aws-cdk-lib/aws-iam";
import {createEcrRepositories} from "./createEcrRepositories";
import {createGithubEcrPushRole} from "./createGithubEcrPushRole";
import {createGithubCdkDeployRole} from "./createGithubCdkDeployRole";
import {createSsmImageTag} from "./createSsmImageTag";
import {CustomPolicy} from "aws-cdk-lib/aws-config";
import {createBaseToolkitPolicy} from "./createBaseToolkitPolicy";

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
                new CfnOutput(this, `${environment.environmentName}-ssm-image-tag-name`, { value: ssmImageTagName });
            })
            const ecrPushRoleArn = createGithubEcrPushRole(this, github, ecrParameters.registryName);
            new CfnOutput(this, 'github-ecr-push-role-arn', { value: ecrPushRoleArn });
        }

        // create other roles needed for deployment and pipeline setup
        environments?.forEach(environment => {
            const roleArn = createGithubCdkDeployRole(this, github, appId, environment)
            const baseToolkitPolicyArn = createBaseToolkitPolicy(this, appId, environment)

            new CfnOutput(this, `${environment.environmentName}-github-deploy-role-arn`, { value: roleArn });
            new CfnOutput(this, `${environment.environmentName}-base-policy--arn`, { value: baseToolkitPolicyArn });
        })
    }
}