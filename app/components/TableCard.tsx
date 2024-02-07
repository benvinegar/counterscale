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

export default function TableCard({
    countByProperty,
    columnHeaders,
}: InferProps<typeof TableCard.propTypes>) {
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
                    {(countByProperty || []).map((item) => (
                        <TableRow key={item[0]}>
                            <TableCell className="font-medium">
                                {item[0]}
                            </TableCell>
                            <TableCell className="text-right">
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
