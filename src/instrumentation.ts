export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { initMidnightRolloverScheduler } = await import(
      "@/lib/quick-cash/rollover-scheduler"
    );
    initMidnightRolloverScheduler();
  }
}
