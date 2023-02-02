import { Construct } from 'constructs'
import { Duration, RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib'
import { AttributeType, BillingMode, Table } from 'aws-cdk-lib/aws-dynamodb'
import {
    PolicyDocument,
    PolicyStatement,
    Role,
    ServicePrincipal,
} from 'aws-cdk-lib/aws-iam'
import { UserPool, UserPoolEmail, OAuthScope } from 'aws-cdk-lib/aws-cognito'
import {
    AwsIntegration,
    AuthorizationType,
    CfnAuthorizer,
    Cors,
    RestApi,
} from 'aws-cdk-lib/aws-apigateway'

import {
    methodResponses,
    responseParameters,
    getStandard400Response,
} from '../../back/standard-response-patterns'
import {
    getSignupUserRequestTemplate,
    getSetPasswordRequestTemplate,
    getSetPasswordResponseTemplate,
    getLoginRequestTemplate,
    getLoginResponseTemplate,
    getRefreshAccessTokenRequestTemplate,
    getRefreshAccessTokenResponseTemplate,
    getFetchUserRequestTemplate,
    getFetchUserResponseTemplate,
    getChangePasswordRequestData,
} from '../../back/auth-templates'
import {
    getUpdateProviderRequestTemplate,
    getFetchProviderResponseTemplate,
    getFetchOrDeleteProviderRequestTemplate,
    getListProvidersResponseTemplate,
    getCreateProviderRequestTemplate,
    getListProvidersRequestTemplate,
} from '../../back/provider-templates'

export class InfraStack extends Stack {
    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props)

        // dynamodb
        const tableName = 'rodolfo-table'
        const table = new Table(this, tableName, {
            tableName,
            removalPolicy: RemovalPolicy.DESTROY,
            billingMode: BillingMode.PAY_PER_REQUEST,
            partitionKey: { name: 'pk', type: AttributeType.STRING },
            sortKey: { name: 'sk', type: AttributeType.STRING },
        })

        const tablePolicy = new PolicyDocument({
            statements: [
                new PolicyStatement({
                    actions: [
                        'dynamodb:Scan',
                        'dynamodb:GetItem',
                        'dynamodb:Query',
                        'dynamodb:PutItem',
                        'dynamodb:DeleteItem',
                    ],
                    resources: [table.tableArn],
                }),
            ],
        })

        // cognito
        const userPoolName = 'rodolfo-user-pool'
        const userPool = new UserPool(this, userPoolName, {
            removalPolicy: RemovalPolicy.DESTROY,
            userPoolName: userPoolName,
            selfSignUpEnabled: false,
            standardAttributes: {
                email: {
                    required: true,
                    mutable: true,
                },
            },
            signInCaseSensitive: false,
            passwordPolicy: {
                minLength: 8,
                requireLowercase: true,
                requireUppercase: true,
                requireDigits: true,
                requireSymbols: true,
                tempPasswordValidity: Duration.days(7),
            },
            signInAliases: {
                email: true,
                username: false,
                phone: false,
            },
            email: UserPoolEmail.withCognito(),
        })

        const userPoolClientName = 'rodolfo-user-pool-client'
        const userPoolClient = userPool.addClient(userPoolClientName, {
            userPoolClientName: userPoolClientName,
            authFlows: {
                userPassword: true,
                adminUserPassword: false,
                userSrp: false,
                custom: false,
            },
            oAuth: {
                scopes: [OAuthScope.OPENID],
            },
        })

        const cognitoPolicy = new PolicyDocument({
            statements: [
                new PolicyStatement({
                    actions: [
                        'cognito-idp:AdminCreateUser',
                        'cognito-idp:RespondToAuthChallenge',
                        'cognito-idp:InitiateAuth',
                        'cognito-idp:ChangePassword',
                        'cognito-idp:GetUser',
                    ],
                    resources: [userPool.userPoolArn],
                }),
            ],
        })

        // api gateway
        const restApiName = 'rodolfo-api'
        const restApi = new RestApi(this, restApiName, {
            restApiName: restApiName,
            deployOptions: {
                stageName: 'v1',
            },
            defaultCorsPreflightOptions: {
                statusCode: 200,
                allowOrigins: Cors.ALL_ORIGINS,
                allowMethods: Cors.ALL_METHODS,
                allowHeaders: Cors.DEFAULT_HEADERS,
            },
        })

        const restApiTableRoleName = 'rest-api-table-role'
        const restApiTableRole = new Role(this, restApiTableRoleName, {
            roleName: restApiTableRoleName,
            inlinePolicies: { tablePolicy },
            assumedBy: new ServicePrincipal('apigateway.amazonaws.com'),
        })

        const restApiCognitoRoleName = 'rest-api-cognito-role'
        const restApiCognitoRole = new Role(this, restApiCognitoRoleName, {
            roleName: restApiCognitoRoleName,
            assumedBy: new ServicePrincipal('apigateway.amazonaws.com'),
            inlinePolicies: { cognitoPolicy },
        })

        // authorize api gateway through cognito
        const authorizerName = 'rodolfo-authorizer'
        const authorizer = new CfnAuthorizer(this, authorizerName, {
            name: authorizerName,
            restApiId: restApi.restApiId,
            type: 'COGNITO_USER_POOLS',
            providerArns: [userPool.userPoolArn],
            identitySource: 'method.request.header.Authorization',
        })

        // GET /provider
        const providerResource = restApi.root.addResource('provider')
        providerResource.addMethod(
            'GET',
            new AwsIntegration({
                integrationHttpMethod: 'POST',
                service: 'dynamodb',
                action: 'Scan',
                options: {
                    credentialsRole: restApiTableRole,
                    requestTemplates: {
                        'application/json': getListProvidersRequestTemplate(
                            table.tableName
                        ),
                    },
                    integrationResponses: [
                        {
                            statusCode: '200',
                            responseTemplates: {
                                'application/json':
                                    getListProvidersResponseTemplate(),
                            },
                            responseParameters,
                        },
                        getStandard400Response(),
                    ],
                },
            }),
            {
                operationName: 'ListProviders',
                methodResponses,
                authorizationType: AuthorizationType.COGNITO,
                authorizer: {
                    authorizerId: authorizer.ref,
                },
            }
        )

        // POST /provider
        providerResource.addMethod(
            'POST',
            new AwsIntegration({
                integrationHttpMethod: 'POST',
                service: 'dynamodb',
                action: 'PutItem',
                options: {
                    credentialsRole: restApiTableRole,
                    requestTemplates: {
                        'application/json': getCreateProviderRequestTemplate(
                            table.tableName
                        ),
                    },
                    integrationResponses: [
                        {
                            statusCode: '200',
                            responseTemplates: {
                                'application/json': '{}',
                            },
                            responseParameters,
                        },
                        getStandard400Response(),
                    ],
                },
            }),
            {
                operationName: 'CreateProvider',
                methodResponses,
                authorizationType: AuthorizationType.COGNITO,
                authorizer: {
                    authorizerId: authorizer.ref,
                },
            }
        )
        //endregion

        // GET /provider/{id}
        const providerIdResource = providerResource.addResource('{id}')
        providerIdResource.addMethod(
            'GET',
            new AwsIntegration({
                integrationHttpMethod: 'POST',
                service: 'dynamodb',
                action: 'GetItem',
                options: {
                    credentialsRole: restApiTableRole,
                    requestTemplates: {
                        'application/json':
                            getFetchOrDeleteProviderRequestTemplate(
                                table.tableName
                            ),
                    },
                    integrationResponses: [
                        {
                            statusCode: '200',
                            responseTemplates: {
                                'application/json':
                                    getFetchProviderResponseTemplate(),
                            },
                            responseParameters,
                        },
                        getStandard400Response(),
                    ],
                },
            }),
            {
                operationName: 'FetchProvider',
                requestParameters: {
                    'method.request.path.id': true,
                },
                methodResponses,
                authorizationType: AuthorizationType.COGNITO,
                authorizer: {
                    authorizerId: authorizer.ref,
                },
            }
        )

        // PUT /provider/{id}
        providerIdResource.addMethod(
            'PUT',
            new AwsIntegration({
                integrationHttpMethod: 'POST',
                service: 'dynamodb',
                action: 'PutItem',
                options: {
                    credentialsRole: restApiTableRole,
                    requestTemplates: {
                        'application/json': getUpdateProviderRequestTemplate(
                            table.tableName
                        ),
                    },
                    integrationResponses: [
                        {
                            statusCode: '200',
                            responseTemplates: {
                                'application/json': '{}',
                            },
                            responseParameters,
                        },
                        getStandard400Response(),
                    ],
                },
            }),
            {
                operationName: 'UpdateProvider',
                requestParameters: {
                    'method.request.path.id': true,
                },
                methodResponses,
                authorizationType: AuthorizationType.COGNITO,
                authorizer: {
                    authorizerId: authorizer.ref,
                },
            }
        )

        // DEL /provider/{id}
        providerIdResource.addMethod(
            'DELETE',
            new AwsIntegration({
                integrationHttpMethod: 'POST',
                service: 'dynamodb',
                action: 'DeleteItem',
                options: {
                    credentialsRole: restApiTableRole,
                    requestTemplates: {
                        'application/json':
                            getFetchOrDeleteProviderRequestTemplate(
                                table.tableName
                            ),
                    },
                    integrationResponses: [
                        {
                            statusCode: '200',
                            responseTemplates: {
                                'application/json': '{}',
                            },
                            responseParameters,
                        },
                        getStandard400Response(),
                    ],
                },
            }),
            {
                operationName: 'DeleteProvider',
                requestParameters: {
                    'method.request.path.id': true,
                },
                methodResponses,
                authorizationType: AuthorizationType.COGNITO,
                authorizer: {
                    authorizerId: authorizer.ref,
                },
            }
        )

        // POST /auth/signup
        const authResource = restApi.root.addResource('auth')
        const signupResource = authResource.addResource('signup')

        signupResource.addMethod(
            'POST',
            new AwsIntegration({
                integrationHttpMethod: 'POST',
                service: 'cognito-idp',
                action: 'AdminCreateUser',
                options: {
                    credentialsRole: restApiCognitoRole,
                    requestTemplates: {
                        'application/json': getSignupUserRequestTemplate(
                            userPool.userPoolId
                        ),
                    },
                    integrationResponses: [
                        {
                            statusCode: '200',
                            responseTemplates: {
                                'application/json': '{}',
                            },
                            responseParameters,
                        },
                        getStandard400Response(),
                    ],
                },
            }),
            {
                operationName: 'SignupUser',
                methodResponses,
            }
        )

        // POST /auth/set-password
        const setPasswordResource = authResource.addResource('set-password')

        setPasswordResource.addMethod(
            'POST',
            new AwsIntegration({
                integrationHttpMethod: 'POST',
                service: 'cognito-idp',
                action: 'RespondToAuthChallenge',
                options: {
                    credentialsRole: restApiCognitoRole,
                    requestTemplates: {
                        'application/json': getSetPasswordRequestTemplate(
                            userPoolClient.userPoolClientId
                        ),
                    },
                    integrationResponses: [
                        {
                            statusCode: '200',
                            responseTemplates: {
                                'application/json':
                                    getSetPasswordResponseTemplate(),
                            },
                            responseParameters,
                        },
                        getStandard400Response(),
                    ],
                },
            }),
            {
                operationName: 'SetPassword',
                methodResponses,
            }
        )

        // POST /auth/login
        const loginUserResource = authResource.addResource('login')

        loginUserResource.addMethod(
            'POST',
            new AwsIntegration({
                integrationHttpMethod: 'POST',
                service: 'cognito-idp',
                action: 'InitiateAuth',
                options: {
                    credentialsRole: restApiCognitoRole,
                    requestTemplates: {
                        'application/json': getLoginRequestTemplate(
                            userPoolClient.userPoolClientId
                        ),
                    },
                    integrationResponses: [
                        {
                            statusCode: '200',
                            responseTemplates: {
                                'application/json': getLoginResponseTemplate(),
                            },
                            responseParameters,
                        },
                        getStandard400Response(),
                    ],
                },
            }),
            {
                operationName: 'Login',
                methodResponses,
            }
        )

        // POST /auth/refresh-access-token
        const refreshAccessTokenResource = authResource.addResource(
            'refresh-access-token'
        )

        refreshAccessTokenResource.addMethod(
            'POST',
            new AwsIntegration({
                integrationHttpMethod: 'POST',
                service: 'cognito-idp',
                action: 'InitiateAuth',
                options: {
                    credentialsRole: restApiCognitoRole,
                    requestTemplates: {
                        'application/json':
                            getRefreshAccessTokenRequestTemplate(
                                userPool.userPoolId,
                                userPoolClient.userPoolClientId
                            ),
                    },
                    integrationResponses: [
                        {
                            statusCode: '200',
                            responseTemplates: {
                                'application/json':
                                    getRefreshAccessTokenResponseTemplate(),
                            },
                            responseParameters,
                        },
                        getStandard400Response(),
                    ],
                },
            }),
            {
                operationName: 'RefreshAccessToken',
                methodResponses,
            }
        )

        // POST /auth/user
        const userResource = authResource.addResource('user')

        userResource.addMethod(
            'POST',
            new AwsIntegration({
                integrationHttpMethod: 'POST',
                service: 'cognito-idp',
                action: 'GetUser',
                options: {
                    credentialsRole: restApiCognitoRole,
                    requestTemplates: {
                        'application/json': getFetchUserRequestTemplate(),
                    },
                    integrationResponses: [
                        {
                            statusCode: '200',
                            responseTemplates: {
                                'application/json':
                                    getFetchUserResponseTemplate(),
                            },
                            responseParameters,
                        },
                        getStandard400Response(),
                    ],
                },
            }),
            {
                operationName: 'FetchUser',
                methodResponses,
            }
        )

        // POST /auth/change-password
        const changePasswordResource =
            authResource.addResource('change-password')

        changePasswordResource.addMethod(
            'POST',
            new AwsIntegration({
                integrationHttpMethod: 'POST',
                service: 'cognito-idp',
                action: 'ChangePassword',
                options: {
                    credentialsRole: restApiCognitoRole,
                    requestTemplates: {
                        'application/json': getChangePasswordRequestData(
                            userPoolClient.userPoolClientId
                        ),
                    },
                    integrationResponses: [
                        {
                            statusCode: '200',
                            responseTemplates: {
                                'application/json': '{}',
                            },
                            responseParameters,
                        },
                        getStandard400Response(),
                    ],
                },
            }),
            {
                operationName: 'ChangePassword',
                methodResponses,
            }
        )
    }
}
