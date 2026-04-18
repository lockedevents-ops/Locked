type CounterMap = Record<string, number>;
type DurationEntry = {
  count: number;
  totalMs: number;
  maxMs: number;
  lastMs: number;
};
type DurationMap = Record<string, DurationEntry>;
type GaugeMap = Record<string, number>;

type RuntimeTelemetryStore = {
  counters: CounterMap;
  durations: DurationMap;
  gauges: GaugeMap;
};

declare global {
  // eslint-disable-next-line no-var
  var __LOCKED_RUNTIME_TELEMETRY__: RuntimeTelemetryStore | undefined;
}

function getStore(): RuntimeTelemetryStore {
  if (!globalThis.__LOCKED_RUNTIME_TELEMETRY__) {
    globalThis.__LOCKED_RUNTIME_TELEMETRY__ = {
      counters: {},
      durations: {},
      gauges: {},
    };
  }

  return globalThis.__LOCKED_RUNTIME_TELEMETRY__;
}

export function incrementRuntimeCounter(name: string, delta: number = 1): void {
  const store = getStore();
  store.counters[name] = (store.counters[name] || 0) + delta;
}

export function recordRuntimeDuration(name: string, ms: number): void {
  const store = getStore();
  const existing = store.durations[name] || {
    count: 0,
    totalMs: 0,
    maxMs: 0,
    lastMs: 0,
  };

  existing.count += 1;
  existing.totalMs += ms;
  existing.maxMs = Math.max(existing.maxMs, ms);
  existing.lastMs = ms;

  store.durations[name] = existing;
}

export function setRuntimeGauge(name: string, value: number): void {
  const store = getStore();
  store.gauges[name] = value;
}

export function setRuntimeGaugeMax(name: string, value: number): void {
  const store = getStore();
  store.gauges[name] = Math.max(store.gauges[name] || 0, value);
}

export function getRuntimeTelemetrySnapshot(): RuntimeTelemetryStore {
  const store = getStore();
  return {
    counters: { ...store.counters },
    durations: { ...store.durations },
    gauges: { ...store.gauges },
  };
}

export function readRuntimeTelemetryForDebug(): RuntimeTelemetryStore {
  return getRuntimeTelemetrySnapshot();
}
