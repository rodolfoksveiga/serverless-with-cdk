const providerEntityTemplate = `
    "id": "$item.id.S",
    "name": "$item.name.S",
    "contact" : {
        "name": "$item.contact.M.name.S",
        "email": "$item.contact.M.email.S"
    }
`

const getListProvidersRequestTemplate = (tableName: string) => `
    {
        "TableName": "${tableName}"
    }
`

const getListProvidersResponseTemplate = () => `
    #set($items = $input.path('$').Items)
    [
        #foreach($item in $items)
            {
                ${providerEntityTemplate}
            }
            #if($foreach.hasNext),#end
        #end
    ]
`

const getCreateProviderRequestTemplate = (tableName: string) => `
    {
        #set($root = $input.path('$'))
        "TableName": "${tableName}",
        "Item": {
            "pk": {"S": "PROVIDER#$root.id"},
            "sk": {"S": "PROVIDER#$root.id"},
            "id": {"S": "$root.id"},
            "name": {"S": "$root.name"},
            "contact": {
                "M": {
                    "name": {"S": "$root.contact.name"},
                    "email": {"S": "$root.contact.email"}
                }
            }
        }
    }
`

const getFetchOrDeleteProviderRequestTemplate = (tableName: string) => `
    {
        "TableName": "${tableName}",
        "Key": {
            "pk": {
                "S": "PROVIDER#$input.params('id')"
            },
            "sk": {
                "S": "PROVIDER#$input.params('id')"
            }
        }
    }
`

const getFetchProviderResponseTemplate = () => `
    #set($item = $input.path('$').Item)
    {
        #if(!$item.isEmpty())
            ${providerEntityTemplate}
        #end
    }
`

const getUpdateProviderRequestTemplate = (tableName: string) => `
    {
        #set($root = $input.path('$'))
        "TableName": "${tableName}",
        "Item": {
            "pk": {"S": "PROVIDER#$input.params('id')"},
            "sk": {"S": "PROVIDER#$input.params('id')"},
            "id": {"S": "$input.params('id')"},
            "name": {"S": "$root.name"},
            "contact": {
                "M": {
                    "name": {"S": "$root.contact.name"},
                    "email": {"S": "$root.contact.email"}
                }
            }
        }
    }
`

export {
    getListProvidersRequestTemplate,
    getCreateProviderRequestTemplate,
    getListProvidersResponseTemplate,
    getFetchOrDeleteProviderRequestTemplate,
    getFetchProviderResponseTemplate,
    getUpdateProviderRequestTemplate,
}
