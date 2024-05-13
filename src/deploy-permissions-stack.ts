import {Policy, PolicyStatement, Role} from "aws-cdk-lib/aws-iam";
import {StackProps} from "aws-cdk-lib/core/lib/stack";
import {Stack} from "aws-cdk-lib";
import {Construct} from "constructs";


export interface DeployPermissionsStackProps extends StackProps {
	qualifier: string;
	statements: PolicyStatement[];
}
export class DeployPermissionsStack extends Stack {
	constructor(
		scope: Construct,
		id: string,
		props: DeployPermissionsStackProps,
	) {
		super(scope, id, props);

		const { qualifier, statements } = props;
		const { account, region } = this;

		const toolkitRole = Role.fromRoleName(
			this,
			"Role",
			`cdk-${qualifier}-cfn-exec-role-${account}-${region}`,
		);

		toolkitRole.attachInlinePolicy(
			new Policy(this, id, {
				policyName: `${qualifier}-${id}-deploy-permission`,
				statements,
			}),
		);
	}
}
