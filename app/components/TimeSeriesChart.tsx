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
        const dateObj = new Date(date);

        // convert from utc to local time
        dateObj.setMinutes(dateObj.getMinutes() - dateObj.getTimezoneOffset());

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

    function tooltipDateFormatter(date: string): string {
        const dateObj = new Date(date);

        // convert from utc to local time
        dateObj.setMinutes(dateObj.getMinutes() - dateObj.getTimezoneOffset());

        return (
            dateObj.toLocaleString("en-us", {
                weekday: "short",
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "numeric",
            }) + ` ${timezone}`
        );
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

                <Tooltip labelFormatter={tooltipDateFormatter} />
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
