import {
    Line,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ComposedChart,
} from "recharts";

import { useMemo } from "react";

import { Card } from "./ui/card";

interface TimeSeriesChartProps {
    data: Array<{
        date: string;
        views: number;
        visitors: number;
        bounceRate: number;
    }>;
    intervalType?: string;
}

function dateStringToLocalDateObj(dateString: string): Date {
    const date = new Date(dateString);
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
    return date;
}

function CustomTooltip(props: any) {
    const { active, payload, label } = props;

    const date = dateStringToLocalDateObj(label);

    const formattedDate = date.toLocaleString("en-us", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "numeric",
        timeZoneName: "short",
    });
    if (active && payload && payload.length) {
        return (
            <Card className="p-2 shadow-lg leading-normal">
                <div className="font-semibold">{formattedDate}</div>
                <div className="before:content-['•'] before:text-border before:font-bold">
                    {" "}
                    {`${payload[1].value} visitors`}
                </div>
                <div className="before:content-['•'] before:text-barchart before:font-bold">
                    {" "}
                    {`${payload[0].value} views`}
                </div>
                <div className="before:content-['•'] before:text-paldarkgrey before:font-bold">
                    {" "}
                    {`${payload[2].value}% bounce rate`}
                </div>
            </Card>
        );
    } else {
        return null;
    }
}

export default function TimeSeriesChart({
    data,
    intervalType,
}: TimeSeriesChartProps) {
    function xAxisDateFormatter(date: string): string {
        const dateObj = dateStringToLocalDateObj(date);

        switch (intervalType) {
            case "DAY":
                return dateObj.toLocaleDateString("en-us", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                });
            case "HOUR":
                return dateObj.toLocaleTimeString("en-us", {
                    hour: "numeric",
                    minute: "numeric",
                });
            default:
                throw new Error("Invalid interval type");
        }
    }

    const yAxisCountTicks = useMemo(() => {
        const MAX_TICKS_TO_SHOW = 4;

        // get the max integer value of data views
        const maxViews = Math.max(...data.map((item) => item.views));

        // determine the magnitude of maxViews to set rounding
        const magnitude = Math.floor(Math.log10(maxViews));
        const roundTo = Math.pow(10, Math.max(0, magnitude - 1));

        const numTicks = Math.min(MAX_TICKS_TO_SHOW, maxViews);
        const ticks = [];

        // calculate increment and round it up to the nearest roundTo
        let increment = Math.floor(maxViews / numTicks);
        increment = Math.ceil(increment / roundTo) * roundTo;

        // skip 0 and go 1 further
        for (let i = 1; i <= numTicks + 1; i++) {
            const tick = i * increment;

            ticks.push(tick);
        }

        return ticks;
    }, [data]);

    // omit first and last
    const xAxisTicks = useMemo(
        () => data.slice(1, -1).map((entry) => entry.date),
        [data],
    );

    // chart doesn't really work no data points, so just bail out
    if (data.length === 0) {
        return null;
    }

    return (
        <ResponsiveContainer width="100%" height="100%" minWidth={100}>
            <ComposedChart
                width={500}
                height={400}
                data={data}
                margin={{
                    top: 10,
                    right: 30,
                    left: 0,
                    bottom: 0,
                }}
            >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                    dataKey="date"
                    // tickLine={false}
                    tickMargin={8}
                    ticks={xAxisTicks}
                    tickFormatter={xAxisDateFormatter}
                    tick={{ fill: "grey", fontSize: 14 }}
                />

                {/* manually setting maxViews vs using recharts "dataMax" key cause it doesnt seem to work */}
                <YAxis
                    yAxisId="count"
                    dataKey="views"
                    domain={[0, Math.max(...yAxisCountTicks)]} // set max Y value a little higher than what was recorded
                    tickLine={false}
                    tickMargin={5}
                    ticks={yAxisCountTicks}
                    tick={{ fill: "grey", fontSize: 14 }}
                />
                <YAxis
                    yAxisId="bounceRate"
                    dataKey="bounceRate"
                    domain={[0, 120]}
                    hide={true}
                />

                <Tooltip content={<CustomTooltip />} />

                {/* NOTE: colors defined in globals.css/tailwind.config.js */}
                <Area
                    yAxisId="count"
                    dataKey="views"
                    stroke="#F46A3D"
                    strokeWidth="2"
                    fill="#F99C35"
                />
                <Area
                    yAxisId="count"
                    dataKey="visitors"
                    stroke="#F46A3D"
                    strokeWidth="2"
                    fill="#f96d3e"
                />
                <Line
                    yAxisId="bounceRate"
                    dataKey="bounceRate"
                    stroke="#56726C"
                    strokeWidth="2"
                    dot={false}
                />
            </ComposedChart>
        </ResponsiveContainer>
    );
}
