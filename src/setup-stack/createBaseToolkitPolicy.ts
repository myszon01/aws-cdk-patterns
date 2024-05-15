import {Stack} from "aws-cdk-lib";
import {ManagedPolicy, PolicyStatement} from "aws-cdk-lib/aws-iam";
import {Environment} from "./SetupStack";

export function createBaseToolkitPolicy(
    stack: Stack,
    appId: string,
    environment: Environment
) {
    const { bootstrapQualifier, environmentName} = environment
    const { account, region } = stack

    const mngPolicy = new ManagedPolicy(stack, "base-toolkit-policy", {
        statements: [
            new PolicyStatement({
                actions: [
                    "sts:AssumeRole",
                    "sts:TagSession"
                ],
                resources: [
                    `arn:aws:iam::${account}:role/cdk-${bootstrapQualifier}*`,
                    `arn:aws:iam::${account}:role/${appId}-${environmentName}*`
                ],
                sid: "AllowAssumeCfExecRole"
            }),
            new PolicyStatement({
                actions: ["ssm:*"],
                resources: [`arn:aws:ssm:${region}:${account}:parameter/cdk-bootstrap/${bootstrapQualifier}/version`],
                sid: "AllowSsmBootstrapVersionCheck"
            }),
            new PolicyStatement({
                actions: [
                    "iam:CreatePolicy",
                    "iam:CreatePolicyVersion",
                    "iam:DeletePolicyVersion",
                    "iam:ListPolicyVersions",
                    "iam:GetPolicy",
                    "iam:DeletePolicy"
                ],
                resources: [`arn:aws:iam::${account}:policy/${appId}-${environmentName}*`],
                sid: "PermissionsNeededForPolicyManagement"
            }),
            new PolicyStatement({
                actions: [
                    "iam:GetRole",
                    "iam:CreateRole",
                    "iam:GetRolePolicy",
                    "iam:AttachRolePolicy",
                    "iam:DeleteRolePolicy",
                    "iam:DeleteRole",
                    "iam:DetachRolePolicy",
                    "iam:UntagRole",
                    "iam:PutRolePolicy",
                    "iam:TagRole",
                    "iam:ListRoleTags"
                ],
                resources: [
                    `arn:aws:iam::${account}:role/${appId}-${environmentName}*`,
                    `arn:aws:iam::${account}:role/cdk-${bootstrapQualifier}*`
                ],
                sid: "PermissionsNeededForRoleManagement"
            }),
            new PolicyStatement({
                actions: ["iam:PassRole"],
                resources: [`arn:aws:iam::${account}:role/cdk-${bootstrapQualifier}*`],
                sid: "PermissionsNeededForPassRole"
            })
        ]
    })
    return mngPolicy.managedPolicyArn
}