/* eslint react/prop-types: 0 */
import * as React from "react";

import { cn } from "~/lib/utils";

const Table = React.forwardRef<
    HTMLTableElement,
    React.HTMLAttributes<HTMLTableElement>
>(({ className, ...props }, ref) => (
    <div className="relative w-full overflow-auto">
        <div
            ref={ref}
            className={cn("w-full caption-bottom text-sm", className)}
            {...props}
        />
    </div>
));
Table.displayName = "Table";

const TableHeader = React.forwardRef<
    HTMLTableSectionElement,
    React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn("[&_tr]:border-b grid", className)}
        {...props}
    />
));
TableHeader.displayName = "TableHeader";

const TableBody = React.forwardRef<
    HTMLTableSectionElement,
    React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn("[&_tr:last-child]:border-0", className)}
        {...props}
    />
));
TableBody.displayName = "TableBody";

const TableFooter = React.forwardRef<
    HTMLTableSectionElement,
    React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn(
            "border-t bg-muted/50 font-medium [&>tr]:last:border-b-0",
            className,
        )}
        {...props}
    />
));
TableFooter.displayName = "TableFooter";

const TableRow = React.forwardRef<
    HTMLTableRowElement,
    React.HTMLAttributes<HTMLTableRowElement> & { width?: string } // Add 'width' property to the type definition
>(({ className, ...props }, ref) => {
    const { width } = props;
    return (
        <div
            ref={ref}
            className={cn(
                `grid border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted`,
                className,
            )}
            style={
                width !== undefined
                    ? {
                          background: `linear-gradient(90deg, hsl(var(--barchart)) ${width}, transparent ${width})`,
                      }
                    : {}
            }
            {...props}
        />
    );
});
TableRow.displayName = "TableRow";

const TableHead = React.forwardRef<
    HTMLTableCellElement,
    React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn(
            "p-3 text-left align-middle font-medium [&:has([role=checkbox])]:pr-0",
            className,
        )}
        {...props}
    />
));
TableHead.displayName = "TableHead";

const TableCell = React.forwardRef<
    HTMLTableCellElement,
    React.TdHTMLAttributes<HTMLTableCellElement> & { width?: string }
>(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn(
            "p-3 align-middle [&:has([role=checkbox])]:pr-0",
            className,
        )}
        {...props}
    />
));
TableCell.displayName = "TableCell";

const TableCaption = React.forwardRef<
    HTMLTableCaptionElement,
    React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
    <caption
        ref={ref}
        className={cn("mt-4 text-sm text-muted-foreground", className)}
        {...props}
    />
));
TableCaption.displayName = "TableCaption";

export {
    Table,
    TableBody,
    TableCaption,
    TableCell,
    TableFooter,
    TableHead,
    TableHeader,
    TableRow,
};
