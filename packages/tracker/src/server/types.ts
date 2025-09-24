export type ServerClientOpts = {
    siteId: string;
    reporterUrl: string;
    reportOnLocalhost?: boolean;
    userAgent?: string;
    timeout?: number;
};

export type ServerTrackPageviewOpts = {
    url: string;
    referrer?: string;
    hostname?: string;
    userAgent?: string;
    ip?: string;
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
    utmTerm?: string;
    utmContent?: string;
};
