type CollectRequestParams = {
    p: string; // path
    h: string; // host
    r: string; // referrer
    sid: string; // siteId
};

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

export function makeRequest(url: string, params: CollectRequestParams) {
    const img = document.createElement("img");
    img.setAttribute("alt", "");
    img.setAttribute("aria-hidden", "true");
    img.setAttribute("style", "position:absolute");
    img.src = url + stringifyObject(params);
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
