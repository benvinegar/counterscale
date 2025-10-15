import arrow from "../assets/arrow.svg";

interface ArrowsProps {
    className?: string;
}

export function ArrowsInterstitial({ className = "" }: ArrowsProps) {
    return (
        <div className={`relative flex justify-center mb-10 h-16 not-content ${className}`}>
            <img
                src={arrow.src}
                alt="Arrow icon"
                className="absolute w-6 h-6 transform -translate-y-4 scale-125"
                loading="lazy"
                aria-hidden
            />
            <img
                src={arrow.src}
                alt="Arrow icon"
                className="absolute w-6 h-6 transform translate-x-6 translate-y-4 scale-125"
                loading="lazy"
                aria-hidden
            />
            <img
                src={arrow.src}
                alt="Arrow icon"
                className="absolute w-6 h-6 transform -translate-x-6 translate-y-4 scale-125"
                loading="lazy"
                aria-hidden
            />
        </div>
    );
}
