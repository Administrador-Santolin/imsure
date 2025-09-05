export const environment = {
    //   ...,
    akad: {
        subscriptionKey: '',   // Ocp-Apim-Subscription-Key ✅
        clientHeader: 'argo_api_moderation', // Client ✅
        securityBaseUrl: 'https://azuh3-br-api-platform.azure-api.net/security',
        tokenPath: '/connect/token',
        operationBaseUrl: 'https://azuh3-br-api-platform.azure-api.net/operation/api',
        quotationBaseUrl: 'https://azuh3-br-api-platform.azure-api.net/quotation/api',
        operationCode: 'b90dc9d381b5447a97a1386b026a4315',
        username: '81510015000',
        password: 'akad@2023',
        clientId: 'portal_argo',
        clientSecret: 'portal_argo_secret',
        brokerIdentityCPF: '81510015000',
        brokerageFirmCNPJ: null
    },

    fairfax: {
        baseUrl: 'https://azuh1-br-fairfax-gateway.azure-api.net/partner/api/v1/quotation/contracting',
        subscriptionKey: '474ebccd1512407ea009928603d73cbd',
        registerNumber: '232148243',
        operationCode: 'MEDICAL-CIVIL-LIABILITY-PARTNER'
    }
}