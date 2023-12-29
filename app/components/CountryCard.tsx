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

export default function CountryCard({ countByCountry }: InferProps<typeof CountryCard.propTypes>) {
    return (<Card>
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead className="w-[100px] text-left">Country</TableHead>
                    <TableHead className="text-right">Visitors</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {(countByCountry || []).map((item: any) => (
                    <TableRow key={item[0]}>
                        <TableCell className="font-medium">{item[0]}</TableCell>
                        <TableCell className="text-right">{item[1]}</TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    </Card>)
}

CountryCard.propTypes = {
    countByCountry: PropTypes.array
}