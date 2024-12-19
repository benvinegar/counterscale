import { onRequest as __collect_ts_onRequest } from "/Users/benvinegar/Projects/counterscale/functions/collect.ts"
import { onRequest as ____page___ts_onRequest } from "/Users/benvinegar/Projects/counterscale/functions/[[page]].ts"

export const routes = [
    {
      routePath: "/collect",
      mountPath: "/",
      method: "",
      middlewares: [],
      modules: [__collect_ts_onRequest],
    },
  {
      routePath: "/:page*",
      mountPath: "/",
      method: "",
      middlewares: [],
      modules: [____page___ts_onRequest],
    },
  ]