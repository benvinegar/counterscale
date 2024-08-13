import { AnalyticsEngineAPI } from "../../analytics/query";

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
                },
                cf: {} as any,
            },
        },
    };
}
