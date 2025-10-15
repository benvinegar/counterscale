import { cn } from "../lib/utils";

interface SectionProps {
    children: React.ReactNode;
    className?: string;
}

export function Section({ children, className }: SectionProps) {
    return (
        <div className={cn("mb-12 sm:mb-20", className)}>
            {children}
        </div>
    );
}
