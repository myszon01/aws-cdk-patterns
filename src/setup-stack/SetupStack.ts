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
                new CfnOutput(this, `${environment.environmentName}-SsmImageTagName`, { value: ssmImageTagName });
            })
            const ecrPushRoleArn = createGithubEcrPushRole(this, github, ecrParameters.registryName);
            new CfnOutput(this, 'GithubEcrPushRoleArn', { value: ecrPushRoleArn });

            this.policyStatements.push(
                new PolicyStatement({
                    sid: "EcrPermissions",
                    actions: [
                        "ecr:CreateRepository",
                        "ecr:TagResource",
                        "ecr:SetRepositoryPolicy",
                        "ecr:DeleteRepository"
                    ],
                    resources: [
                        ...ecrParameters.repositories.map(repository => {
                            return `arn:aws:ecr:${region}:${account}:repository/${ecrParameters?.registryName}/${repository}`;
                        }),

                    ]
                }),
                new PolicyStatement({
                    sid: "SsmPermissions",
                    actions: [
                        "ssm:PutParameter",
                        "ssm:DeleteParameter",
                        "ssm:AddTagsToResource"
                    ],
                    resources: [
                        ...environments.map(environment => {
                            return `arn:aws:ssm:${region}:${account}:parameter/${appId}/${environment.environmentName}/tags`;
                        }),

                    ]
                })
            )
        }

        // create other roles needed for deployment and pipeline setup
        environments?.forEach(environment => {
            const roleArn = createGithubCdkDeployRole(this, github, appId, environment)
            const baseToolkitPolicyArn = createBaseToolkitPolicy(this, appId, environment)



            new CfnOutput(this, `${environment.environmentName}-GithubDeployRoleArn`, { value: roleArn });
            new CfnOutput(this, `${environment.environmentName}-CdkBasePolicyArn`, { value: baseToolkitPolicyArn });
        })
    }
}