type ClientOpts = {
    siteId: string;
    reporterUrl: string;
};

export class Client {
    siteId: string;
    reporterUrl: string;

    constructor(opts: ClientOpts) {
        this.siteId = opts.siteId;
        this.reporterUrl = opts.reporterUrl;
    }
}
