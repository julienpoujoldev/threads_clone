/** @type {import('next').NextConfig} */
const nextConfig = {

  typescript: {ignoreBuildErrors:true},
    experimental: {
     
      serverComponentsExternalPackages: ["mongoose"],
    },
    eslint: {
      // Warning: This allows production builds to successfully complete even if
      // your project has ESLint errors.
    //   ignoreDuringBuilds: true,
    },
    images: {
      unoptimized: true,            // TODO : only for testing : due to Vercel Hobby plan. 
      remotePatterns: [
        {
          protocol: "https",
          hostname: "img.clerk.com",
        },
        {
          protocol: "https",
          hostname: "images.clerk.dev",
        },
        {
          protocol: "https",
          hostname: "utfs.io",
        },
        {
          protocol: "https",
          hostname: "placehold.co",
        },
      ],
    },
  };

export default nextConfig;
