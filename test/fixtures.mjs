export const config = (url) => ({
  version: 1,
  baseURL: url,
  enforceOnStop: true,
  sourcePaths: ["src"],
  pages: [{ name: "comparison", path: "/", ready: "table" }],
  viewports: [{ name: "desktop", width: 1280, height: 800 }],
  accessibility: true,
});
