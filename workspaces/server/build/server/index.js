import { jsx, jsxs } from "react/jsx-runtime";
import { RemixServer, useLoaderData, Outlet, Meta, Links, ScrollRestoration, Scripts, useFetcher, useSearchParams, useNavigation, useRouteError, isRouteErrorResponse } from "@remix-run/react";
import { isbot } from "isbot";
import { renderToReadableStream } from "react-dom/server";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import * as React from "react";
import { useMemo, useEffect, useState } from "react";
import { ResponsiveContainer, ComposedChart, CartesianGrid, XAxis, YAxis, Tooltip, Area, Line } from "recharts";
import { ArrowLeft, ArrowRight, ChevronDown, ChevronUp, Check } from "lucide-react";
import { redirect } from "@remix-run/cloudflare";
import * as SelectPrimitive from "@radix-ui/react-select";
import { UAParser } from "ua-parser-js";
import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
async function handleRequest(request, responseStatusCode, responseHeaders, remixContext, loadContext) {
  const body = await renderToReadableStream(
    /* @__PURE__ */ jsx(RemixServer, { context: remixContext, url: request.url }),
    {
      signal: request.signal,
      onError(error) {
        console.error(error);
        responseStatusCode = 500;
      }
    }
  );
  if (isbot(request.headers.get("user-agent"))) {
    await body.allReady;
  }
  responseHeaders.set("Content-Type", "text/html");
  return new Response(body, {
    headers: responseHeaders,
    status: responseStatusCode
  });
}
const entryServer = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: handleRequest
}, Symbol.toStringTag, { value: "Module" }));
const styles = "/assets/globals-BhCzlPcY.css";
const links = () => [{ rel: "stylesheet", href: styles }];
const loader$a = ({ context, request }) => {
  var _a, _b;
  const url = new URL(request.url);
  return {
    version: (_b = (_a = context.cloudflare) == null ? void 0 : _a.env) == null ? void 0 : _b.CF_PAGES_COMMIT_SHA,
    origin: url.origin,
    url: request.url
  };
};
const Layout = ({ children = [] }) => {
  const data = useLoaderData() ?? {
    version: "unknown",
    origin: "counterscale.dev",
    url: "https://counterscale.dev/"
  };
  return /* @__PURE__ */ jsxs("html", { lang: "en", children: [
    /* @__PURE__ */ jsxs("head", { children: [
      /* @__PURE__ */ jsx("meta", { charSet: "utf-8" }),
      /* @__PURE__ */ jsx(
        "meta",
        {
          name: "viewport",
          content: "width=device-width, initial-scale=1"
        }
      ),
      /* @__PURE__ */ jsx("link", { rel: "icon", type: "image/x-icon", href: "/favicon.png" }),
      /* @__PURE__ */ jsx("meta", { property: "og:url", content: data.url }),
      /* @__PURE__ */ jsx("meta", { property: "og:type", content: "website" }),
      /* @__PURE__ */ jsx("meta", { property: "og:title", content: "Counterscale" }),
      /* @__PURE__ */ jsx(
        "meta",
        {
          property: "og:description",
          content: "Scalable web analytics you run yourself on Cloudflare"
        }
      ),
      /* @__PURE__ */ jsx(
        "meta",
        {
          property: "og:image",
          content: data.origin + "/counterscale-og-large.webp"
        }
      ),
      /* @__PURE__ */ jsx("meta", { name: "twitter:card", content: "summary_large_image" }),
      /* @__PURE__ */ jsx("meta", { property: "twitter:domain", content: "counterscale.dev" }),
      /* @__PURE__ */ jsx("meta", { property: "twitter:url", content: data.url }),
      /* @__PURE__ */ jsx("meta", { name: "twitter:title", content: "Counterscale" }),
      /* @__PURE__ */ jsx(
        "meta",
        {
          name: "twitter:description",
          content: "Scalable web analytics you run yourself on Cloudflare"
        }
      ),
      /* @__PURE__ */ jsx(
        "meta",
        {
          name: "twitter:image",
          content: data.origin + "/counterscale-og-large.webp"
        }
      ),
      /* @__PURE__ */ jsx(Meta, {}),
      /* @__PURE__ */ jsx(Links, {})
    ] }),
    /* @__PURE__ */ jsxs("body", { children: [
      /* @__PURE__ */ jsx("div", { className: "container mx-auto pl-2 pr-2 sm:pl-8 sm:pr-8", children }),
      /* @__PURE__ */ jsx(ScrollRestoration, {}),
      /* @__PURE__ */ jsx(Scripts, {}),
      /* @__PURE__ */ jsx(
        "script",
        {
          dangerouslySetInnerHTML: {
            __html: "window.counterscale = {'q': [['set', 'siteId', 'counterscale-dev'], ['trackPageview']] };"
          }
        }
      ),
      /* @__PURE__ */ jsx("script", { id: "counterscale-script", src: "/tracker.js" })
    ] })
  ] });
};
function App() {
  var _a;
  const data = useLoaderData();
  return /* @__PURE__ */ jsxs("div", { className: "mt-0 sm:mt-4", children: [
    /* @__PURE__ */ jsx("header", { className: "border-b-2 mb-8 py-2", children: /* @__PURE__ */ jsxs("nav", { className: "flex justify-between items-center", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center", children: [
        /* @__PURE__ */ jsx("a", { href: "/", className: "text-lg font-bold", children: "Counterscale" }),
        /* @__PURE__ */ jsx(
          "img",
          {
            className: "w-6 ml-1",
            src: "/img/arrow.svg",
            alt: "Counterscale Icon"
          }
        )
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex items-center font-small font-medium text-md", children: [
        /* @__PURE__ */ jsx("a", { href: "/dashboard", children: "Dashboard" }),
        /* @__PURE__ */ jsx(
          "a",
          {
            href: "/admin-redirect",
            target: "_blank",
            className: "hidden sm:inline-block ml-2",
            children: "Admin"
          }
        ),
        /* @__PURE__ */ jsx(
          "a",
          {
            href: "https://github.com/benvinegar/counterscale",
            className: "w-6 ml-2",
            children: /* @__PURE__ */ jsx(
              "img",
              {
                src: "/github-mark.svg",
                alt: "GitHub Logo",
                style: {
                  filter: "invert(21%) sepia(27%) saturate(271%) hue-rotate(113deg) brightness(97%) contrast(97%)"
                }
              }
            )
          }
        )
      ] })
    ] }) }),
    /* @__PURE__ */ jsx("main", { role: "main", className: "w-full", children: /* @__PURE__ */ jsx(Outlet, {}) }),
    /* @__PURE__ */ jsx("footer", { className: "py-4 flex justify-end text-s", children: /* @__PURE__ */ jsxs("div", { children: [
      "Version",
      " ",
      /* @__PURE__ */ jsx(
        "a",
        {
          href: `https://github.com/benvinegar/counterscale/commit/${data.version}`,
          children: (_a = data.version) == null ? void 0 : _a.slice(0, 7)
        }
      )
    ] }) })
  ] });
}
const route0 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  Layout,
  default: App,
  links,
  loader: loader$a
}, Symbol.toStringTag, { value: "Module" }));
dayjs.extend(utc);
dayjs.extend(timezone);
function cn(...inputs) {
  return twMerge(clsx(inputs));
}
function paramsFromUrl(url) {
  const searchParams = new URL(url).searchParams;
  const params = {};
  searchParams.forEach((value, key) => {
    params[key] = value;
  });
  return params;
}
function getFiltersFromSearchParams(searchParams) {
  const filters = {};
  if (searchParams.has("path")) {
    filters.path = searchParams.get("path") || "";
  }
  if (searchParams.has("referrer")) {
    filters.referrer = searchParams.get("referrer") || "";
  }
  if (searchParams.has("deviceModel")) {
    filters.deviceModel = searchParams.get("deviceModel") || "";
  }
  if (searchParams.has("country")) {
    filters.country = searchParams.get("country") || "";
  }
  if (searchParams.has("browserName")) {
    filters.browserName = searchParams.get("browserName") || "";
  }
  return filters;
}
function getUserTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch (e) {
    return "UTC";
  }
}
function getIntervalType(interval) {
  switch (interval) {
    case "today":
    case "yesterday":
    case "1d":
      return "HOUR";
    case "7d":
    case "30d":
    case "90d":
      return "DAY";
    default:
      return "DAY";
  }
}
function getDateTimeRange(interval, tz) {
  let localDateTime = dayjs().utc();
  let localEndDateTime;
  if (interval === "today") {
    localDateTime = localDateTime.tz(tz).startOf("day");
  } else if (interval === "yesterday") {
    localDateTime = localDateTime.tz(tz).startOf("day").subtract(1, "day");
    localEndDateTime = localDateTime.endOf("day").add(2, "ms");
  } else {
    const daysAgo = Number(interval.split("d")[0]);
    const intervalType = getIntervalType(interval);
    if (intervalType === "DAY") {
      localDateTime = localDateTime.subtract(daysAgo, "day").tz(tz).startOf("day");
    } else if (intervalType === "HOUR") {
      localDateTime = localDateTime.subtract(daysAgo, "day").startOf("hour");
    }
  }
  if (!localEndDateTime) {
    localEndDateTime = dayjs().utc().tz(tz);
  }
  return {
    startDate: localDateTime.toDate(),
    endDate: localEndDateTime.toDate()
  };
}
const Card = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(
  "div",
  {
    ref,
    className: cn(
      "rounded-lg border border-2 bg-card text-card-foreground shadow-lg",
      className
    ),
    ...props
  }
));
Card.displayName = "Card";
const CardHeader = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(
  "div",
  {
    ref,
    className: cn("flex flex-col space-y-1.5 p-6", className),
    ...props
  }
));
CardHeader.displayName = "CardHeader";
const CardTitle = React.forwardRef(({ className, ...props }, ref) => (
  /* eslint jsx-a11y/heading-has-content: 0 */
  /* @__PURE__ */ jsx(
    "h3",
    {
      ref,
      className: cn(
        "text-2xl font-semibold leading-none tracking-tight",
        className
      ),
      ...props
    }
  )
));
CardTitle.displayName = "CardTitle";
const CardDescription = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(
  "p",
  {
    ref,
    className: cn("text-sm text-muted-foreground", className),
    ...props
  }
));
CardDescription.displayName = "CardDescription";
const CardContent = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx("div", { ref, className: cn("p-6 pt-0", className), ...props }));
CardContent.displayName = "CardContent";
const CardFooter = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(
  "div",
  {
    ref,
    className: cn("flex items-center p-6 pt-0", className),
    ...props
  }
));
CardFooter.displayName = "CardFooter";
function dateStringToLocalDateObj(dateString) {
  const date = new Date(dateString);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date;
}
function CustomTooltip(props) {
  const { active, payload, label } = props;
  const date = dateStringToLocalDateObj(label);
  const formattedDate = date.toLocaleString("en-us", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    timeZoneName: "short"
  });
  if (active && payload && payload.length) {
    return /* @__PURE__ */ jsxs(Card, { className: "p-2 shadow-lg leading-normal", children: [
      /* @__PURE__ */ jsx("div", { className: "font-semibold", children: formattedDate }),
      /* @__PURE__ */ jsxs("div", { className: "before:content-['•'] before:text-border before:font-bold", children: [
        " ",
        `${payload[1].value} visitors`
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "before:content-['•'] before:text-barchart before:font-bold", children: [
        " ",
        `${payload[0].value} views`
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "before:content-['•'] before:text-paldarkgrey before:font-bold", children: [
        " ",
        `${payload[2].value}% bounce rate`
      ] })
    ] });
  } else {
    return null;
  }
}
function TimeSeriesChart({
  data,
  intervalType
}) {
  function xAxisDateFormatter(date) {
    const dateObj = dateStringToLocalDateObj(date);
    switch (intervalType) {
      case "DAY":
        return dateObj.toLocaleDateString("en-us", {
          weekday: "short",
          month: "short",
          day: "numeric"
        });
      case "HOUR":
        return dateObj.toLocaleTimeString("en-us", {
          hour: "numeric",
          minute: "numeric"
        });
      default:
        throw new Error("Invalid interval type");
    }
  }
  const yAxisCountTicks = useMemo(() => {
    const MAX_TICKS_TO_SHOW = 4;
    const maxViews = Math.max(...data.map((item) => item.views));
    const magnitude = Math.floor(Math.log10(maxViews));
    const roundTo = Math.pow(10, Math.max(0, magnitude - 1));
    const numTicks = Math.min(MAX_TICKS_TO_SHOW, maxViews);
    const ticks = [];
    let increment = Math.floor(maxViews / numTicks);
    increment = Math.ceil(increment / roundTo) * roundTo;
    for (let i = 1; i <= numTicks + 1; i++) {
      const tick = i * increment;
      ticks.push(tick);
    }
    return ticks;
  }, [data]);
  const xAxisTicks = useMemo(
    () => data.slice(1, -1).map((entry2) => entry2.date),
    [data]
  );
  if (data.length === 0) {
    return null;
  }
  return /* @__PURE__ */ jsx(ResponsiveContainer, { width: "100%", height: "100%", minWidth: 100, children: /* @__PURE__ */ jsxs(
    ComposedChart,
    {
      width: 500,
      height: 400,
      data,
      margin: {
        top: 10,
        right: 30,
        left: 0,
        bottom: 0
      },
      children: [
        /* @__PURE__ */ jsx(CartesianGrid, { strokeDasharray: "3 3" }),
        /* @__PURE__ */ jsx(
          XAxis,
          {
            dataKey: "date",
            tickMargin: 8,
            ticks: xAxisTicks,
            tickFormatter: xAxisDateFormatter,
            tick: { fill: "grey", fontSize: 14 }
          }
        ),
        /* @__PURE__ */ jsx(
          YAxis,
          {
            yAxisId: "count",
            dataKey: "views",
            domain: [0, Math.max(...yAxisCountTicks)],
            tickLine: false,
            tickMargin: 5,
            ticks: yAxisCountTicks,
            tick: { fill: "grey", fontSize: 14 }
          }
        ),
        /* @__PURE__ */ jsx(
          YAxis,
          {
            yAxisId: "bounceRate",
            dataKey: "bounceRate",
            domain: [0, 120],
            hide: true
          }
        ),
        /* @__PURE__ */ jsx(Tooltip, { content: /* @__PURE__ */ jsx(CustomTooltip, {}) }),
        /* @__PURE__ */ jsx(
          Area,
          {
            yAxisId: "count",
            dataKey: "views",
            stroke: "#F46A3D",
            strokeWidth: "2",
            fill: "#F99C35"
          }
        ),
        /* @__PURE__ */ jsx(
          Area,
          {
            yAxisId: "count",
            dataKey: "visitors",
            stroke: "#F46A3D",
            strokeWidth: "2",
            fill: "#f96d3e"
          }
        ),
        /* @__PURE__ */ jsx(
          Line,
          {
            yAxisId: "bounceRate",
            dataKey: "bounceRate",
            stroke: "#56726C",
            strokeWidth: "2",
            dot: false
          }
        )
      ]
    }
  ) });
}
async function loader$9({ context, request }) {
  const { analyticsEngine } = context;
  const { interval, site } = paramsFromUrl(request.url);
  const url = new URL(request.url);
  const tz = url.searchParams.get("timezone") || "UTC";
  const filters = getFiltersFromSearchParams(url.searchParams);
  const intervalType = getIntervalType(interval);
  const { startDate, endDate } = getDateTimeRange(interval, tz);
  const viewsGroupedByInterval = await analyticsEngine.getViewsGroupedByInterval(
    site,
    intervalType,
    startDate,
    endDate,
    tz,
    filters
  );
  const chartData = [];
  viewsGroupedByInterval.forEach((row) => {
    const { views, visitors, bounces } = row[1];
    chartData.push({
      date: row[0],
      views,
      visitors,
      bounceRate: Math.floor(
        (visitors > 0 ? bounces / visitors : 0) * 100
      )
    });
  });
  return {
    chartData,
    intervalType
  };
}
const TimeSeriesCard = ({
  siteId,
  interval,
  filters,
  timezone: timezone2
}) => {
  const dataFetcher = useFetcher();
  const { chartData, intervalType } = dataFetcher.data || {};
  useEffect(() => {
    const params = {
      site: siteId,
      interval,
      timezone: timezone2,
      ...filters
    };
    dataFetcher.submit(params, {
      method: "get",
      action: `/resources/timeseries`
    });
  }, [siteId, interval, filters, timezone2]);
  return /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsx(CardContent, { children: /* @__PURE__ */ jsx("div", { className: "h-72 pt-6 -m-4 -mr-10 -ml-10 sm:-m-2 sm:-ml-6 sm:-mr-6", children: chartData && /* @__PURE__ */ jsx(
    TimeSeriesChart,
    {
      data: chartData,
      intervalType
    }
  ) }) }) });
};
const route1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  TimeSeriesCard,
  loader: loader$9
}, Symbol.toStringTag, { value: "Module" }));
const Table = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx("div", { className: "relative w-full overflow-auto", children: /* @__PURE__ */ jsx(
  "div",
  {
    ref,
    className: cn("w-full caption-bottom text-sm", className),
    ...props
  }
) }));
Table.displayName = "Table";
const TableHeader = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(
  "div",
  {
    ref,
    className: cn("[&_tr]:border-b grid", className),
    ...props
  }
));
TableHeader.displayName = "TableHeader";
const TableBody = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(
  "div",
  {
    ref,
    className: cn("[&_tr:last-child]:border-0", className),
    ...props
  }
));
TableBody.displayName = "TableBody";
const TableFooter = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(
  "div",
  {
    ref,
    className: cn(
      "border-t bg-muted/50 font-medium [&>tr]:last:border-b-0",
      className
    ),
    ...props
  }
));
TableFooter.displayName = "TableFooter";
const TableRow = React.forwardRef(({ className, ...props }, ref) => {
  const { width } = props;
  return /* @__PURE__ */ jsx(
    "div",
    {
      ref,
      className: cn(
        `grid border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted`,
        className
      ),
      style: width !== void 0 ? {
        background: `linear-gradient(90deg, hsl(var(--barchart)) ${width}, transparent ${width})`
      } : {},
      ...props
    }
  );
});
TableRow.displayName = "TableRow";
const TableHead = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(
  "div",
  {
    ref,
    className: cn(
      "p-3 text-left align-middle font-medium [&:has([role=checkbox])]:pr-0",
      className
    ),
    ...props
  }
));
TableHead.displayName = "TableHead";
const TableCell = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(
  "div",
  {
    ref,
    className: cn(
      "p-3 align-middle [&:has([role=checkbox])]:pr-0",
      className
    ),
    ...props
  }
));
TableCell.displayName = "TableCell";
const TableCaption = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(
  "caption",
  {
    ref,
    className: cn("mt-4 text-sm text-muted-foreground", className),
    ...props
  }
));
TableCaption.displayName = "TableCaption";
function calculateCountPercentages(countByProperty) {
  const totalCount = countByProperty.reduce(
    (sum, row) => sum + parseInt(row[1]),
    0
  );
  return countByProperty.map((row) => {
    const count = parseInt(row[1]);
    const percentage = (count / totalCount * 100).toFixed(2);
    return `${percentage}%`;
  });
}
function TableCard({
  countByProperty,
  columnHeaders,
  onClick
}) {
  const barChartPercentages = calculateCountPercentages(countByProperty);
  const countFormatter = Intl.NumberFormat("en", { notation: "compact" });
  const gridCols = (columnHeaders || []).length === 3 ? "grid-cols-[minmax(0,1fr),minmax(0,8ch),minmax(0,8ch)]" : "grid-cols-[minmax(0,1fr),minmax(0,8ch)]";
  return /* @__PURE__ */ jsxs(Table, { children: [
    /* @__PURE__ */ jsx(TableHeader, { children: /* @__PURE__ */ jsx(TableRow, { className: `${gridCols}`, children: (columnHeaders || []).map((header, index) => /* @__PURE__ */ jsx(
      TableHead,
      {
        className: index === 0 ? "text-left" : "text-right pr-4 pl-0",
        children: header
      },
      header
    )) }) }),
    /* @__PURE__ */ jsx(TableBody, { children: (countByProperty || []).map((item, index) => {
      const desc = item[0];
      const [key, label] = Array.isArray(desc) ? [desc[0], desc[1] || "(none)"] : [desc, desc || "(none)"];
      return /* @__PURE__ */ jsxs(
        TableRow,
        {
          className: `group [&_td]:last:rounded-b-md ${gridCols}`,
          width: barChartPercentages[index],
          children: [
            /* @__PURE__ */ jsx(TableCell, { className: "font-medium min-w-48 break-all", children: onClick ? /* @__PURE__ */ jsx(
              "button",
              {
                onClick: () => onClick(key),
                className: "hover:underline select-text text-left",
                children: label
              }
            ) : label }),
            /* @__PURE__ */ jsx(TableCell, { className: "text-right min-w-16", children: countFormatter.format(parseInt(item[1], 10)) }),
            item.length > 2 && item[2] !== void 0 && /* @__PURE__ */ jsx(TableCell, { className: "text-right min-w-16", children: countFormatter.format(
              parseInt(item[2], 10)
            ) })
          ]
        },
        item[0]
      );
    }) })
  ] });
}
const PaginationButtons = ({
  page,
  hasMore,
  handlePagination
}) => {
  return /* @__PURE__ */ jsxs("div", { className: "p-2 pr-0 grid grid-cols-[auto,2rem,2rem] text-right", children: [
    /* @__PURE__ */ jsx("div", {}),
    /* @__PURE__ */ jsx(
      "button",
      {
        onClick: () => {
          if (page > 1) handlePagination(page - 1);
        },
        className: page > 1 ? `text-primary hover:cursor-pointer` : `text-orange-300`,
        children: /* @__PURE__ */ jsx(ArrowLeft, {})
      }
    ),
    /* @__PURE__ */ jsx(
      "button",
      {
        onClick: () => {
          if (hasMore) handlePagination(page + 1);
        },
        className: hasMore ? "text-primary hover:cursor-pointer" : "text-orange-300",
        children: /* @__PURE__ */ jsx(ArrowRight, {})
      }
    )
  ] });
};
const PaginatedTableCard = ({
  siteId,
  interval,
  dataFetcher,
  columnHeaders,
  filters,
  loaderUrl,
  onClick,
  timezone: timezone2
}) => {
  var _a;
  const countsByProperty = ((_a = dataFetcher.data) == null ? void 0 : _a.countsByProperty) || [];
  const [page, setPage] = useState(1);
  useEffect(() => {
    const params = {
      site: siteId,
      interval,
      timezone: timezone2,
      ...filters,
      page
    };
    dataFetcher.submit(params, {
      method: "get",
      action: loaderUrl
    });
  }, [loaderUrl, siteId, interval, filters, timezone2, page]);
  function handlePagination(page2) {
    setPage(page2);
  }
  const hasMore = countsByProperty.length === 10;
  return /* @__PURE__ */ jsx(Card, { className: dataFetcher.state === "loading" ? "opacity-60" : "", children: countsByProperty ? /* @__PURE__ */ jsxs("div", { className: "grid grid-rows-[auto,40px] h-full", children: [
    /* @__PURE__ */ jsx(
      TableCard,
      {
        countByProperty: countsByProperty,
        columnHeaders,
        onClick
      }
    ),
    /* @__PURE__ */ jsx(
      PaginationButtons,
      {
        page,
        hasMore,
        handlePagination
      }
    )
  ] }) : null });
};
async function loader$8({ context, request }) {
  const { analyticsEngine } = context;
  const { interval, site, page = 1 } = paramsFromUrl(request.url);
  const url = new URL(request.url);
  const tz = url.searchParams.get("timezone") || "UTC";
  const filters = getFiltersFromSearchParams(url.searchParams);
  return {
    countsByProperty: await analyticsEngine.getCountByReferrer(
      site,
      interval,
      tz,
      filters,
      Number(page)
    ),
    page: Number(page)
  };
}
const ReferrerCard = ({
  siteId,
  interval,
  filters,
  onFilterChange,
  timezone: timezone2
}) => {
  return /* @__PURE__ */ jsx(
    PaginatedTableCard,
    {
      siteId,
      interval,
      columnHeaders: ["Referrer", "Visitors", "Views"],
      dataFetcher: useFetcher(),
      loaderUrl: "/resources/referrer",
      filters,
      onClick: (referrer) => onFilterChange({ ...filters, referrer }),
      timezone: timezone2
    }
  );
};
const route2 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  ReferrerCard,
  loader: loader$8
}, Symbol.toStringTag, { value: "Module" }));
async function loader$7({ context, request }) {
  const { analyticsEngine } = context;
  const { interval, site, page = 1 } = paramsFromUrl(request.url);
  const url = new URL(request.url);
  const tz = url.searchParams.get("timezone") || "UTC";
  const filters = getFiltersFromSearchParams(url.searchParams);
  return {
    countsByProperty: await analyticsEngine.getCountByBrowser(
      site,
      interval,
      tz,
      filters,
      Number(page)
    ),
    page: Number(page)
  };
}
const BrowserCard = ({
  siteId,
  interval,
  filters,
  onFilterChange,
  timezone: timezone2
}) => {
  return /* @__PURE__ */ jsx(
    PaginatedTableCard,
    {
      siteId,
      interval,
      columnHeaders: ["Browser", "Visitors"],
      dataFetcher: useFetcher(),
      loaderUrl: "/resources/browser",
      filters,
      onClick: (browserName) => onFilterChange({ ...filters, browserName }),
      timezone: timezone2
    }
  );
};
const route3 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  BrowserCard,
  loader: loader$7
}, Symbol.toStringTag, { value: "Module" }));
function convertCountryCodesToNames(countByCountry) {
  const regionNames = new Intl.DisplayNames(["en"], { type: "region" });
  return countByCountry.map((countByBrowserRow) => {
    let countryName;
    try {
      countryName = regionNames.of(countByBrowserRow[0]);
    } catch (err) {
      countryName = "(unknown)";
    }
    const count = countByBrowserRow[1];
    return [[countByBrowserRow[0], countryName], count];
  });
}
async function loader$6({ context, request }) {
  const { analyticsEngine } = context;
  const { interval, site, page = 1 } = paramsFromUrl(request.url);
  const url = new URL(request.url);
  const tz = url.searchParams.get("timezone") || "UTC";
  const filters = getFiltersFromSearchParams(url.searchParams);
  const countsByCountry = await analyticsEngine.getCountByCountry(
    site,
    interval,
    tz,
    filters,
    Number(page)
  );
  const countsByProperty = convertCountryCodesToNames(countsByCountry);
  return {
    countsByProperty,
    page: Number(page)
  };
}
const CountryCard = ({
  siteId,
  interval,
  filters,
  onFilterChange,
  timezone: timezone2
}) => {
  return /* @__PURE__ */ jsx(
    PaginatedTableCard,
    {
      siteId,
      interval,
      columnHeaders: ["Country", "Visitors"],
      dataFetcher: useFetcher(),
      loaderUrl: "/resources/country",
      filters,
      onClick: (country) => onFilterChange({ ...filters, country }),
      timezone: timezone2
    }
  );
};
const route4 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  CountryCard,
  loader: loader$6
}, Symbol.toStringTag, { value: "Module" }));
async function loader$5({ context, request }) {
  const { analyticsEngine } = context;
  const { interval, site, page = 1 } = paramsFromUrl(request.url);
  const url = new URL(request.url);
  const tz = url.searchParams.get("timezone") || "UTC";
  const filters = getFiltersFromSearchParams(url.searchParams);
  return {
    countsByProperty: await analyticsEngine.getCountByDevice(
      site,
      interval,
      tz,
      filters,
      Number(page)
    ),
    page: Number(page)
  };
}
const DeviceCard = ({
  siteId,
  interval,
  filters,
  onFilterChange,
  timezone: timezone2
}) => {
  return /* @__PURE__ */ jsx(
    PaginatedTableCard,
    {
      siteId,
      interval,
      columnHeaders: ["Device", "Visitors"],
      dataFetcher: useFetcher(),
      loaderUrl: "/resources/device",
      filters,
      onClick: (deviceModel) => onFilterChange({ ...filters, deviceModel }),
      timezone: timezone2
    }
  );
};
const route5 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  DeviceCard,
  loader: loader$5
}, Symbol.toStringTag, { value: "Module" }));
async function loader$4({ context, request }) {
  const { analyticsEngine } = context;
  const { interval, site, page = 1 } = paramsFromUrl(request.url);
  const url = new URL(request.url);
  const tz = url.searchParams.get("timezone") || "UTC";
  const filters = getFiltersFromSearchParams(url.searchParams);
  return {
    countsByProperty: await analyticsEngine.getCountByPath(
      site,
      interval,
      tz,
      filters,
      Number(page)
    ),
    page: Number(page)
  };
}
const PathsCard = ({
  siteId,
  interval,
  filters,
  onFilterChange,
  timezone: timezone2
}) => {
  return /* @__PURE__ */ jsx(
    PaginatedTableCard,
    {
      siteId,
      interval,
      columnHeaders: ["Path", "Visitors", "Views"],
      dataFetcher: useFetcher(),
      filters,
      loaderUrl: "/resources/paths",
      onClick: (path) => onFilterChange({ ...filters, path }),
      timezone: timezone2
    }
  );
};
const route6 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  PathsCard,
  loader: loader$4
}, Symbol.toStringTag, { value: "Module" }));
async function loader$3({ context, request }) {
  const { analyticsEngine } = context;
  const { interval, site } = paramsFromUrl(request.url);
  const url = new URL(request.url);
  const tz = url.searchParams.get("timezone") || "UTC";
  const filters = getFiltersFromSearchParams(url.searchParams);
  const earliestEvents = analyticsEngine.getEarliestEvents(site);
  const counts = await analyticsEngine.getCounts(site, interval, tz, filters);
  const { earliestEvent, earliestBounce } = await earliestEvents;
  const { startDate } = getDateTimeRange(interval, tz);
  const hasSufficientBounceData = earliestBounce !== null && earliestEvent !== null && (earliestEvent.getTime() == earliestBounce.getTime() || // earliest event recorded a bounce -- any query is fine
  earliestBounce < startDate);
  const bounceRate = counts.visitors > 0 ? counts.bounces / counts.visitors : void 0;
  return {
    views: counts.views,
    visitors: counts.visitors,
    bounceRate,
    hasSufficientBounceData
  };
}
const StatsCard = ({
  siteId,
  interval,
  filters,
  timezone: timezone2
}) => {
  const dataFetcher = useFetcher();
  const { views, visitors, bounceRate, hasSufficientBounceData } = dataFetcher.data || {};
  const countFormatter = Intl.NumberFormat("en", { notation: "compact" });
  useEffect(() => {
    const params = {
      site: siteId,
      interval,
      timezone: timezone2,
      ...filters
    };
    dataFetcher.submit(params, {
      method: "get",
      action: `/resources/stats`
    });
  }, [siteId, interval, filters, timezone2]);
  return /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsx("div", { className: "p-4 pl-6", children: /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-3 gap-10 items-end", children: [
    /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsx("div", { className: "text-md sm:text-lg", children: "Visitors" }),
      /* @__PURE__ */ jsx("div", { className: "text-4xl", children: visitors ? countFormatter.format(visitors) : "-" })
    ] }),
    /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsx("div", { className: "text-md sm:text-lg", children: "Views" }),
      /* @__PURE__ */ jsx("div", { className: "text-4xl", children: views ? countFormatter.format(views) : "-" })
    ] }),
    /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsx("div", { className: "text-md sm:text-lg", children: /* @__PURE__ */ jsxs("span", { children: [
        "Bounce",
        /* @__PURE__ */ jsx("span", { className: "hidden sm:inline", children: " Rate" })
      ] }) }),
      /* @__PURE__ */ jsx("div", { className: "text-4xl", children: hasSufficientBounceData ? bounceRate !== void 0 ? `${Math.round(bounceRate * 100)}%` : "-" : "n/a" })
    ] })
  ] }) }) });
};
const route7 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  StatsCard,
  loader: loader$3
}, Symbol.toStringTag, { value: "Module" }));
const loader$2 = async ({ context }) => {
  return redirect(
    `https://dash.cloudflare.com/${context.cloudflare.env.CF_ACCOUNT_ID}/pages/view/counterscale`
  );
};
const route8 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  loader: loader$2
}, Symbol.toStringTag, { value: "Module" }));
const Select = SelectPrimitive.Root;
const SelectValue = SelectPrimitive.Value;
const SelectTrigger = React.forwardRef(({ className, children, ...props }, ref) => /* @__PURE__ */ jsxs(
  SelectPrimitive.Trigger,
  {
    ref,
    className: cn(
      "flex h-10 w-full items-center justify-between rounded-md border-2 border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
      className
    ),
    ...props,
    children: [
      children,
      /* @__PURE__ */ jsx(SelectPrimitive.Icon, { asChild: true, children: /* @__PURE__ */ jsx(ChevronDown, { className: "h-4 w-4 opacity-50" }) })
    ]
  }
));
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName;
const SelectScrollUpButton = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(
  SelectPrimitive.ScrollUpButton,
  {
    ref,
    className: cn(
      "flex cursor-default items-center justify-center py-1",
      className
    ),
    ...props,
    children: /* @__PURE__ */ jsx(ChevronUp, { className: "h-4 w-4" })
  }
));
SelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName;
const SelectScrollDownButton = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(
  SelectPrimitive.ScrollDownButton,
  {
    ref,
    className: cn(
      "flex cursor-default items-center justify-center py-1",
      className
    ),
    ...props,
    children: /* @__PURE__ */ jsx(ChevronDown, { className: "h-4 w-4" })
  }
));
SelectScrollDownButton.displayName = SelectPrimitive.ScrollDownButton.displayName;
const SelectContent = React.forwardRef(({ className, children, position = "popper", ...props }, ref) => /* @__PURE__ */ jsx(SelectPrimitive.Portal, { children: /* @__PURE__ */ jsxs(
  SelectPrimitive.Content,
  {
    ref,
    className: cn(
      "relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
      position === "popper" && "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
      className
    ),
    position,
    ...props,
    children: [
      /* @__PURE__ */ jsx(SelectScrollUpButton, {}),
      /* @__PURE__ */ jsx(
        SelectPrimitive.Viewport,
        {
          className: cn(
            "p-1",
            position === "popper" && "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]"
          ),
          children
        }
      ),
      /* @__PURE__ */ jsx(SelectScrollDownButton, {})
    ]
  }
) }));
SelectContent.displayName = SelectPrimitive.Content.displayName;
const SelectLabel = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(
  SelectPrimitive.Label,
  {
    ref,
    className: cn("py-1.5 pl-8 pr-2 text-sm font-semibold", className),
    ...props
  }
));
SelectLabel.displayName = SelectPrimitive.Label.displayName;
const SelectItem = React.forwardRef(({ className, children, ...props }, ref) => /* @__PURE__ */ jsxs(
  SelectPrimitive.Item,
  {
    ref,
    className: cn(
      "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    ),
    ...props,
    children: [
      /* @__PURE__ */ jsx("span", { className: "absolute left-2 flex h-3.5 w-3.5 items-center justify-center", children: /* @__PURE__ */ jsx(SelectPrimitive.ItemIndicator, { children: /* @__PURE__ */ jsx(Check, { className: "h-4 w-4" }) }) }),
      /* @__PURE__ */ jsx(SelectPrimitive.ItemText, { children })
    ]
  }
));
SelectItem.displayName = SelectPrimitive.Item.displayName;
const SelectSeparator = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(
  SelectPrimitive.Separator,
  {
    ref,
    className: cn("-mx-1 my-1 h-px bg-muted", className),
    ...props
  }
));
SelectSeparator.displayName = SelectPrimitive.Separator.displayName;
const SearchFilterBadges = ({
  filters = {},
  onFilterDelete
}) => {
  return /* @__PURE__ */ jsx("div", { className: "flex flex-wrap gap-2", children: Object.entries(filters).map(([key, value]) => /* @__PURE__ */ jsxs(
    "div",
    {
      className: "bg-primary text-primary-foreground rounded-full px-2 py-1 text-sm",
      children: [
        key,
        ':"',
        value,
        '"',
        /* @__PURE__ */ jsx(
          "button",
          {
            onClick: () => onFilterDelete(key),
            className: "ml-2 align-middle",
            children: /* @__PURE__ */ jsx(
              "svg",
              {
                width: "15",
                height: "15",
                viewBox: "0 0 15 15",
                fill: "none",
                xmlns: "http://www.w3.org/2000/svg",
                children: /* @__PURE__ */ jsx(
                  "path",
                  {
                    d: "M11.7816 4.03157C12.0062 3.80702 12.0062 3.44295 11.7816 3.2184C11.5571 2.99385 11.193 2.99385 10.9685 3.2184L7.50005 6.68682L4.03164 3.2184C3.80708 2.99385 3.44301 2.99385 3.21846 3.2184C2.99391 3.44295 2.99391 3.80702 3.21846 4.03157L6.68688 7.49999L3.21846 10.9684C2.99391 11.193 2.99391 11.557 3.21846 11.7816C3.44301 12.0061 3.80708 12.0061 4.03164 11.7816L7.50005 8.31316L10.9685 11.7816C11.193 12.0061 11.5571 12.0061 11.7816 11.7816C12.0062 11.557 12.0062 11.193 11.7816 10.9684L8.31322 7.49999L11.7816 4.03157Z",
                    fill: "currentColor",
                    fillRule: "evenodd",
                    clipRule: "evenodd"
                  }
                )
              }
            )
          }
        )
      ]
    },
    key
  )) });
};
const meta$1 = () => {
  return [
    { title: "Counterscale: Web Analytics" },
    { name: "description", content: "Counterscale: Web Analytics" }
  ];
};
const MAX_RETENTION_DAYS = 90;
const loader$1 = async ({ context, request }) => {
  var _a, _b, _c, _d, _e;
  if (!((_b = (_a = context.cloudflare) == null ? void 0 : _a.env) == null ? void 0 : _b.CF_ACCOUNT_ID)) {
    throw new Response("Missing credentials: CF_ACCOUNT_ID is not set.", {
      status: 501
    });
  }
  if (!((_d = (_c = context.cloudflare) == null ? void 0 : _c.env) == null ? void 0 : _d.CF_BEARER_TOKEN)) {
    throw new Response("Missing credentials: CF_BEARER_TOKEN is not set.", {
      status: 501
    });
  }
  const { analyticsEngine } = context;
  const url = new URL(request.url);
  let interval;
  try {
    interval = url.searchParams.get("interval") || "7d";
  } catch (err) {
    interval = "7d";
  }
  if (url.searchParams.has("site") === false) {
    const sitesByHits2 = await analyticsEngine.getSitesOrderedByHits(interval);
    const redirectSite = ((_e = sitesByHits2[0]) == null ? void 0 : _e[0]) || "";
    const redirectUrl = new URL(request.url);
    redirectUrl.searchParams.set("site", redirectSite);
    throw redirect(redirectUrl.toString());
  }
  const siteId = url.searchParams.get("site") || "";
  const actualSiteId = siteId === "@unknown" ? "" : siteId;
  const filters = getFiltersFromSearchParams(url.searchParams);
  const sitesByHits = analyticsEngine.getSitesOrderedByHits(
    `${MAX_RETENTION_DAYS}d`
  );
  const intervalType = getIntervalType(interval);
  let out;
  try {
    out = {
      siteId: actualSiteId,
      sites: (await sitesByHits).map(
        ([site, _]) => site
      ),
      intervalType,
      interval,
      filters
    };
  } catch (err) {
    console.error(err);
    throw new Error("Failed to fetch data from Analytics Engine");
  }
  return out;
};
function Dashboard() {
  const [, setSearchParams] = useSearchParams();
  const data = useLoaderData();
  const navigation = useNavigation();
  const loading = navigation.state === "loading";
  function changeSite(site) {
    setSearchParams({
      site,
      interval: data.interval
    });
  }
  function changeInterval(interval) {
    setSearchParams((prev) => {
      prev.set("interval", interval);
      return prev;
    });
  }
  const handleFilterChange = (filters) => {
    setSearchParams((prev) => {
      for (const key in filters) {
        if (Object.hasOwnProperty.call(filters, key)) {
          prev.set(
            key,
            filters[key]
          );
        }
      }
      return prev;
    });
  };
  const handleFilterDelete = (key) => {
    setSearchParams((prev) => {
      prev.delete(key);
      return prev;
    });
  };
  const userTimezone = getUserTimezone();
  return /* @__PURE__ */ jsxs("div", { style: { fontFamily: "system-ui, sans-serif", lineHeight: "1.8" }, children: [
    /* @__PURE__ */ jsxs("div", { className: "w-full mb-4 flex gap-4 flex-wrap", children: [
      /* @__PURE__ */ jsx("div", { className: "lg:basis-1/5-gap-4 sm:basis-1/4-gap-4 basis-1/2-gap-4", children: /* @__PURE__ */ jsxs(
        Select,
        {
          defaultValue: data.siteId,
          onValueChange: (site) => changeSite(site),
          children: [
            /* @__PURE__ */ jsx(SelectTrigger, { children: /* @__PURE__ */ jsx(SelectValue, {}) }),
            /* @__PURE__ */ jsx(SelectContent, { children: data.sites.map((siteId) => /* @__PURE__ */ jsx(
              SelectItem,
              {
                value: siteId || "@unknown",
                children: siteId || "(unknown)"
              },
              `k-${siteId}`
            )) })
          ]
        }
      ) }),
      /* @__PURE__ */ jsx("div", { className: "lg:basis-1/6-gap-4 sm:basis-1/5-gap-4 basis-1/3-gap-4", children: /* @__PURE__ */ jsxs(
        Select,
        {
          defaultValue: data.interval,
          onValueChange: (interval) => changeInterval(interval),
          children: [
            /* @__PURE__ */ jsx(SelectTrigger, { children: /* @__PURE__ */ jsx(SelectValue, {}) }),
            /* @__PURE__ */ jsxs(SelectContent, { children: [
              /* @__PURE__ */ jsx(SelectItem, { value: "today", children: "Today" }),
              /* @__PURE__ */ jsx(SelectItem, { value: "yesterday", children: "Yesterday" }),
              /* @__PURE__ */ jsx(SelectItem, { value: "1d", children: "24 hours" }),
              /* @__PURE__ */ jsx(SelectItem, { value: "7d", children: "7 days" }),
              /* @__PURE__ */ jsx(SelectItem, { value: "30d", children: "30 days" }),
              /* @__PURE__ */ jsx(SelectItem, { value: "90d", children: "90 days" })
            ] })
          ]
        }
      ) }),
      /* @__PURE__ */ jsx("div", { className: "basis-auto flex", children: /* @__PURE__ */ jsx("div", { className: "m-auto", children: /* @__PURE__ */ jsx(
        SearchFilterBadges,
        {
          filters: data.filters,
          onFilterDelete: handleFilterDelete
        }
      ) }) })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "transition", style: { opacity: loading ? 0.6 : 1 }, children: [
      /* @__PURE__ */ jsx("div", { className: "w-full mb-4", children: /* @__PURE__ */ jsx(
        StatsCard,
        {
          siteId: data.siteId,
          interval: data.interval,
          filters: data.filters,
          timezone: userTimezone
        }
      ) }),
      /* @__PURE__ */ jsx("div", { className: "w-full mb-4", children: /* @__PURE__ */ jsx(
        TimeSeriesCard,
        {
          siteId: data.siteId,
          interval: data.interval,
          filters: data.filters,
          timezone: userTimezone
        }
      ) }),
      /* @__PURE__ */ jsxs("div", { className: "grid md:grid-cols-2 gap-4 mb-4", children: [
        /* @__PURE__ */ jsx(
          PathsCard,
          {
            siteId: data.siteId,
            interval: data.interval,
            filters: data.filters,
            onFilterChange: handleFilterChange,
            timezone: userTimezone
          }
        ),
        /* @__PURE__ */ jsx(
          ReferrerCard,
          {
            siteId: data.siteId,
            interval: data.interval,
            filters: data.filters,
            onFilterChange: handleFilterChange,
            timezone: userTimezone
          }
        )
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "grid md:grid-cols-3 gap-4 mb-4", children: [
        /* @__PURE__ */ jsx(
          BrowserCard,
          {
            siteId: data.siteId,
            interval: data.interval,
            filters: data.filters,
            onFilterChange: handleFilterChange,
            timezone: userTimezone
          }
        ),
        /* @__PURE__ */ jsx(
          CountryCard,
          {
            siteId: data.siteId,
            interval: data.interval,
            filters: data.filters,
            onFilterChange: handleFilterChange,
            timezone: userTimezone
          }
        ),
        /* @__PURE__ */ jsx(
          DeviceCard,
          {
            siteId: data.siteId,
            interval: data.interval,
            filters: data.filters,
            onFilterChange: handleFilterChange,
            timezone: userTimezone
          }
        )
      ] })
    ] })
  ] });
}
function ErrorBoundary() {
  const error = useRouteError();
  const errorTitle = isRouteErrorResponse(error) ? error.status : "Error";
  const errorBody = isRouteErrorResponse(error) ? error.data : error instanceof Error ? error.message : "Unknown error";
  return /* @__PURE__ */ jsxs("div", { className: "border-2 rounded p-4 bg-card", children: [
    /* @__PURE__ */ jsx("h1", { className: "text-2xl font-bold", children: errorTitle }),
    /* @__PURE__ */ jsx("p", { className: "text-lg", children: errorBody })
  ] });
}
const route9 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  ErrorBoundary,
  default: Dashboard,
  loader: loader$1,
  meta: meta$1
}, Symbol.toStringTag, { value: "Module" }));
function getMidnightDate() {
  const midnight = /* @__PURE__ */ new Date();
  midnight.setHours(0, 0, 0, 0);
  return midnight;
}
function getNextLastModifiedDate(current) {
  if (current && isNaN(current.getTime())) {
    current = null;
  }
  const midnight = getMidnightDate();
  let next = current ? current : midnight;
  next = midnight.getTime() - next.getTime() > 0 ? midnight : next;
  next.setSeconds(next.getSeconds() + 1);
  return next;
}
function getBounceValue(nextLastModifiedDate) {
  if (!nextLastModifiedDate) {
    return 0;
  }
  const midnight = getMidnightDate();
  const visits = (nextLastModifiedDate.getTime() - midnight.getTime()) / 1e3 - 1;
  switch (visits) {
    case 0:
      return 1;
    case 1:
      return -1;
    default:
      return 0;
  }
}
function checkVisitorSession(ifModifiedSince) {
  let newVisitor = true;
  if (ifModifiedSince) {
    const today = /* @__PURE__ */ new Date();
    const ifModifiedSinceDate = new Date(ifModifiedSince);
    if (today.getFullYear() === ifModifiedSinceDate.getFullYear() && today.getMonth() === ifModifiedSinceDate.getMonth() && today.getDate() === ifModifiedSinceDate.getDate()) {
      newVisitor = false;
    }
  }
  return { newVisitor };
}
function extractParamsFromQueryString(requestUrl) {
  const url = new URL(requestUrl);
  const queryString = url.search.slice(1).split("&");
  const params = {};
  queryString.forEach((item) => {
    const kv = item.split("=");
    if (kv[0]) params[kv[0]] = decodeURIComponent(kv[1]);
  });
  return params;
}
function collectRequestHandler(request, env) {
  var _a;
  const params = extractParamsFromQueryString(request.url);
  const userAgent = request.headers.get("user-agent") || void 0;
  const parsedUserAgent = new UAParser(userAgent);
  parsedUserAgent.getBrowser().name;
  const ifModifiedSince = request.headers.get("if-modified-since");
  const { newVisitor } = checkVisitorSession(ifModifiedSince);
  const nextLastModifiedDate = getNextLastModifiedDate(
    ifModifiedSince ? new Date(ifModifiedSince) : null
  );
  const data = {
    siteId: params.sid,
    host: params.h,
    path: params.p,
    referrer: params.r,
    newVisitor: newVisitor ? 1 : 0,
    newSession: 0,
    // dead column
    bounce: newVisitor ? 1 : getBounceValue(nextLastModifiedDate),
    // user agent stuff
    userAgent,
    browserName: parsedUserAgent.getBrowser().name,
    deviceModel: parsedUserAgent.getDevice().model
  };
  const country = (_a = request.cf) == null ? void 0 : _a.country;
  if (typeof country === "string") {
    data.country = country;
  }
  writeDataPoint(env.WEB_COUNTER_AE, data);
  const gif = "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
  const gifData = atob(gif);
  const gifLength = gifData.length;
  const arrayBuffer = new ArrayBuffer(gifLength);
  const uintArray = new Uint8Array(arrayBuffer);
  for (let i = 0; i < gifLength; i++) {
    uintArray[i] = gifData.charCodeAt(i);
  }
  return new Response(arrayBuffer, {
    headers: {
      "Content-Type": "image/gif",
      Expires: "Mon, 01 Jan 1990 00:00:00 GMT",
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
      "Last-Modified": nextLastModifiedDate.toUTCString(),
      Tk: "N"
      // not tracking
    },
    status: 200
  });
}
function writeDataPoint(analyticsEngine, data) {
  const datapoint = {
    indexes: [data.siteId || ""],
    // Supply one index
    blobs: [
      data.host || "",
      // blob1
      data.userAgent || "",
      // blob2
      data.path || "",
      // blob3
      data.country || "",
      // blob4
      data.referrer || "",
      // blob5
      data.browserName || "",
      // blob6
      data.deviceModel || "",
      // blob7
      data.siteId || ""
      // blob8
    ],
    doubles: [data.newVisitor || 0, 0, data.bounce]
  };
  if (!analyticsEngine) {
    console.log("Can't save datapoint: Analytics unavailable");
    return;
  }
  analyticsEngine.writeDataPoint(datapoint);
}
async function loader({ request, context }) {
  return collectRequestHandler(request, context.cloudflare.env);
}
const route10 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  loader
}, Symbol.toStringTag, { value: "Module" }));
const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline"
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);
const Button = React.forwardRef(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return /* @__PURE__ */ jsx(
      Comp,
      {
        className: cn(buttonVariants({ variant, size, className })),
        ref,
        ...props
      }
    );
  }
);
Button.displayName = "Button";
const meta = () => {
  return [
    { title: "Counterscale: Web Analytics" },
    { name: "description", content: "Counterscale: Web Analytics" }
  ];
};
function Index() {
  return /* @__PURE__ */ jsxs("div", { style: { fontFamily: "system-ui, sans-serif", lineHeight: "1.8" }, children: [
    /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap sm:flex-nowrap flex-row items-center justify-center border-b-2 pb-12 mb-8", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("h2", { className: "font-bold text-4xl sm:text-5xl lg:text-6xl mb-6", children: "Scalable web analytics you run yourself on Cloudflare" }),
        /* @__PURE__ */ jsx(Button, { children: /* @__PURE__ */ jsxs(
          "a",
          {
            className: "capitalize",
            href: "https://github.com/benvinegar/counterscale",
            children: [
              "Get Started",
              /* @__PURE__ */ jsxs("span", { className: "hidden sm:inline", children: [
                " ",
                "with GitHub"
              ] })
            ]
          }
        ) }),
        /* @__PURE__ */ jsxs("span", { className: "ml-4", children: [
          "or",
          /* @__PURE__ */ jsx(
            "a",
            {
              href: "/dashboard",
              className: "ml-2 underline font-medium",
              children: "Browse the demo"
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "max-w-md", children: /* @__PURE__ */ jsx(
        "img",
        {
          src: "/counterscale-logo.webp",
          alt: "CounterScale Logo"
        }
      ) })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap border-b-2 ", children: [
      /* @__PURE__ */ jsxs("div", { className: "md:basis-1/2 mb-8", children: [
        /* @__PURE__ */ jsx("h3", { className: "text-3xl mb-4", children: "Free and open source" }),
        /* @__PURE__ */ jsx("p", { children: "Counterscale is MIT licensed. You run it yourself on your own Cloudflare account." })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "md:basis-1/2 mb-8", children: [
        /* @__PURE__ */ jsx("h3", { className: "text-3xl mb-4", children: "Simple to deploy and maintain" }),
        /* @__PURE__ */ jsx("p", { children: "Counterscale is deployed as a single Cloudflare Worker, with event data stored using Cloudflare Analytics Engine (beta)." })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "md:basis-1/2 mb-8", children: [
        /* @__PURE__ */ jsx("h3", { className: "text-3xl mb-4", children: "Don't break the bank" }),
        /* @__PURE__ */ jsx("p", { children: "Pay pennies to handle 100ks of requests on Cloudflare's infrastructure." })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "md:basis-1/2 mb-8", children: [
        /* @__PURE__ */ jsx("h3", { className: "text-3xl mb-4", children: "Privacy focused" }),
        /* @__PURE__ */ jsx("p", { children: "Doesn't set any cookies, and you control your data end-to-end. Data is retained for only 90 days." })
      ] })
    ] })
  ] });
}
const route11 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: Index,
  meta
}, Symbol.toStringTag, { value: "Module" }));
const serverManifest = { "entry": { "module": "/assets/entry.client-jml9H2q7.js", "imports": ["/assets/jsx-runtime-D2HyDbKh.js", "/assets/components-B2kvCXZv.js"], "css": [] }, "routes": { "root": { "id": "root", "parentId": void 0, "path": "", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/root-AM1kdB8g.js", "imports": ["/assets/jsx-runtime-D2HyDbKh.js", "/assets/components-B2kvCXZv.js"], "css": [] }, "routes/resources.timeseries": { "id": "routes/resources.timeseries", "parentId": "root", "path": "resources/timeseries", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/resources.timeseries-l0sNRNKZ.js", "imports": [], "css": [] }, "routes/resources.referrer": { "id": "routes/resources.referrer", "parentId": "root", "path": "resources/referrer", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/resources.referrer-l0sNRNKZ.js", "imports": [], "css": [] }, "routes/resources.browser": { "id": "routes/resources.browser", "parentId": "root", "path": "resources/browser", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/resources.browser-l0sNRNKZ.js", "imports": [], "css": [] }, "routes/resources.country": { "id": "routes/resources.country", "parentId": "root", "path": "resources/country", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/resources.country-l0sNRNKZ.js", "imports": [], "css": [] }, "routes/resources.device": { "id": "routes/resources.device", "parentId": "root", "path": "resources/device", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/resources.device-l0sNRNKZ.js", "imports": [], "css": [] }, "routes/resources.paths": { "id": "routes/resources.paths", "parentId": "root", "path": "resources/paths", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/resources.paths-l0sNRNKZ.js", "imports": [], "css": [] }, "routes/resources.stats": { "id": "routes/resources.stats", "parentId": "root", "path": "resources/stats", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/resources.stats-l0sNRNKZ.js", "imports": [], "css": [] }, "routes/admin-redirect": { "id": "routes/admin-redirect", "parentId": "root", "path": "admin-redirect", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/admin-redirect-l0sNRNKZ.js", "imports": [], "css": [] }, "routes/dashboard": { "id": "routes/dashboard", "parentId": "root", "path": "dashboard", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": true, "module": "/assets/dashboard-B1PnkCvO.js", "imports": ["/assets/jsx-runtime-D2HyDbKh.js", "/assets/components-B2kvCXZv.js", "/assets/index-CKieBgrW.js"], "css": [] }, "routes/collect": { "id": "routes/collect", "parentId": "root", "path": "collect", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/collect-l0sNRNKZ.js", "imports": [], "css": [] }, "routes/_index": { "id": "routes/_index", "parentId": "root", "path": void 0, "index": true, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/_index-hfKPSRot.js", "imports": ["/assets/jsx-runtime-D2HyDbKh.js", "/assets/index-CKieBgrW.js"], "css": [] } }, "url": "/assets/manifest-95dfe1f9.js", "version": "95dfe1f9" };
const mode = "production";
const assetsBuildDirectory = "build/client";
const basename = "/";
const future = { "v3_fetcherPersist": true, "v3_relativeSplatPath": true, "v3_throwAbortReason": true, "v3_routeConfig": true, "v3_singleFetch": true, "v3_lazyRouteDiscovery": true, "unstable_optimizeDeps": false };
const isSpaMode = false;
const publicPath = "/";
const entry = { module: entryServer };
const routes = {
  "root": {
    id: "root",
    parentId: void 0,
    path: "",
    index: void 0,
    caseSensitive: void 0,
    module: route0
  },
  "routes/resources.timeseries": {
    id: "routes/resources.timeseries",
    parentId: "root",
    path: "resources/timeseries",
    index: void 0,
    caseSensitive: void 0,
    module: route1
  },
  "routes/resources.referrer": {
    id: "routes/resources.referrer",
    parentId: "root",
    path: "resources/referrer",
    index: void 0,
    caseSensitive: void 0,
    module: route2
  },
  "routes/resources.browser": {
    id: "routes/resources.browser",
    parentId: "root",
    path: "resources/browser",
    index: void 0,
    caseSensitive: void 0,
    module: route3
  },
  "routes/resources.country": {
    id: "routes/resources.country",
    parentId: "root",
    path: "resources/country",
    index: void 0,
    caseSensitive: void 0,
    module: route4
  },
  "routes/resources.device": {
    id: "routes/resources.device",
    parentId: "root",
    path: "resources/device",
    index: void 0,
    caseSensitive: void 0,
    module: route5
  },
  "routes/resources.paths": {
    id: "routes/resources.paths",
    parentId: "root",
    path: "resources/paths",
    index: void 0,
    caseSensitive: void 0,
    module: route6
  },
  "routes/resources.stats": {
    id: "routes/resources.stats",
    parentId: "root",
    path: "resources/stats",
    index: void 0,
    caseSensitive: void 0,
    module: route7
  },
  "routes/admin-redirect": {
    id: "routes/admin-redirect",
    parentId: "root",
    path: "admin-redirect",
    index: void 0,
    caseSensitive: void 0,
    module: route8
  },
  "routes/dashboard": {
    id: "routes/dashboard",
    parentId: "root",
    path: "dashboard",
    index: void 0,
    caseSensitive: void 0,
    module: route9
  },
  "routes/collect": {
    id: "routes/collect",
    parentId: "root",
    path: "collect",
    index: void 0,
    caseSensitive: void 0,
    module: route10
  },
  "routes/_index": {
    id: "routes/_index",
    parentId: "root",
    path: void 0,
    index: true,
    caseSensitive: void 0,
    module: route11
  }
};
export {
  serverManifest as assets,
  assetsBuildDirectory,
  basename,
  entry,
  future,
  isSpaMode,
  mode,
  publicPath,
  routes
};
