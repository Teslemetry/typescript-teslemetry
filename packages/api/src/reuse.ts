export const reuse = (linger: number = 0) => {
  let promise: Promise<any> | null = null;

  return async <U>(func: () => Promise<U>) => {
    if (promise) return promise;
    try {
      promise = func();
      return await promise;
    } finally {
      setTimeout(() => (promise = null), linger);
    }
  };
};
