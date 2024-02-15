import { MetaFunction } from "@remix-run/cloudflare";
import { Button } from "~/components/ui/button";

export const meta: MetaFunction = () => {
    return [
        { title: "Counterscale: Web Analytics" },
        { name: "description", content: "Counterscale: Web Analytics" },
    ];
};

export default function Index() {
    return (
        <div style={{ fontFamily: "system-ui, sans-serif", lineHeight: "1.8" }}>
            <div className="flex flex-wrap sm:flex-nowrap flex-row items-center justify-center border-b-2 pb-12 mb-8">
                <div>
                    <h2 className="font-bold text-4xl sm:text-5xl lg:text-6xl mb-6">
                        Scalable web analytics you run yourself on Cloudflare
                    </h2>
                    <Button>
                        <a
                            className="capitalize"
                            href="https://github.com/benvinegar/counterscale"
                        >
                            Get Started
                            <span className="hidden sm:inline">
                                {" "}
                                with GitHub
                            </span>
                        </a>
                    </Button>
                    <span className="ml-4">
                        or
                        <a
                            href="/dashboard"
                            className="ml-2 underline font-medium"
                        >
                            Browse the demo
                        </a>
                    </span>
                </div>
                <div className="max-w-md">
                    <img
                        src="/counterscale-logo.webp"
                        alt="CounterScale Logo"
                    />
                </div>
            </div>

            <div className="flex flex-wrap border-b-2 ">
                <div className="md:basis-1/2 mb-8">
                    <h3 className="text-3xl mb-4">Free and open source</h3>
                    <p>
                        Counterscale is MIT licensed. You run it yourself on
                        your own Cloudflare account.
                    </p>
                </div>

                <div className="md:basis-1/2 mb-8">
                    <h3 className="text-3xl mb-4">
                        Simple to deploy and maintain
                    </h3>
                    <p>
                        Counterscale is deployed as a single Cloudflare Worker,
                        with event data stored using Cloudflare Analytics Engine
                        (beta).
                    </p>
                </div>

                <div className="md:basis-1/2 mb-8">
                    <h3 className="text-3xl mb-4">Don&apos;t break the bank</h3>
                    <p>
                        Pay pennies to handle 100ks of requests on
                        Cloudflare&apos;s infrastructure.
                    </p>
                </div>

                <div className="md:basis-1/2 mb-8">
                    <h3 className="text-3xl mb-4">Privacy focused</h3>
                    <p>
                        Doesn&apos;t set any cookies, and you control your data
                        end-to-end. Data is retained for only 90 days.
                    </p>
                </div>
            </div>
        </div>
    );
}
