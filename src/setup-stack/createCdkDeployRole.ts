import {Stack} from "aws-cdk-lib";
import {FederatedPrincipal, PolicyStatement, Role} from "aws-cdk-lib/aws-iam";
import {Environment, Github} from "./SetupStack";



export function createCdkDeployRole (
    stack: Stack,
    github: Github,
    appId: string,
    environment: Environment
): string {
    const { account, region} = stack
    const {
        environmentName,
        bootstrapQualifier
    } = environment
    const {
        owner,
        repo
    } = github

    const cdkDeployRole = new Role(stack, `${environmentName}-cdk-deploy-role`, {
        assumedBy: new FederatedPrincipal(
            `arn:aws:iam::${account}:oidc-provider/token.actions.githubusercontent.com`,
            {
                "StringEquals": {
                    "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
                },
                "ForAnyValue:StringEquals": {
                    "token.actions.githubusercontent.com:sub": [
                        `repo:${owner}/${repo}:ref:refs/heads/main`,
                        `repo:${owner}/${repo}:environment:${environmentName}`

                    ]
                },
            },
            "sts:AssumeRoleWithWebIdentity"
        )
    })

    const policyStatements = [
        new PolicyStatement({
            actions: [
                "sts:AssumeRole",
                "sts:TagSession"
            ],
            resources: [
                `arn:aws:iam::${account}:role/cdk-${bootstrapQualifier}*`
            ]
        }),
        new PolicyStatement({
            actions: [
                "cloudformation:CreateChangeSet",
                "cloudformation:CreateStack",
                "cloudformation:DescribeChangeSet",
                "cloudformation:DeleteChangeSet",
                "cloudformation:DescribeStacks",
                "cloudformation:DescribeStackEvents",
                "cloudformation:ExecuteChangeSet",
                "cloudformation:GetTemplate",
                "cloudformation:ValidateTemplate",
                "cloudformation:DeleteStack"
            ],
            resources: [
                `arn:aws:cloudformation:${region}:${account}:stack/cdk-toolkit-${appId}-${environmentName}/*`
            ]
        }),
        new PolicyStatement({
            actions: [
                "cloudformation:DescribeStacks"
            ],
            resources: [
                `arn:aws:cloudformation:${region}:${account}:stack/${appId}-${environmentName}*`
            ]
        }),
        new PolicyStatement({
            actions: [
                "s3:CreateBucket",
                "s3:GetBucketLocation",
                "s3:ListBucket",
                "s3:GetObject",
                "s3:PutObject",
                "s3:PutEncryptionConfiguration",
                "s3:PutLifecycleConfiguration",
                "s3:PutBucketVersioning",
                "s3:PutBucketPublicAccessBlock",
                "s3:PutBucketPolicy",
                "s3:GetBucketPolicy",
                "s3:DeleteBucketPolicy"
            ],
            resources: [
                `arn:aws:s3:::cdk-${bootstrapQualifier}-assets-${appId}-${environmentName}`,
                `arn:aws:s3:::cdk-${bootstrapQualifier}-assets-${appId}-${environmentName}/*`

            ]
        }),
        new PolicyStatement({
            actions: [
                "iam:CreatePolicy",
                "iam:GetRole",
                "iam:CreateRole",
                "iam:TagRole",
                "iam:UntagRole",
                "iam:AttachRolePolicy",
                "iam:GetRolePolicy",
                "iam:DeleteRole",
                "iam:PutRolePolicy",
                "iam:DeleteRolePolicy",
                "iam:DetachRolePolicy",
                "iam:UpdateAssumeRolePolicy",
                "sts:AssumeRole",
                "sts:TagSession"
            ],
            resources: [
                `arn:aws:iam::${account}:role/cdk-${bootstrapQualifier}*`,
                `arn:aws:iam::${account}:policy/${appId}-${environmentName}-base-toolkit-policy`
            ]
        }),
        new PolicyStatement({
            actions: [
                "iam:ListPolicies"
            ],
            resources: [
                "*"
            ]
        }),
        new PolicyStatement({
            actions: [
                "ssm:GetParameter",
                "ssm:GetParameters",
                "ssm:PutParameter",
                "ssm:DeleteParameter"
            ],
            resources: [
                `arn:aws:ssm:${region}:${account}:parameter/cdk-bootstrap/${bootstrapQualifier}/version`
            ]
        }),

        new PolicyStatement({
            actions: [
                "ssm:GetParameter",
                "ssm:GetParameters",
                "ssm:PutParameter"
            ],
            resources: [
                `arn:aws:ssm:${region}:${account}:parameter/${appId}/${environmentName}/*`
            ]
        }),
        new PolicyStatement({
            actions: [
                "ecr:DescribeRepositories"
            ],
            resources: [
                `arn:aws:ecr:${region}:${account}:repository/${appId}/*`
            ]
        })
    ]

    policyStatements.forEach(policyStatement => {
        cdkDeployRole.addToPolicy(policyStatement);
    })

    return cdkDeployRole.roleArn;
}