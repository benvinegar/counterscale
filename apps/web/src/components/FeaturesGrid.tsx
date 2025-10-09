import { Section } from "./Section";

export function FeaturesGrid() {
  return (
    <Section>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-2 border-primary rounded-lg p-4 sm:p-6 md:p-8 bg-card">
                    <div className="mt-0">
                        <h3 className="text-xl font-semibold mb-3">
                            Open source licensed
                        </h3>
                        <p className="text-muted-foreground">
                            Counterscale is self-hosted and MIT-licensed open
                            source software. The code's free – you bring your
                            own Cloudflare account.
                        </p>
                    </div>

                    <div className="mt-0">
                        <h3 className="text-xl font-semibold mb-3">
                            Simple to deploy and maintain
                        </h3>
                        <p className="text-muted-foreground">
                            Get up and running in just 5 minutes using our CLI
                            installer. Once it's live you may never have to
                            touch it again.
                        </p>
                    </div>

                    <div className="mt-0">
                        <h3 className="text-xl font-semibold mb-3">
                            Stupidly affordable to run
                        </h3>
                        <p className="text-muted-foreground">
                            Records up to 50k pageviews/day on Cloudflare's{" "}
                            <a
                                href="https://developers.cloudflare.com/workers/platform/limits/#worker-limits"
                                className="underline"
                            >
                                free Workers plan
                            </a>
                            . Need more? Scales up to millions for pennies.
                        </p>
                    </div>

                    <div className="mt-0">
                        <h3 className="text-xl font-semibold mb-3">
                            Built for end-user privacy
                        </h3>
                        <p className="text-muted-foreground">
                            No cookies, no browser fingerprinting, and you
                            control your data end-to-end.{" "}
                            <span className="italic">
                                Data is retained for only 90 days.
                            </span>
                        </p>
                    </div>
                </div>
            </Section>)
}
