import { Section } from "./Section";
import { SectionHeading } from "./SectionHeading";

export function CallToAction() {
  const demoUrl =
    import.meta.env.COUNTERSCALE_DEMO_URL ||
    "https://demo.counterscale.dev";

  return (
    <Section className="bg-card border-2 border-primary rounded-lg p-6 sm:p-8 md:p-12 text-center sm:mb-2 mb-2">
      <SectionHeading
        title="Actually run your own analytics stack"
        subtitle="Understand and control your web analytics data end-to-end with Counterscale."
      />
      <div className="mt-8 flex gap-5 items-center justify-center">
        <a className="sl-link-button primary" href="https://github.com/benvinegar/counterscale?tab=readme-ov-file#installation">
          Get Started on GitHub
        </a>
        <a
          href={`${demoUrl}/dashboard`}
          className="underline font-medium text-muted-foreground hover:text-foreground"
        >
          Browse the demo
        </a>
      </div>
    </Section>
  )
}
