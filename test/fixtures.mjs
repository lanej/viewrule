export const config = (url) => ({
  version: 1,
  baseURL: url,
  enforceOnStop: true,
  sourcePaths: { include: ["src/**"], exclude: ["src/generated/**"] },
  pages: [{ name: "comparison", path: "/", ready: "table" }],
  viewports: [{ name: "desktop", width: 1280, height: 800 }],
  accessibility: true,
});
