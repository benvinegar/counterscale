import { autoTrackPageviews } from "./track";

export type ClientOpts = {
    siteId: string;
    reportOnLocalhost?: boolean;
    reporterUrl: string;
    autoTrackPageviews?: boolean;
};

export class Client {
    siteId: string;
    reporterUrl: string;
    reportOnLocalhost = false;

    _cleanupAutoTrackPageviews?: () => void;

    constructor(opts: ClientOpts) {
        this.siteId = opts.siteId;
        this.reporterUrl = opts.reporterUrl;

        if (opts.reportOnLocalhost) {
          this.reportOnLocalhost = opts.reportOnLocalhost;
        }

        // default to true
        if (opts.autoTrackPageviews === undefined || opts.autoTrackPageviews) {
            // Use setTimeout to ensure this runs after the constructor
            // This helps with testing and avoids issues with async trackPageview
            setTimeout(() => {
                this._cleanupAutoTrackPageviews = autoTrackPageviews(this);
            }, 0);
        }
    }

    cleanup() {
        if (this._cleanupAutoTrackPageviews) {
            this._cleanupAutoTrackPageviews();
        }
    }
}
