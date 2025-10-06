export type CollectRequestParams = {
    p: string; // path
    h: string; // host
    r: string; // referrer
    sid: string; // siteId
    ht?: string; // hit type
    [key: string]: string | undefined; // Allow additional string properties
} & UtmParams;

export type UtmParams = {
    us?: string; // utm_source
    um?: string; // utm_medium
    uc?: string; // utm_campaign
    ut?: string; // utm_term
    uco?: string; // utm_content
};

export type HostnameAndPath = {
    hostname: string;
    path: string;
};

export type BaseClientConfig = {
    siteId: string;
    reporterUrl: string;
    reportOnLocalhost?: boolean;
};

export type CacheResponse = {
    ht: number; // Number of hits in the current session (hit type)
};
