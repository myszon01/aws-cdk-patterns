import {StringParameter} from "aws-cdk-lib/aws-ssm";
import {Environment} from "./SetupStack";
import {Construct} from "constructs";

export function createSsmImageTag (
    stack: Construct,
    appId: string,
    environment: Environment
) {
    const ssmParam = new StringParameter(stack, `${environment.environmentName}-tag-parameter`, {
        parameterName: `/${appId}/${environment.environmentName}/tags`,
        description: "Description for your parameter",
        stringValue: "{}",
    })

    return ssmParam.parameterName;
}