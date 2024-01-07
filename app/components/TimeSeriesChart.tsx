import PropTypes, { InferProps } from 'prop-types';

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function TimeSeriesChart({ data }: InferProps<typeof TimeSeriesChart.propTypes>) {

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
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Area dataKey="views" stroke="#F46A3D" strokeWidth="2" fill="#F99C35" />
            </AreaChart>
        </ResponsiveContainer>
    );

}

TimeSeriesChart.propTypes = {
    data: PropTypes.any,

}