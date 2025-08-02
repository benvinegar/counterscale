import { AnalyticsEngineAPI } from "../../analytics/query";

export function createFetchResponse<T>(data: T) {
    return {
        ok: true,
        json: () => new Promise<T>((resolve) => resolve(data)),
    };
}

export function getDefaultContext() {
    return {
        context: {
            analyticsEngine: new AnalyticsEngineAPI(
                "testAccountId",
                "testApiToken",
            ),
            cloudflare: {
                env: {
                    CF_BEARER_TOKEN: "fake",
                    CF_ACCOUNT_ID: "fake",
                    CF_PASSWORD_HASH: "$2b$12$test.hash.value",
                    CF_JWT_SECRET: "test-secret",
                },
                // eslint-disable-next-line
                cf: {} as any,
            },
        },
    };
}
