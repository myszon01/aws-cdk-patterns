

***Replace ACCOUNT_NR, REGION, BOOTSTRAP_QUALIFIER, APP_ID, STACK_NAME, CDK_TOOLKIT_NAME, GITHUB_ORG, GITHUB_REPO placeholders with your values.***

### Create a managed policy with below permissions for use with `--cloudformation-execution-policies`. 

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Action": ["sts:AssumeRole", "sts:TagSession"],
      "Resource": [
        "arn:aws:iam::ACCOUNT_NR:role/cdk-BOOTSTRAP_QUALIFIER*",
        "arn:aws:iam::ACCOUNT_NR:role/APP_ID-STACK_NAME*"
      ],
      "Effect": "Allow",
      "Sid": "AllowAssumeCfExecRole"
    },
    {
      "Action": "ssm:*",
      "Resource": "arn:aws:ssm:PLACEHOLDER_REGION:ACCOUNT_NR:parameter/cdk-bootstrap/BOOTSTRAP_QUALIFIER/version",
      "Effect": "Allow",
      "Sid": "AllowSsmBootstrapVersionCheck"
    },
    {
      "Action": [
        "iam:CreatePolicy",
        "iam:CreatePolicyVersion",
        "iam:DeletePolicyVersion",
        "iam:ListPolicyVersions",
        "iam:GetPolicy",
        "iam:DeletePolicy"
      ],
      "Resource": "arn:aws:iam::ACCOUNT_NR:policy/APP_ID-STACK_NAME*",
      "Effect": "Allow",
      "Sid": "PermissionsNeededForPolicyManagement"
    },
    {
      "Action": [
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
      "Resource": [
        "arn:aws:iam::ACCOUNT_NR:role/APP_ID-STACK_NAME*",
        "arn:aws:iam::ACCOUNT_NR:role/cdk-BOOTSTRAP_QUALIFIER*"
      ],
      "Effect": "Allow",
      "Sid": "PermissionsNeededForRoleManagement"
    },
    {
      "Action": "iam:PassRole",
      "Resource": "arn:aws:iam::ACCOUNT_NR:role/cdk-BOOTSTRAP_QUALIFIER*",
      "Effect": "Allow",
      "Sid": "PermissionsNeededForPassRole"
    }
  ]
}


```
### Create bootstrap/deploy role

#### Trust Relationship
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Principal": {
                "Federated": "arn:aws:iam::ACCOUNT_NR:oidc-provider/token.actions.githubusercontent.com"
            },
            "Action": "sts:AssumeRoleWithWebIdentity",
            "Condition": {
                "StringEquals": {
                    "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
                },
                "ForAnyValue:StringEquals": {
                    "token.actions.githubusercontent.com:sub": [
                        "repo:GITHUB_ORG/GITHUB_REPO:ref:refs/heads/main"
                    ]
                }
            }
        }
    ]
}
```

#### Role Permissions
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Action": [
                "sts:AssumeRole",
                "sts:TagSession"
            ],
            "Resource": "arn:aws:iam::ACCOUNT_NR:role/cdk-BOOTSTRAP_QUALIFIER*",
            "Effect": "Allow"
        },
        {
            "Action": [
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
            "Resource": "arn:aws:cloudformation:REGION:ACCOUNT_NR:stack/CDK_TOOLKIT_NAME/*",
            "Effect": "Allow"
        },
        {
            "Action": "cloudformation:DescribeStacks",
            "Resource": "arn:aws:cloudformation:REGION:ACCOUNT_NR:stack/APP_ID-STACK_NAME*",
            "Effect": "Allow"
        },
        {
            "Action": [
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
                "s3:DeleteBucketPolicy",
                "s3:PutBucketTagging"
            ],
            "Resource": [
              "arn:aws:s3:::cdk-BOOTSTRAP_QUALIFIER-assets-ACCOUNT_NR-REGION",
              "arn:aws:s3:::cdk-BOOTSTRAP_QUALIFIER-assets-ACCOUNT_NR-REGION/*"
            ],
            "Effect": "Allow"
        },
        {
            "Action": [
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
            "Resource": [
                "arn:aws:iam::ACCOUNT_NR:role/cdk-BOOTSTRAP_QUALIFIER*",
                "arn:aws:iam::ACCOUNT_NR:policy/APP_ID-STACK_NAME-base-toolkit-policy"
            ],
            "Effect": "Allow"
        },
        {
            "Action": "iam:ListPolicies",
            "Resource": "*",
            "Effect": "Allow"
        },
        {
            "Action": [
                "ssm:GetParameter",
                "ssm:GetParameters",
                "ssm:PutParameter",
                "ssm:DeleteParameter",
                "ssm:AddTagsToResource"
            ],
            "Resource": "arn:aws:ssm:REGION:ACCOUNT_NR:parameter/cdk-bootstrap/BOOTSTRAP_QUALIFIER/version",
            "Effect": "Allow"
        },
        {
            "Action": [
                "ecr:CreateRepository",
                "ecr:DeleteRepository",
                "ecr:DescribeRepositories",
                "ecr:PutLifecyclePolicy",
                "ecr:SetRepositoryPolicy",
                "ecr:TagResource"
            ],
            "Resource": "arn:aws:ecr:REGION:ACCOUNT_NR:repository/cdk-BOOTSTRAP_QUALIFIER-container-assets-*",
            "Effect": "Allow"
        }
    ]
}
```

