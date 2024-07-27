import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "~/components/ui/table";

type CountByProperty = [string, string, string?][];

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
    onClick,
}: {
    countByProperty: CountByProperty;
    columnHeaders: string[];
    onClick?: (key: string) => void;
}) {
    const barChartPercentages = calculateCountPercentages(countByProperty);

    const countFormatter = Intl.NumberFormat("en", { notation: "compact" });

    const gridCols =
        (columnHeaders || []).length === 3
            ? "grid-cols-[minmax(0,1fr),minmax(0,8ch),minmax(0,8ch)]"
            : "grid-cols-[minmax(0,1fr),minmax(0,8ch)]";

    return (
        <Table>
            <TableHeader>
                <TableRow className={`${gridCols}`}>
                    {(columnHeaders || []).map((header: string, index) => (
                        <TableHead
                            key={header}
                            className={
                                index === 0
                                    ? "text-left"
                                    : "text-right pr-4 pl-0"
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
                        className={`group [&_td]:last:rounded-b-md ${gridCols}`}
                        width={barChartPercentages[key]}
                    >
                        <TableCell className="font-medium min-w-48 break-all">
                            {onClick ? (
                                <button
                                    onClick={() => onClick(item[0] as string)}
                                    className="hover:underline"
                                >
                                    {item[0]}
                                </button>
                            ) : (
                                item[0]
                            )}
                        </TableCell>

                        <TableCell className="text-right min-w-16">
                            {countFormatter.format(parseInt(item[1], 10))}
                        </TableCell>

                        {item.length > 2 && item[2] !== undefined && (
                            <TableCell className="text-right min-w-16">
                                {countFormatter.format(parseInt(item[2], 10))}
                            </TableCell>
                        )}
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}
