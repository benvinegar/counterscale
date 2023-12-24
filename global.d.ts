interface CFAnalyticsEngine {
    writeDataPoint: Function
}

interface Environment {
    __STATIC_CONTENT: Fetcher;
    TALLYHO: CFAnalyticsEngine
    CF_BEARER_TOKEN: string
    CF_ACCOUNT_ID: string
}