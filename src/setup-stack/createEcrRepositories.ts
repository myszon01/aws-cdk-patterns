import {RemovalPolicy, Stack} from "aws-cdk-lib";
import {Repository, TagMutability} from "aws-cdk-lib/aws-ecr";
import {PolicyStatement, ServicePrincipal} from "aws-cdk-lib/aws-iam";
import {EcrParameters} from "./SetupStack";

export function createEcrRepositories(
    stack: Stack,
    ecrParameters: EcrParameters
) {
    const { account, region } = stack
    const { repositories, registryName } = ecrParameters
    repositories.map(((repo) => {
        const repositoryName = `${registryName}/${repo}`
        const ecrRepo = new Repository(stack, `${repo}`, {
            repositoryName,
            imageScanOnPush: true,
            imageTagMutability: TagMutability.IMMUTABLE,
            removalPolicy: RemovalPolicy.DESTROY
        })

        ecrRepo.addToResourcePolicy(new PolicyStatement({
            principals: [
                new ServicePrincipal("lambda.amazonaws.com"),
                new ServicePrincipal("ecs.amazonaws.com"),
            ],
            actions: [
                "ecr:BatchGetImage",
                "ecr:GetDownloadUrlForLayer"
            ],
            conditions: {
                "ArnLike": {
                    "aws:sourceArn": [
                        `arn:aws:ecs:${region}:${account}:*`,
                        `arn:aws:lambda:${region}:${account}:function:*`
                    ]
                }
            }
        }))
    }))
}