import dns from "node:dns";

/**
 * Installs a resilient DNS lookup fallback on Node's `dns.lookup`.
 *
 * Why this is necessary:
 * Some local ISP DNS resolvers (e.g. Reliance Jio, local router DNS)
 * intermittently fail or refuse queries for Neon Serverless database endpoints
 * (*.aws.neon.tech), resulting in `getaddrinfo ENOTFOUND <neon-endpoint>`.
 *
 * When the operating system's native `getaddrinfo` fails with ENOTFOUND, EAI_AGAIN,
 * or EREFUSED, this fallback automatically queries trusted public DNS resolvers
 * (Google 8.8.8.8, Cloudflare 1.1.1.1, Google 8.8.4.4) via `dns.promises.Resolver`.
 */
export function setupDnsResilience(): void {
  const globalWithDns = globalThis as unknown as {
    __dnsResilienceInstalled?: boolean;
  };
  if (globalWithDns.__dnsResilienceInstalled) return;
  globalWithDns.__dnsResilienceInstalled = true;

  const originalLookup = dns.lookup.bind(dns);
  const fallbackResolver = new dns.promises.Resolver();
  fallbackResolver.setServers(["8.8.8.8", "1.1.1.1", "8.8.4.4"]);

  dns.lookup = ((
    hostname: string,
    options: any,
    callback: (
      err: NodeJS.ErrnoException | null,
      address: any,
      family?: number,
    ) => void,
  ) => {
    if (typeof options === "function") {
      callback = options;
      options = {};
    }
    const isAll =
      typeof options === "object" && options !== null && options.all;
    const requestedFamily =
      typeof options === "object" && options !== null
        ? options.family
        : undefined;

    originalLookup(
      hostname,
      options,
      (err: NodeJS.ErrnoException | null, address: any, family?: number) => {
        if (!err) {
          return callback(null, address, family);
        }

        // Only fall back for DNS resolution failure codes
        const code = err.code || "";
        if (
          code === "ENOTFOUND" ||
          code === "EAI_AGAIN" ||
          code === "EREFUSED" ||
          code === "SERVFAIL"
        ) {
          const tryV4 = () =>
            fallbackResolver
              .resolve4(hostname)
              .then((addresses) => {
                if (!addresses || addresses.length === 0) {
                  return callback(err, address, family);
                }
                if (isAll) {
                  return callback(
                    null,
                    addresses.map((a) => ({ address: a, family: 4 })),
                  );
                }
                return callback(null, addresses[0], 4);
              })
              .catch(() => tryV6());

          const tryV6 = () =>
            fallbackResolver
              .resolve6(hostname)
              .then((addresses6) => {
                if (!addresses6 || addresses6.length === 0) {
                  return callback(err, address, family);
                }
                if (isAll) {
                  return callback(
                    null,
                    addresses6.map((a) => ({ address: a, family: 6 })),
                  );
                }
                return callback(null, addresses6[0], 6);
              })
              .catch(() => callback(err, address, family));

          if (requestedFamily === 6) {
            return tryV6();
          }
          return tryV4();
        }

        return callback(err, address, family);
      },
    );
  }) as typeof dns.lookup;
}
