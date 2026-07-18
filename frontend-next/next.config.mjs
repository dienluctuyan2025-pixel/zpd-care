/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ảnh local public/ không cần optimize remote
  images: { unoptimized: true },
};

export default nextConfig;
