import { Section } from "./Section";
import { SectionHeading } from "./SectionHeading";

export function TerminalSetup() {
  return (
    <Section>
      <SectionHeading
        title="Purpose-built for operational sanity"
        subtitle="No containers to manage, databases to resize, or clusters to scale. Built for Cloudflare's serverless platform, Counterscale stays online without handholding."
      />
      <div className="max-w-3xl mx-auto">
        {/* Terminal Window */}
        <div className="bg-gray-900 rounded-lg shadow-2xl overflow-hidden not-content">
          {/* Terminal Header */}
          <div className="bg-gray-800 px-4 py-3 flex items-center">
            <div className="flex space-x-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
            </div>
          </div>
          {/* Terminal Content */}
            <div
              className="p-6 text-xs sm:text-sm leading-tight overflow-x-auto"
              style={{ fontFamily: "'IBM Plex Mono', monospace" }}
            >
              <div>
                <div className="text-gray-200">
                  &gt;{" "}
                  <span className="text-teal-400">
                    npx @counterscale/cli@latest install
                  </span>
                </div>
                <div className="mt-4 mb-4">
                  <pre className="text-orange-500">{`   ______                  __                            __
  / ____/___  __  ______  / /____  ___________________ _/ /__
 / /   / __ \\/ / / / __ \\/ __/ _ \\/ ___/ ___/ ___/ __ \`/ / _ \\
/ /___/ /_/ / /_/ / / / / /_/  __/ /  (__  ) /__/ /_/ / /  __/
\\____/\\____/\\__,_/_/ /_/\\__/\\___/_/  /____/\\___/\\__,_/_/\\___/`}</pre>
                </div>
                <div className="text-gray-400 mb-4">
                  <span className="underline text-orange-200">
                    https://counterscale.dev
                  </span>{" "}
                  •{" "}
                  <span className="text-orange-200">
                    3.1.0
                  </span>
                </div>
                <div className="text-gray-300">
                  <div>
                    <span className="text-gray-600">┌</span>{" "}
                      install
                  </div>
                <div>
                <span className="text-gray-600">│</span>
              </div>
              <div>
                <span className="text-teal-400">◇</span>{" "}
                  Authenticated with Cloudflare using
                  Account ID ending in:{" "}
                <span className="text-teal-400">
                  e4be1c
                </span>
              </div>
                                    <div>
                                        <span className="text-gray-600">│</span>
                                    </div>
                                    <div>
                                        <span className="text-teal-400">◆</span>{" "}
                                        Do you want to deploy version 3.1.0 now?
                                    </div>
                                    <div>
                                        <span className="text-blue-400">│</span>{" "}
                                        {/* blinking cursor */}
                                        <span className="text-teal-400 animate-pulse">
                                            ●
                                        </span>{" "}
                                        Yes / ○ No
                                    </div>
                                    <div>
                                        <span className="text-blue-400">└</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </Section>
  )
}
