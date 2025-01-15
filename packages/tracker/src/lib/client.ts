import { autoTrackPageviews } from "./track";

export type ClientOpts = {
    siteId: string;
    reporterUrl: string;
    autoTrackPageviews?: boolean;
};

export class Client {
    siteId: string;
    reporterUrl: string;

    _cleanupAutoTrackPageviews?: () => void;

    constructor(opts: ClientOpts) {
        this.siteId = opts.siteId;
        this.reporterUrl = opts.reporterUrl;

        // default to true
        if (opts.autoTrackPageviews === undefined || opts.autoTrackPageviews) {
            this._cleanupAutoTrackPageviews = autoTrackPageviews(this);
        }
    }

    cleanup() {
        if (this._cleanupAutoTrackPageviews) {
            this._cleanupAutoTrackPageviews();
        }
    }
}
