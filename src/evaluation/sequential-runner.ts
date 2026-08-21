export interface SequentialCase<TInput, TResult> {
  input: TInput;
  model: string;
}

export interface SequentialResult<TInput, TResult> {
  input: TInput;
  model: string;
  result?: TResult;
  error?: string;
}

export interface SequentialRunnerOptions<TInput, TResult> {
  cases: readonly SequentialCase<TInput, TResult>[];
  insert: (input: TInput) => string;
  waitForTerminal: (id: string, timeoutMs: number) => Promise<TResult>;
  timeoutMs: number;
}

export async function runSequential<TInput, TResult>(options: SequentialRunnerOptions<TInput, TResult>): Promise<SequentialResult<TInput, TResult>[]> {
  const results: SequentialResult<TInput, TResult>[] = [];
  for (const testCase of options.cases) {
    const id = options.insert(testCase.input);
    try {
      results.push({ input: testCase.input, model: testCase.model, result: await options.waitForTerminal(id, options.timeoutMs) });
    } catch (error) {
      results.push({ input: testCase.input, model: testCase.model, error: error instanceof Error ? error.message : String(error) });
    }
  }
  return results;
}
