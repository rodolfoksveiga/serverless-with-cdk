#!/usr/bin/env node
import 'source-map-support/register'
import { App, DefaultStackSynthesizer } from 'aws-cdk-lib'

import { InfraStack } from '../lib/infra-stack'

const app = new App()
new InfraStack(app, 'rodolfo-cdk', {
    stackName: 'rodolfo-cdk-stack',
    synthesizer: new DefaultStackSynthesizer({
        fileAssetsBucketName: 'rodolfo-cdk-assets',
    }),
    env: { account: '623130918127', region: 'eu-central-1' },
})
