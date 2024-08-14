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
                {(countByProperty || []).map((item, index) => {
                    const desc = item[0];

                    // the description can be either a single string (that is both the key and the label),
                    // or a tuple of type [key, label]
                    const [key, label] = Array.isArray(desc)
                        ? [desc[0], desc[1] || "(none)"]
                        : [desc, desc || "(none)"];

                    return (
                        <TableRow
                            key={item[0]}
                            className={`group [&_td]:last:rounded-b-md ${gridCols}`}
                            width={barChartPercentages[index]}
                        >
                            <TableCell className="font-medium min-w-48 break-all">
                                {onClick ? (
                                    <button
                                        onClick={() => onClick(key as string)}
                                        className="hover:underline select-text text-left"
                                    >
                                        {label}
                                    </button>
                                ) : (
                                    label
                                )}
                            </TableCell>

                            <TableCell className="text-right min-w-16">
                                {countFormatter.format(parseInt(item[1], 10))}
                            </TableCell>

                            {item.length > 2 && item[2] !== undefined && (
                                <TableCell className="text-right min-w-16">
                                    {countFormatter.format(
                                        parseInt(item[2], 10),
                                    )}
                                </TableCell>
                            )}
                        </TableRow>
                    );
                })}
            </TableBody>
        </Table>
    );
}
