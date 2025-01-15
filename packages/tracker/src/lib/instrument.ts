export function instrumentHistoryBuiltIns(callback: () => void) {
    const origPushState = history.pushState;

    // NOTE: Intentionally only declaring 2 parameters for this pushState wrapper,
    //       because that is the arity of the built-in function we're overwriting.

    // See: https://blog.sentry.io/wrap-javascript-functions/#preserve-arity

    // eslint-disable-next-line
    history.pushState = function (data, title /*, url */) {
        // eslint-disable-next-line
        origPushState.apply(this, arguments as any);
        callback();
    };

    const listener = () => {
        callback();
    };
    addEventListener("popstate", listener);

    return () => {
        history.pushState = origPushState;
        removeEventListener("popstate", listener);
    };
}
