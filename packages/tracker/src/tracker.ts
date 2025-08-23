"use strict";

import * as Counterscale from "./index";

function findReporterScript() {
    const el = document.getElementById(
        "counterscale-script",
    ) as HTMLScriptElement;
    return el;
}

function getLegacySiteId(): string | undefined {
    // backwards compatibility layer with legacy API for setting
    // site id using inline script + global variables
    type CommandName = "set" | "trackPageview";
    type CommandArgs = string[];
    type Command = [CommandName, ...CommandArgs];

    let siteId = undefined;
    const queue = (window.counterscale && window.counterscale.q) || [];
    queue.forEach(function (cmd: Command) {
        // only interested in grabbing siteId
        if (cmd[0] === "set" && cmd[1] === "siteId") {
            siteId = cmd[2];
        }
    });

    return siteId;
}

function init() {
    const script = findReporterScript();
    const siteId = script?.getAttribute("data-site-id") || getLegacySiteId();
    const reportOnLocalhost = script?.hasAttribute("data-report-localhost") || true;

    const reporterUrl = script?.src.replace("tracker.js", "collect");

    if (!siteId || !reporterUrl) {
        return;
    }

    Counterscale.init({
        siteId,
        reportOnLocalhost,
        reporterUrl,
        autoTrackPageviews: true,
    });
}

(function () {
    // body (and thus, script elem) might not be accessible until
    // DOMContentLoaded, so wait for that first
    if (document.body === null) {
        document.addEventListener("DOMContentLoaded", () => {
            init();
        });
        return;
    }

    init();
})();
