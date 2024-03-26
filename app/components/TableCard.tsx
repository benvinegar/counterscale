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

    const countFormatter = Intl.NumberFormat("en", { notation: "compact" });
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
                            className="group [&_td]:last:rounded-b-md"
                        >
                            <TableCell
                                className="font-medium w-4/5"
                                width={barChartPercentages[key]}
                            >
                                {item[0]}
                            </TableCell>

                            <TableCell className="text-right w-1/5">
                                {countFormatter.format(item[1] as number)}
                            </TableCell>

                            {item.length > 2 && (
                                <TableCell className="text-right w-1/5">
                                    {countFormatter.format(item[2] as number)}
                                </TableCell>
                            )}
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
