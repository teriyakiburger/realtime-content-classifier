export interface ConcurrencyRunOptions<T> {
  maxCards: number;
  intervalMs: number;
  insert: (input: T) => void;
  inputs: readonly T[];
}

export async function runAtFixedInterval<T>(options: ConcurrencyRunOptions<T>): Promise<number> {
  const count = Math.min(options.maxCards, options.inputs.length);
  for (let index = 0; index < count; index += 1) {
    options.insert(options.inputs[index]);
    if (index < count - 1) await new Promise<void>((resolve) => setTimeout(resolve, options.intervalMs));
  }
  return count;
}
