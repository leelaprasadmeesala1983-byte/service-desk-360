export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { setupDnsResilience } = await import("@/lib/dns-resilience");
    setupDnsResilience();

    const { initMidnightRolloverScheduler } = await import(
      "@/lib/quick-cash/rollover-scheduler"
    );
    initMidnightRolloverScheduler();
  }
}
