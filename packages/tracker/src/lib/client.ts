import { autoTrackPageviews } from "./track";

export type ClientOpts = {
    siteId: string;
    reporterUrl: string;
    autoTrackPageviews?: boolean;
};

export class Client {
    siteId: string;
    reporterUrl: string;

    constructor(opts: ClientOpts) {
        this.siteId = opts.siteId;
        this.reporterUrl = opts.reporterUrl;

        if (opts.autoTrackPageviews) {
            autoTrackPageviews(this);
        }
    }
}
