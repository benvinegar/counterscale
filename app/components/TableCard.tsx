import PropTypes, { InferProps } from "prop-types";

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "~/components/ui/table";

import { Card } from "~/components/ui/card";

type CountByProperty = [string, string][];

function calculateCountPercentages(countByProperty: CountByProperty) {
    const totalCount = countByProperty.reduce(
        (sum, row) => sum + parseInt(row[1]),
        0
    );

    return countByProperty.map((row) => {
        const count = parseInt(row[1]);
        const percentage = ((count / totalCount) * 100).toFixed(2);
        return `${percentage}%`;
    });
}
export default function TableCard({
    countByProperty,
    columnHeaders,
}: InferProps<typeof TableCard.propTypes>) {
    const barChartPercentages = calculateCountPercentages(
        countByProperty as CountByProperty
    );
    return (
        <Card>
            <Table>
                <TableHeader>
                    <TableRow>
                        {/* empty header required otherwise column for the bar chart wont render */}
                        <th />
                        {(columnHeaders || []).map((header: string, index) => (
                            <TableHead
                                key={header}
                                className={
                                    index === 0 ? "text-left" : "text-right"
                                }
                            >
                                {header}
                            </TableHead>
                        ))}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {(countByProperty || []).map((item: any, key) => (
                        <TableRow
                            key={item[0]}
                            className="relative group [&_td]:last:rounded-b-md"
                        >
                            {/* element _must_ be a `td` otherwise we get hydration errors */}
                            <td
                                className="bg-orange-200 absolute h-full after:content-[''] group-hover:opacity-50"
                                style={{
                                    width: barChartPercentages[key],
                                }}
                            />
                            <TableCell className="font-medium relative">
                                {item[0]}
                            </TableCell>
                            <TableCell className="text-right relative">
                                {item[1]}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </Card>
    );
}

TableCard.propTypes = {
    propertyName: PropTypes.string,
    countByProperty: PropTypes.array,
    columnHeaders: PropTypes.array,
};
