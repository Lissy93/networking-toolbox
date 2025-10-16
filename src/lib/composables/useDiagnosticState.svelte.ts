/**
 * Common state management for diagnostic/tool pages
 * Replaces the repeated state pattern across 80+ files
 */

export interface DiagnosticState<T = any> {
  loading: boolean;
  error: string | null;
  results: T | null;
}

export function useDiagnosticState<T = any>() {
  let loading = $state(false);
  let error = $state<string | null>(null);
  let results = $state<T | null>(null);

  function setLoading(value: boolean) {
    loading = value;
  }

  function setError(errorMessage: string | null) {
    error = errorMessage;
    loading = false;
  }

  function setResults(data: T | null) {
    results = data;
    error = null;
    loading = false;
  }

  function reset() {
    loading = false;
    error = null;
    results = null;
  }

  function startOperation() {
    loading = true;
    error = null;
    results = null;
  }

  return {
    get loading() {
      return loading;
    },
    get error() {
      return error;
    },
    get results() {
      return results;
    },
    setLoading,
    setError,
    setResults,
    reset,
    startOperation,
  };
}
