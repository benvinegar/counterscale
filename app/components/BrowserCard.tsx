import React from 'react';
import PropTypes, { InferProps } from 'prop-types';

import {
    Table,
    TableBody,
    TableCaption,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "~/components/ui/table"

import { Card, CardTitle, CardDescription, CardContent, CardHeader } from "~/components/ui/card"

export default function BrowserCard({ countByBrowser }: InferProps<typeof BrowserCard.propTypes>) {
    return (<Card>
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead className="w-[100px] text-left">Browser</TableHead>
                    <TableHead className="text-right">Visitors</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {(countByBrowser || []).map((item: any) => (
                    <TableRow key={item[0]}>
                        <TableCell className="font-medium">{item[0]}</TableCell>
                        <TableCell className="text-right">{item[1]}</TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    </Card>)

}
BrowserCard.propTypes = {
    countByBrowser: PropTypes.array
}