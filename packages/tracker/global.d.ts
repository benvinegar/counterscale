// Use a simpler approach with a comment to explain the type
declare global {
    interface Window {
        counterscale: {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            q?: any[]; // Command queue for legacy API
            init: (opts: any) => void;
            trackPageview: (opts?: any) => Promise<void>;
            cleanup: () => void;
        };
    }
}

export {};
