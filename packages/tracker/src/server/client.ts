import type { ServerClientOpts } from "./types";

export class ServerClient {
    siteId: string;
    reporterUrl: string;
    reportOnLocalhost = false;
    userAgent?: string;
    timeout = 1000;

    constructor(opts: ServerClientOpts) {
        this.siteId = opts.siteId;
        this.reporterUrl = opts.reporterUrl;

        if (opts.reportOnLocalhost) {
            this.reportOnLocalhost = opts.reportOnLocalhost;
        }

        if (opts.userAgent) {
            this.userAgent = opts.userAgent;
        }

        if (opts.timeout !== undefined) {
            this.timeout = opts.timeout;
        }
    }

    cleanup() {
        // No-op for server client - no event listeners or timers to clean up
    }
}
