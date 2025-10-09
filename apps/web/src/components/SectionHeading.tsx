import { cn } from "../lib/utils";

interface SectionHeadingProps {
    title: string;
    subtitle?: string;
    className?: string;
    titleClassName?: string;
    subtitleClassName?: string;
    centered?: boolean;
}

export function SectionHeading({
    title,
    subtitle,
    className,
    titleClassName,
    subtitleClassName,
    centered = true,
}: SectionHeadingProps) {
    return (
        <div
            className={cn(
                "mb-8 sm:mb-12",
                centered && "text-center",
                className
            )}
        >
            <h2
                className={cn(
                    "text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4",
                    titleClassName
                )}
            >
                {title}
            </h2>
            {subtitle && (
                <p
                    className={cn(
                        "text-base sm:text-lg text-muted-foreground",
                        centered && "max-w-2xl mx-auto",
                        subtitleClassName
                    )}
                >
                    {subtitle}
                </p>
            )}
        </div>
    );
}
