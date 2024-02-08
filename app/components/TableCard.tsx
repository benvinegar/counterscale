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
        0,
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
        countByProperty as CountByProperty,
    );
    return (
        <Card>
            <Table>
                <TableHeader>
                    <TableRow>
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
                    {(countByProperty || []).map((item, key) => (
                        <TableRow
                            key={item[0]}
                            className="relative group [&_td]:last:rounded-b-md"
                            width={barChartPercentages[key]}
                        >
                            <TableCell
                                className="font-medium relative w-3/4"
                                width={barChartPercentages[key]}
                            >
                                {item[0]}
                            </TableCell>
                            <TableCell className="text-right relative w-1/4">
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
    countByProperty: PropTypes.arrayOf(
        PropTypes.arrayOf(
            PropTypes.oneOfType([
                PropTypes.string.isRequired,
                PropTypes.number.isRequired,
            ]).isRequired,
        ).isRequired,
    ).isRequired,
    columnHeaders: PropTypes.array,
};
