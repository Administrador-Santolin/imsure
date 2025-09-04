export const environment = {
    //   ...,
    akad: {
        subscriptionKey: '',                 // Ocp-Apim-Subscription-Key
        clientHeader: 'argo_api_moderation',    // cabeçalho "Client"
        securityBaseUrl: 'https://azuh3-br-api-platform.azure-api.net/security',
        tokenPath: '/connect/token',
        operationBaseUrl: 'https://azuh3-br-api-platform.azure-api.net/operation/api',
        quotationBaseUrl: 'https://azuh3-br-api-platform.azure-api.net/quotation/api',
        operationCode: '',                      // se necessário
        username: '81510015000',                // <— sandbox
        password: 'akad@2023',
        clientId: 'portal_argo',
        clientSecret: 'portal_argo_secret',
        brokerIdentityCPF: '81510015000',       // comentários da doc
        brokerageFirmCNPJ: null                 // ou CNPJ quando Assessoria
    }
}