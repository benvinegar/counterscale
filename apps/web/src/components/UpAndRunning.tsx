import { Section } from "./Section";
import { SectionHeading } from "./SectionHeading";
import CloudFlareIcon from "../assets/cloudflare-icon.webp";
import ConsoleIcon from "../assets/console-icon.webp";
import EditorIcon from "../assets/editor-icon.webp";

export function UpAndRunning() {
  return (
    <Section>
      <SectionHeading
        title="Up and running in 5 minutes"
        subtitle="Less time than filling out a 'how did you hear about us?' form."
      />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 md:gap-8 not-content">
        <div className="bg-card rounded-lg p-3 sm:p-4 md:p-6 text-center border-2 border-primary relative">
          <span className="absolute top-3 left-3 bg-primary text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
            1
          </span>
          <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 mx-auto mb-3 sm:mb-4 flex items-center justify-center">
            <img
              src={CloudFlareIcon.src}
              alt="Cloudflare-inspired icon of a cloud with a lightning bolt"
              className="max-w-16 max-h-16 sm:max-w-20 sm:max-h-20 md:max-w-24 md:max-h-24 w-auto h-auto"
              loading="lazy"
            />
          </div>
          <h3 className="text-base sm:text-lg font-semibold mb-2">
            Sign up for Cloudflare
          </h3>
          <p className="text-sm text-muted-foreground">
            Create a free Cloudflare account to power your web
            analytics infrastructure.
          </p>
        </div>

        <div className="bg-card rounded-lg p-3 sm:p-4 md:p-6 text-center border-2 border-primary relative">
          <span className="absolute top-3 left-3 bg-primary text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
            2
          </span>
          <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 mx-auto mb-3 sm:mb-4 flex items-center justify-center">
            <img
              src={ConsoleIcon.src}
              alt="Icon of a terminal console window"
              className="max-w-16 max-h-16 sm:max-w-20 sm:max-h-20 md:max-w-24 md:max-h-24 w-auto h-auto"
              loading="lazy"
            />
          </div>
          <h3 className="text-base sm:text-lg font-semibold mb-2">
            Deploy with our CLI wizard
          </h3>
          <p className="text-sm text-muted-foreground">
            Run one command and follow the prompts to deploy the
            Counterscale server.
          </p>
        </div>

        <div className="bg-card rounded-lg p-3 sm:p-4 md:p-6 text-center border-2 border-primary relative">
          <span className="absolute top-3 left-3 bg-primary text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
            3
          </span>
          <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 mx-auto mb-3 sm:mb-4 flex items-center justify-center">
            <img
              src={EditorIcon.src}
              alt="Icon of a code editor window with a code snippet"
              className="max-w-16 max-h-16 sm:max-w-20 sm:max-h-20 md:max-w-24 md:max-h-24 w-auto h-auto"
              loading="lazy"
            />
          </div>
          <h3 className="text-base sm:text-lg font-semibold mb-2">
            Install the reporting script
          </h3>
          <p className="text-sm text-muted-foreground">
            Add our lightweight JavaScript reporter to your site
            – and you're done!
          </p>
        </div>
      </div>
    </Section>
  )
}
