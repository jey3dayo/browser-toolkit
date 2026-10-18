import { Result } from "@praha/byethrow";
import { describe, expect, it, vi } from "vitest";
import { persistWithRollback } from "@/popup/utils/persist";

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
};

function createDeferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolveFn) => {
    resolve = resolveFn;
  });
  return { promise, resolve };
}

describe("persistWithRollback (characterization)", () => {
  it("applies next, notifies success and does not roll back when persist succeeds", async () => {
    const applyNext = vi.fn();
    const rollback = vi.fn();
    const onSuccess = vi.fn();
    const onFailure = vi.fn();

    const result = await persistWithRollback({
      applyNext,
      onFailure,
      onSuccess,
      persist: async () => Result.succeed(),
      rollback,
    });

    expect(applyNext).toHaveBeenCalledTimes(1);
    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(rollback).not.toHaveBeenCalled();
    expect(onFailure).not.toHaveBeenCalled();
    expect(result).toBe(true);
  });

  it("rolls back and notifies failure when persist fails", async () => {
    const applyNext = vi.fn();
    const rollback = vi.fn();
    const onSuccess = vi.fn();
    const onFailure = vi.fn();

    const result = await persistWithRollback({
      applyNext,
      onFailure,
      onSuccess,
      persist: async () => Result.fail("save failed"),
      rollback,
    });

    expect(applyNext).toHaveBeenCalledTimes(1);
    expect(rollback).toHaveBeenCalledTimes(1);
    expect(onFailure).toHaveBeenCalledTimes(1);
    expect(onSuccess).not.toHaveBeenCalled();
    expect(result).toBe(false);
  });

  it("processes a re-entrant call independently while a persist is still in flight", async () => {
    const applications: string[] = [];
    const firstRollback = vi.fn();
    const firstOnFailure = vi.fn();
    const firstOnSuccess = vi.fn();
    const secondRollback = vi.fn();
    const secondOnFailure = vi.fn();
    const secondOnSuccess = vi.fn();
    const persistCalls: string[] = [];
    const deferred = createDeferred<Result.Result<void, string>>();

    const first = persistWithRollback({
      applyNext: () => {
        applications.push("first");
      },
      onFailure: firstOnFailure,
      onSuccess: firstOnSuccess,
      persist: () => {
        persistCalls.push("first");
        return deferred.promise;
      },
      rollback: firstRollback,
    });

    const second = persistWithRollback({
      applyNext: () => {
        applications.push("second");
      },
      onFailure: secondOnFailure,
      onSuccess: secondOnSuccess,
      persist: () => {
        persistCalls.push("second");
        return Promise.resolve(Result.succeed());
      },
      rollback: secondRollback,
    });

    expect(applications).toEqual(["first", "second"]);
    expect(persistCalls).toEqual(["first", "second"]);

    deferred.resolve(Result.fail("save failed"));
    const [firstResult, secondResult] = await Promise.all([first, second]);

    expect(firstResult).toBe(false);
    expect(firstRollback).toHaveBeenCalledTimes(1);
    expect(firstOnFailure).toHaveBeenCalledTimes(1);
    expect(firstOnSuccess).not.toHaveBeenCalled();
    expect(secondResult).toBe(true);
    expect(secondOnSuccess).toHaveBeenCalledTimes(1);
    expect(secondRollback).not.toHaveBeenCalled();
    expect(secondOnFailure).not.toHaveBeenCalled();
  });
});
