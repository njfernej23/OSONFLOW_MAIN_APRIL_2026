/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@workspace/ui"],
  devIndicators: false,
  turbopack: {
    resolveAlias: {
      "shadcn/tailwind.css":
        "../../packages/ui/node_modules/shadcn/dist/tailwind.css",
    },
  },
}

export default nextConfig
