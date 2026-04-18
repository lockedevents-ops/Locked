export function isEnvEnabled(value: string | undefined, defaultValue: boolean = false): boolean {
  if (value === undefined) return defaultValue;
  const normalized = value.trim().toLowerCase();
  return ['1', 'true', 'yes', 'on', 'enabled'].includes(normalized);
}

export function isHubtelNetworkEnabled(): boolean {
  // Default false until IP whitelist is completed.
  return isEnvEnabled(process.env.HUBTEL_NETWORK_ENABLED, false);
}

export function isVenuesEnabled(): boolean {
  // Default false while venue features are frozen.
  const value = process.env.NEXT_PUBLIC_VENUES_ENABLED ?? process.env.VENUES_ENABLED;
  return isEnvEnabled(value, false);
}

export function createTimeoutError(label: string, timeoutMs: number): Error {
  return new Error(`${label} timed out after ${timeoutMs}ms`);
}

export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs: number = 10000,
  label: string = 'Network request'
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort(createTimeoutError(label, timeoutMs));
  }, timeoutMs);

  const upstreamSignal = init.signal;
  const abortForwarder = () => {
    controller.abort(upstreamSignal?.reason || new Error('Upstream aborted request'));
  };

  if (upstreamSignal) {
    if (upstreamSignal.aborted) {
      clearTimeout(timeoutId);
      controller.abort(upstreamSignal.reason || new Error('Upstream aborted request'));
    } else {
      upstreamSignal.addEventListener('abort', abortForwarder, { once: true });
    }
  }

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
    if (upstreamSignal) {
      upstreamSignal.removeEventListener('abort', abortForwarder);
    }
  }
}
