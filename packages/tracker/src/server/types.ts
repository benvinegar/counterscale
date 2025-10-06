import type { BaseClientConfig } from "../shared/types";

export type ServerClientOpts = BaseClientConfig & {
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
