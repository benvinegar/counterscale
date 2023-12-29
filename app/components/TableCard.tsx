import PropTypes, { InferProps } from 'prop-types';

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "~/components/ui/table"

import { Card } from "~/components/ui/card"

export default function TableCard({ countByProperty, propertyName }: InferProps<typeof TableCard.propTypes>) {
    return (<Card>
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead className="text-left">{propertyName}</TableHead>
                    <TableHead className="text-right">Visitors</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {(countByProperty || []).map((item: any) => (
                    <TableRow key={item[0]}>
                        <TableCell className="font-medium">{item[0]}</TableCell>
                        <TableCell className="text-right">{item[1]}</TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    </Card>)
}

TableCard.propTypes = {
    propertyName: PropTypes.string,
    countByProperty: PropTypes.array
}