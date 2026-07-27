(async () => {
  try {
    await import("./desi-ten-worlds.js");
    await import("./desi-visual-qa-fixes.js");
  } catch (error) {
    console.error("DESI experience failed to load:", error);
  }
})();
