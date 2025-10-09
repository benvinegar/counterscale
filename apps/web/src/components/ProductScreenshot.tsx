import { Section } from "./Section";
import { SectionHeading } from "./SectionHeading";
import screenshot from "../assets/counterscale-benv-screen.webp";

export function ProductScreenshot() {
      const demoUrl =
        import.meta.env.COUNTERSCALE_DEMO_URL ||
        "https://demo.counterscale.dev";

  return (
                <Section className="bg-dark text-dark-foreground rounded-lg p-6 sm:p-8 md:p-12">
                <SectionHeading
                    title="Web analytics essentials"
                    subtitle="Get live stats on pageviews, referrers, user engagement, and more - all without cookies, browser fingerprinting, or handing data to someone else."
                    titleClassName="text-dark-foreground"
                    subtitleClassName="text-dark-foreground/70"
                />

                <div className="max-w-4xl mx-auto not-content">
                    {/* Browser Window Mockup */}
                    <div className="bg-gray-200 rounded-lg shadow-2xl overflow-hidden">
                        {/* Browser Header */}
                        <div className="bg-gray-300 px-4 py-3 flex items-center">
                            <div className="flex space-x-2">
                                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                            </div>
                            <div className="flex-1 mx-4">
                                <div className="bg-white rounded px-3 py-1 text-sm text-gray-600 flex items-center">
                                    <svg
                                        className="w-4 h-4 mr-2 text-gray-400"
                                        fill="currentColor"
                                        viewBox="0 0 20 20"
                                    >
                                        <path
                                            fillRule="evenodd"
                                            d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                                            clipRule="evenodd"
                                        />
                                    </svg>
                                    demo.counterscale.dev/dashboard
                                </div>
                            </div>
                            <div className="flex space-x-1">
                                <div className="w-4 h-4 bg-gray-400 rounded-sm"></div>
                                <div className="w-4 h-4 bg-gray-400 rounded-sm"></div>
                            </div>
                        </div>

                        {/* Screenshot Container */}
                        <a
                            href={`${demoUrl}/dashboard`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block bg-white hover:bg-gray-50 transition-colors cursor-pointer leading-[0]"
                        >
                                <img
                                    src={screenshot.src}
                                    alt="Counterscale analytics dashboard showing real-time pageview data, top pages, referrers, and visitor analytics in a clean, modern interface - Click to view live demo"
                                    className="w-full h-auto"
                                    loading="lazy"
                                />
                        </a>
                    </div>
                </div>
            </Section>
  )
}
