const allowedResponseHeaders = {
    'method.response.header.Access-Control-Allow-Headers': true,
    'method.response.header.Access-Control-Allow-Methods': true,
    'method.response.header.Access-Control-Allow-Origin': true,
}

const methodResponses = [
    { statusCode: '200', responseParameters: allowedResponseHeaders },
    { statusCode: '400', responseParameters: allowedResponseHeaders },
]

const responseParameters = {
    'method.response.header.Access-Control-Allow-Headers':
        "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Amz-User-Agent'",
    'method.response.header.Access-Control-Allow-Methods':
        "'OPTIONS,GET,PUT,POST,DELETE,PATCH,HEAD'",
    'method.response.header.Access-Control-Allow-Origin': "'*'",
}

const standard400ResponseTemplate = `
    #set($data = $input.path("$"))
    {
        "error": {
            "status": 400,
            "message": "$data.message"
        }
    }
`

const getStandard400Response = () => ({
    selectionPattern: '400',
    statusCode: '400',
    responseTemplates: {
        'application/json': standard400ResponseTemplate,
    },
    responseParameters,
})

export { methodResponses, responseParameters, getStandard400Response }
