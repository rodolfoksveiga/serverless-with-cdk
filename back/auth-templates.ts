const getSignupUserRequestTemplate = (userPoolId: string) => `
    #set($root = $input.path("$"))
    {
        "UserPoolId": "${userPoolId}",
        "Username": "$root.email",
        "DesiredDeliveryMediums": ["EMAIL"],
        "ForceAliasCreation": "true",
        "UserAttributes": [
            {
                "Name": "email",
                "Value": "$root.email"
            },
            {
                "Name": "email_verified",
                "Value": "true"
            }
        ]
    }
`

const getSetPasswordRequestTemplate = (userPoolClientId: string) => `
    #set($root = $input.path("$"))
    {
        "ClientId": "${userPoolClientId}",
        "ChallengeName": "NEW_PASSWORD_REQUIRED",
        "Session": "$root.session",
        "ChallengeResponses": {
            "USERNAME": "$root.email",
            "NEW_PASSWORD": "$root.newPassword"
        }
    }
`

const getSetPasswordResponseTemplate = () => `
    #set($root = $input.path("$"))
    {
        "token": {
            "access": "$root.AuthenticationResult.AccessToken",
            "id": "$root.AuthenticationResult.IdToken",
            "refresh": "$root.AuthenticationResult.RefreshToken"
        }
    }
`

const getLoginRequestTemplate = (userPoolClientId: string) => `
    #set($root = $input.path("$"))
    {
        "ClientId": "${userPoolClientId}",
        "AuthFlow": "USER_PASSWORD_AUTH",
        "AuthParameters": {
            "USERNAME": "$root.email",
            "PASSWORD": "$root.password"
        }
    }
`

const getLoginResponseTemplate = () => `
    #set($root = $input.path("$"))
    {
        #if($root.ChallengeName == "NEW_PASSWORD_REQUIRED")
            "challenge": {
                "name":"$root.ChallengeName",
                "session":"$root.Session"
            }
        #else
            "token": {
                "access":"$root.AuthenticationResult.AccessToken",
                "id":"$root.AuthenticationResult.IdToken",
                "refresh":"$root.AuthenticationResult.RefreshToken"
            }
        #end
    }
`

const getRefreshAccessTokenRequestTemplate = (
    userPoolId: string,
    userPoolClientId: string
) => `
    #set($root = $input.path("$"))
    {
        "UserPoolId": "${userPoolId}",
        "ClientId": "${userPoolClientId}",
        "AuthFlow": "REFRESH_TOKEN_AUTH",
        "AuthParameters": {
            "REFRESH_TOKEN": "$root.refreshToken"
        }
    }
`

const getRefreshAccessTokenResponseTemplate = () => `
    #set($root = $input.path("$"))
    {
        "token": {
            "access": "$root.AuthenticationResult.AccessToken",
            "id": "$root.AuthenticationResult.IdToken"
        }
    }
`

const getFetchUserRequestTemplate = () => `
    #set($root = $input.path("$"))
    {
        "AccessToken": "$root.accessToken"
    }
`

const getFetchUserResponseTemplate = () => `
    #set($data = $input.path("$"))
    {
        #foreach($attribute in $data.UserAttributes)
            #if($attribute.Name == "email_verified")
            "$attribute.Name.replace("_verified", "Verified")": $attribute.Value #if($foreach.hasNext),#end
            #else
            "$attribute.Name.replace("sub", "username").replace("custom:","")": "$attribute.Value" #if($foreach.hasNext),#end
            #end
        #end
    }
`

const getChangePasswordRequestData = (userPoolClientId: string) => `
    #set($root = $input.path("$"))
    {
        "ClientId": "${userPoolClientId}",
        "AccessToken": "$root.accessToken",
        "PreviousPassword": "$root.password",
        "ProposedPassword": "$root.newPassword"
    }
`

export {
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
}
