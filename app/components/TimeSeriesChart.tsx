import { useEffect, useState } from "react";
import PropTypes, { InferProps } from "prop-types";

import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from "recharts";

export default function TimeSeriesChart({
    data,
    intervalType,
}: InferProps<typeof TimeSeriesChart.propTypes>) {
    const [isDarkMode, setIsDarkMode] = useState(false);

    useEffect(() => {
        const mediaQuery = window.matchMedia?.("(prefers-color-scheme: dark)");
        setIsDarkMode(mediaQuery?.matches ?? false);
        const handleChange = (e: MediaQueryListEvent) =>
            setIsDarkMode(e.matches);
        mediaQuery?.addEventListener("change", handleChange);
        return () => mediaQuery?.removeEventListener("change", handleChange);
    }, []);

    // chart doesn't really work no data points, so just bail out
    if (data.length === 0) {
        return null;
    }

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

        return dateObj.toLocaleString("en-us", {
            weekday: "short",
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "numeric",
        });
    }

    const chartColors = {
        background: isDarkMode ? "hsl(222.2 84% 3.9%)" : "hsl(42 69% 88%)",
        text: isDarkMode ? "hsl(210 20% 55%)" : "hsl(164 14% 21%)",
        grid: isDarkMode ? "#222" : "#ccc",
        areaStroke: isDarkMode ? "hsl(217.2 32.6% 37.5%)" : "#F46A3D",
        areaFill: isDarkMode ? "hsl(220deg 39.76% 16.27%)" : "#F99C35",
    };

    return (
        <ResponsiveContainer width="100%" height="100%">
            <AreaChart
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
                <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={chartColors.grid}
                />
                <XAxis
                    dataKey="date"
                    tickFormatter={xAxisDateFormatter}
                    stroke={chartColors.text}
                />

                {/* manually setting maxViews vs using recharts "dataMax" key cause it doesnt seem to work */}
                <YAxis
                    dataKey="views"
                    domain={[0, maxViews]}
                    stroke={chartColors.text}
                />
                <Tooltip
                    labelFormatter={tooltipDateFormatter}
                    contentStyle={{
                        backgroundColor: chartColors.background,
                        color: chartColors.text,
                        borderColor: chartColors.grid,
                    }}
                />
                <Area
                    dataKey="views"
                    stroke={chartColors.areaStroke}
                    strokeWidth="2"
                    fill={chartColors.areaFill}
                />
            </AreaChart>
        </ResponsiveContainer>
    );
}

TimeSeriesChart.propTypes = {
    data: PropTypes.arrayOf(
        PropTypes.shape({
            views: PropTypes.number.isRequired,
        }).isRequired,
    ).isRequired,
    intervalType: PropTypes.string,
};
