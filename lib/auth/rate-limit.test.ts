import { describe, expect, it } from "vitest";
import { exceedsAttemptLimit, LOGIN_MAX_ATTEMPTS } from "./rate-limit";

describe("exceedsAttemptLimit", () => {
  it("libera abaixo do limite", () => {
    expect(exceedsAttemptLimit(LOGIN_MAX_ATTEMPTS - 1)).toBe(false);
  });

  it("bloqueia no limite e acima", () => {
    expect(exceedsAttemptLimit(LOGIN_MAX_ATTEMPTS)).toBe(true);
    expect(exceedsAttemptLimit(LOGIN_MAX_ATTEMPTS + 3)).toBe(true);
  });

  it("aceita limite customizado", () => {
    expect(exceedsAttemptLimit(10, 20)).toBe(false);
  });
});
