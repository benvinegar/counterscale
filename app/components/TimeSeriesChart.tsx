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

import { Card } from "./ui/card";

interface TimeSeriesChartProps {
    data: Array<{
        date: string;
        views: number;
        visitors: number;
        bounceRate: number;
    }>;
    intervalType?: string;
    timezone?: string;
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
                <div className="before:content-['•'] before:text-barchart before:font-bold">
                    {" "}
                    {`${payload[0].value} views`}
                </div>
                <div className="before:content-['•'] before:text-border before:font-bold">
                    {" "}
                    {`${payload[1].value} visitors`}
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
    timezone,
}: TimeSeriesChartProps) {
    // chart doesn't really work no data points, so just bail out
    if (data.length === 0) {
        return null;
    }

    const MAX_Y_VALUE_MULTIPLIER = 1.2;

    // get the max integer value of data views
    const maxViews = Math.max(...data.map((item) => item.views));

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
                <XAxis dataKey="date" tickFormatter={xAxisDateFormatter} />

                {/* manually setting maxViews vs using recharts "dataMax" key cause it doesnt seem to work */}
                <YAxis
                    yAxisId="count"
                    dataKey="views"
                    domain={[0, Math.floor(maxViews * MAX_Y_VALUE_MULTIPLIER)]} // set max Y value a little higher than what was recorded
                />
                <YAxis
                    yAxisId="bounceRate"
                    dataKey="bounceRate"
                    domain={[0, Math.floor(100 * MAX_Y_VALUE_MULTIPLIER)]}
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
