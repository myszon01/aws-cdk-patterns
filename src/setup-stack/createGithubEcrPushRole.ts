import {Stack} from "aws-cdk-lib";
import {FederatedPrincipal, PolicyStatement, Role} from "aws-cdk-lib/aws-iam";
import {Github} from "./SetupStack";

export function  createGithubEcrPushRole (
    stack: Stack,
    github: Github,
    registry: string
): string {
    const { account, region } = stack
    const {
        owner,
        repo
    } = github

    const ecrPushRole = new Role(stack, "ecr-push-role", {
        assumedBy: new FederatedPrincipal(
            `arn:aws:iam::${account}:oidc-provider/token.actions.githubusercontent.com`,
            {
                "StringEquals": {
                    "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
                    "token.actions.githubusercontent.com:sub": `repo:${owner}/${repo}:ref:refs/heads/main`
                }
            },
            "sts:AssumeRoleWithWebIdentity"
        ),
    })
    ecrPushRole.addToPolicy(new PolicyStatement({
        actions: [
            "ecr:GetAuthorizationToken",
            "ecr:BatchCheckLayerAvailability",
            "ecr:GetDownloadUrlForLayer",
            "ecr:GetRepositoryPolicy",
            "ecr:DescribeRepositories",
            "ecr:ListImages",
            "ecr:DescribeImages",
            "ecr:BatchGetImage",
            "ecr:InitiateLayerUpload",
            "ecr:UploadLayerPart",
            "ecr:CompleteLayerUpload",
            "ecr:PutImage"
        ],
        resources: [
            `arn:aws:ecr:${region}:${account}:repository/${registry}/*`
        ]
    }))
    ecrPushRole.addToPolicy(new PolicyStatement({
        actions: [
            "ecr:GetAuthorizationToken"
        ],
        resources: [
            "*"
        ]
    }))
    return ecrPushRole.roleArn;
}