// Vendored from rfs-internal/ai-bob-vm at 1469772. Keep this file byte-aligned
// with the upstream action body when refreshing the integration.
import { appendFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

export function actionInputs(env) {
  const origin = env.BOB_LAUNCHER_URL?.replace(/\/$/, "");
  if (!["https://bob.ai.rfsmart.com", "https://bob-stage.ai.rfsmart.com"].includes(origin)) {
    throw new Error("launcher-url must be the production or stage Bob origin");
  }
  const operation = env.BOB_OPERATION;
  if (!["launch", "get", "terminate"].includes(operation))
    throw new Error("operation must be launch, get, or terminate");
  const key = env.BOB_ENVIRONMENT_KEY;
  if (!key || key.length > 160 || !/^[A-Za-z0-9][A-Za-z0-9._:/-]*$/.test(key))
    throw new Error("invalid environment-key");
  const integer = (name, min, max) => {
    if (!/^\d+$/.test(env[name] ?? "")) throw new Error(`${name} must be an integer`);
    const value = Number(env[name]);
    if (value < min || value > max) throw new Error(`${name} must be ${min}-${max}`);
    return value;
  };
  const inactivityTimeoutMinutes = integer("BOB_INACTIVITY_MINUTES", 1, 480);
  const waitMinutes = integer("BOB_WAIT_MINUTES", 1, 30);
  if (!env.ACTIONS_ID_TOKEN_REQUEST_URL || !env.ACTIONS_ID_TOKEN_REQUEST_TOKEN) {
    throw new Error("Bob environments require permissions: id-token: write");
  }
  return { origin, operation, environmentKey: key, inactivityTimeoutMinutes, waitMinutes };
}

export async function runEnvironment(
  env,
  {
    fetch: request = globalThis.fetch,
    sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    now = Date.now,
    output = (key, value) =>
      appendFileSync(env.GITHUB_OUTPUT, `${key}=${String(value).replace(/[\r\n]/g, "")}\n`),
  } = {},
) {
  const input = actionInputs(env);
  const deadline = now() + input.waitMinutes * 60_000;
  const oidcUrl = new URL(env.ACTIONS_ID_TOKEN_REQUEST_URL);
  oidcUrl.searchParams.set("audience", "bob-environments");
  const call = async (operation, sessionId) => {
    for (;;) {
      const auth = await request(oidcUrl, {
        headers: { Authorization: `Bearer ${env.ACTIONS_ID_TOKEN_REQUEST_TOKEN}` },
        signal: AbortSignal.timeout(20_000),
        redirect: "error",
      });
      if (!auth.ok) throw new Error(`GitHub OIDC request failed (${auth.status})`);
      const { value: token } = await auth.json();
      if (typeof token !== "string" || !token)
        throw new Error("GitHub did not return an OIDC token");
      const response = await request(`${input.origin}/api/github-environments`, {
        method: "POST",
        redirect: "error",
        signal: AbortSignal.timeout(60_000),
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          operation,
          environmentKey: input.environmentKey,
          inactivityTimeoutMinutes: input.inactivityTimeoutMinutes,
          ...(sessionId ? { sessionId } : {}),
        }),
      }).catch(() => null);
      if (!response) {
        if (now() + 10_000 < deadline) {
          await sleep(10_000);
          continue;
        }
        throw new Error("Bob request timed out or lost its connection");
      }
      let result;
      try {
        result = await response.json();
      } catch {
        if (response.status >= 500 && now() + 10_000 < deadline) {
          await sleep(10_000);
          continue;
        }
        throw new Error(`Bob returned non-JSON (${response.status}); check launcher reachability`);
      }
      if (response.ok) return result;
      const retryable =
        response.status === 429 ||
        response.status >= 500 ||
        (response.status === 409 && result.error?.includes("retry shortly"));
      if (retryable && now() + 10_000 < deadline) {
        await sleep(10_000);
        continue;
      }
      throw new Error(
        `Bob ${response.status}: ${String(result.error ?? "request failed").replace(/[\r\n]/g, " ")}`,
      );
    }
  };
  let result;
  let sessionId;
  try {
    result = await call(input.operation);
    sessionId = result.sessionId;
    if (sessionId) output("session-id", sessionId);
    if (input.operation === "launch") {
      if (!sessionId) throw new Error("Bob launch returned no session id");
      while (!result.ready) {
        if (["failed", "terminated", "not-found"].includes(result.status))
          throw new Error(`Bob preview ${result.status} at ${result.bootStage ?? "boot"}`);
        if (now() >= deadline)
          throw new Error(`Timed out after ${input.waitMinutes} minutes waiting for the app`);
        await sleep(10_000);
        result = await call("get", sessionId);
      }
      if (!result.appUrl) throw new Error("Bob reported ready without an application URL");
    }
    for (const [key, field] of [
      ["app-url", "appUrl"],
      ["environment-url", "environmentUrl"],
      ["edit-url", "editUrl"],
      ["status", "status"],
    ])
      output(key, result[field] ?? "");
    return result;
  } catch (error) {
    // Compare-and-terminate only this VM. A newer workflow may already have
    // replaced it; failed cleanup must never kill that replacement.
    if (input.operation === "launch" && sessionId) {
      try {
        await call("terminate", sessionId);
      } catch {
        /* AWS's eight-hour lifetime remains the final backstop. */
      }
    }
    throw error;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runEnvironment(process.env).catch((error) => {
    console.error(`Bob environment failed: ${String(error.message).replace(/[\r\n]/g, " ")}`);
    process.exitCode = 1;
  });
}
