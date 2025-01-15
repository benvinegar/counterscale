type CollectRequestParams = {
    p: string; // path
    h: string; // host
    r: string; // referrer
    sid: string; // siteId
};

const REQUEST_TIMEOUT = 1000;

function queryParamStringify(obj: { [key: string]: string }) {
    return (
        "?" +
        Object.keys(obj)
            .map(function (k) {
                return encodeURIComponent(k) + "=" + encodeURIComponent(obj[k]);
            })
            .join("&")
    );
}

export function makeRequest(url: string, params: CollectRequestParams) {
    const xhr = new XMLHttpRequest();
    const fullUrl = url + queryParamStringify(params);

    xhr.open("GET", fullUrl, true);
    xhr.setRequestHeader("Content-Type", "text/plain");
    xhr.timeout = REQUEST_TIMEOUT;
    xhr.send();
}
