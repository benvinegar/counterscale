/*

This is a fork of Fathom Lite's tracker.js that removes any code that accesses/stores
data in cookies.

See: https://github.com/usefathom/fathom/blob/master/assets/src/js/tracker.js

---

MIT License

Copyright (c) Conva Ventures Inc

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

*/

"use strict";

const queue = (window.counterscale && window.counterscale.q) || [];

type ConfigType = {
    siteId?: string;
    reporterUrl?: string;
};

const config: ConfigType = {};

const commands = {
    set: set,
    trackPageview: trackPageview, // backwards compat
    setTrackerUrl: setTrackerUrl, // backwards compat
};

function set<K extends keyof ConfigType>(key: K, value: ConfigType[K]) {
    config[key] = value;
}

function setTrackerUrl(value: string) {
    return set("reporterUrl", value);
}

// convert object to query string
function stringifyObject(obj: { [key: string]: string }) {
    const keys = Object.keys(obj);

    return (
        "?" +
        keys
            .map(function (k) {
                return encodeURIComponent(k) + "=" + encodeURIComponent(obj[k]);
            })
            .join("&")
    );
}

function findReporterScript() {
    const el = document.getElementById(
        "counterscale-script",
    ) as HTMLScriptElement;
    return el;
}

function trackPageview(vars: { [key: string]: string }) {
    vars = vars || {};

    // ignore prerendered pages
    if (
        "visibilityState" in document &&
        (document.visibilityState as string) === "prerender"
    ) {
        return;
    }

    // if <body> did not load yet, try again at dom ready event
    if (document.body === null) {
        document.addEventListener("DOMContentLoaded", () => {
            trackPageview(vars);
        });
        return;
    }

    //  parse request, use canonical if there is one
    let req = window.location;

    // do not track if not served over HTTP or HTTPS (eg from local filesystem) and we're not in an Electron app
    if (req.host === "" && navigator.userAgent.indexOf("Electron") < 0) {
        return;
    }

    // find canonical URL
    const canonical = document.querySelector(
        'link[rel="canonical"][href]',
    ) as HTMLLinkElement;
    if (canonical) {
        const a = document.createElement("a");
        a.href = canonical.href;

        // use parsed canonical as location object

        // @ts-expect-error TBH typescript may have a point here and not sure if this works - BV
        req = a;
    }

    let path = vars.path || req.pathname + req.search;
    if (!path) {
        path = "/";
    }
    // strip query string from path
    path = path.split("?")[0];

    // determine hostname
    const hostname = vars.hostname || req.protocol + "//" + req.hostname;

    // only set referrer if not internal
    let referrer = vars.referrer || "";
    if (document.referrer.indexOf(hostname) < 0) {
        referrer = document.referrer;
    }
    // strip query string from referrer
    referrer = referrer.split("?")[0];

    const script = findReporterScript();

    const d = {
        p: path,
        h: hostname,
        r: referrer,
        sid: config.siteId !== undefined ? config.siteId : "", // Ensure sid is always a string
    };

    const url =
        config.reporterUrl ||
        (script ? script.src.replace("tracker.js", "collect") : "");

    const img = document.createElement("img");
    img.setAttribute("alt", "");
    img.setAttribute("aria-hidden", "true");
    img.setAttribute("style", "position:absolute");
    img.src = url + stringifyObject(d);
    img.addEventListener("load", function () {
        // remove tracking img from DOM
        document.body.removeChild(img);
    });

    // in case img.onload never fires, remove img after 1s & reset src attribute to cancel request
    window.setTimeout(() => {
        if (!img.parentNode) {
            return;
        }

        img.src = "";
        document.body.removeChild(img);
    }, 1000);

    // add to DOM to fire request
    document.body.appendChild(img);
}

// override global counterscale object
const counterscale = (window.counterscale = function (...args: Command) {
    const cmd = args[0];
    const commandFn = commands[cmd];

    if (typeof commandFn === "function") {
        /* @ts-expect-error really just can't figure out how to type this call */
        commandFn.apply(this, args.slice(1));
    }
});

// process existing queue

type CommandName = keyof typeof commands;
type CommandArgs = string[];
type Command = [CommandName, ...CommandArgs];

queue.forEach(function (cmd: Command) {
    counterscale.apply(window, cmd);
});

(() => {
    const script = findReporterScript();

    // new api; auto report pageview
    const siteId = script.getAttribute("data-site-id");
    if (siteId) {
        set("siteId", siteId);
        trackPageview({});
    }
})();
