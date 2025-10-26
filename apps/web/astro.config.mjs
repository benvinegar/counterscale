// @ts-check
import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import tailwindcss from "@tailwindcss/vite";

import react from "@astrojs/react";

// https://astro.build/config
export default defineConfig({
    integrations: [
        starlight({
            title: "Counterscale",
            logo: {
                src: "./src/assets/arrow.svg",
            },
            head: [
                {
                    tag: "link",
                    attrs: {
                        href: "https://fonts.googleapis.com/css2?family=Geist:wght@100..900&family=IBM+Plex+Mono:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600;1,700&display=swap",
                        rel: "stylesheet",
                    },
                },
            ],
            social: [
                {
                    icon: "github",
                    label: "GitHub",
                    href: "https://github.com/benvinegar/counterscale",
                },
            ],
            sidebar: [
                {
                    label: "Guides",
                    items: [
                        {
                            label: "Getting Started",
                            slug: "guides/getting-started",
                        },
                        {
                            label: "Tracking Setup",
                            slug: "guides/tracking-setup",
                        },
                        { label: "Upgrading", slug: "guides/upgrading" },
                        {
                            label: "Troubleshooting",
                            slug: "guides/troubleshooting",
                        },
                    ],
                },
                {
                    label: "Reference",
                    items: [
                        {
                            label: "@counterscale/cli",
                            slug: "reference/cli",
                        },
                        { label: "@counterscale/tracker", slug: "reference/tracker" },
                        {
                            label: "Advanced Configuration",
                            slug: "reference/advanced-configuration",
                        },
                        { label: "Limitations", slug: "reference/limitations" },
                    ],
                },
            ],
            customCss: ["./src/styles/global.css"],
            expressiveCode: {
              themes: ["github-dark-dimmed"],
            }
        }),
        react(),
    ],
    vite: {
        plugins: [tailwindcss()],
    },
});
