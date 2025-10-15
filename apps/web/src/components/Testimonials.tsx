import { Section } from "./Section";

export function Testimonials() {
  return (
    <Section>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 not-content">
        <div className="text-center">
          <p className="text-xl font-semibold mb-4 leading-relaxed">
            &#8220;Counterscale overcame my hesitation to deploy
            an analytics server.&#8221;
          </p>
          <p className="text-sm font-medium text-muted-foreground">
            —{" "}
            <a
              href="https://brianschiller.com/blog/2025/03/08/analytics-with-counterscale/"
              className="underline text-muted-foreground"
            >
              Brian Schiller
            </a>
            , Software Engineer and Blogger
          </p>
        </div>
        <div className="text-center">
          <p className="text-xl font-semibold mb-4 leading-relaxed">
            &#8220;After the initial setup, I've not had to
            spend a single minute maintaining it.&#8221;
          </p>
          <p className="text-sm font-medium text-muted-foreground">
            —{" "}
            <a
              href="https://jeremymorrell.dev/"
              className="underline text-muted-foreground"
            >
              Jeremy Morrell
            </a>
            , Principal Engineer and Blogger
          </p>
        </div>
      </div>
    </Section>
  )
}
