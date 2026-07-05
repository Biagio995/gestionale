import { onMounted, onUnmounted, toValue, watch, type MaybeRefOrGetter } from 'vue';

type PollingOptions = {
  intervalMs: number;
  enabled?: MaybeRefOrGetter<boolean>;
};

export function usePolling(
  callback: () => void | Promise<void>,
  { intervalMs, enabled = true }: PollingOptions,
): void {
  let timer: ReturnType<typeof setInterval> | null = null;

  function tick(): void {
    if (document.visibilityState === 'hidden') return;
    void callback();
  }

  function start(): void {
    stop();
    timer = setInterval(tick, intervalMs);
  }

  function stop(): void {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  function onVisibilityChange(): void {
    if (document.visibilityState === 'visible') {
      void callback();
    }
  }

  onMounted(() => {
    if (toValue(enabled)) start();
    document.addEventListener('visibilitychange', onVisibilityChange);
  });

  onUnmounted(() => {
    stop();
    document.removeEventListener('visibilitychange', onVisibilityChange);
  });

  if (typeof enabled !== 'boolean') {
    watch(
      () => toValue(enabled),
      (active) => {
        if (active) start();
        else stop();
      },
    );
  }
}
