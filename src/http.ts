import { CONFIG, USER_AGENT } from "./config.ts";

export class HttpError extends Error {
  constructor(
    public status: number,
    public url: string,
    public bodyHead: string,
  ) {
    super(`HTTP ${status} ${url} :: ${bodyHead.slice(0, 120).replace(/\s+/g, " ")}`);
  }
}

export type FetchOpts = {
  method?: "GET" | "POST";
  headers?: Record<string, string>;
  body?: string;
  timeoutMs?: number;
  retries?: number;
  /** Delay between retries; doubles each attempt. */
  backoffMs?: number;
  /**
   * "curl" shells out instead of using Node's fetch.
   *
   * ⚠️ This is not a style choice, it is a MEASUREMENT. Some sites behind
   * Cloudflare (Gradcracker is the one that forced this) answer curl with 200
   * and Node with a 403 "Just a moment…" challenge page — for the SAME URL,
   * seconds apart, from the same IP, with byte-identical browser headers.
   * Header spoofing does not fix it, because what is being fingerprinted is the
   * TLS/HTTP client itself, not the headers. curl is present on GitHub-hosted
   * runners, so routing those few sources through it is the honest fix.
   */
  client?: "fetch" | "curl";
};

/** fetch with a browser UA, timeout and small retry. Throws HttpError on non-2xx. */
/** Fetch through the curl binary. See FetchOpts.client for why this exists. */
async function curlText(url: string, opts: FetchOpts): Promise<string> {
  const { execFile } = await import("node:child_process");
  const { promisify } = await import("node:util");
  const run = promisify(execFile);
  const args = [
    "-sS",
    "-L",
    "--compressed",
    "--max-time",
    String(Math.ceil((opts.timeoutMs ?? CONFIG.fetchTimeoutMs) / 1000)),
    "-A",
    USER_AGENT,
    "-w",
    "\n__HTTP_STATUS__%{http_code}",
  ];
  // The AV on the Windows dev box intercepts TLS; CI does not need this.
  if (process.env.NODE_TLS_REJECT_UNAUTHORIZED === "0") args.push("-k");
  for (const [k, v] of Object.entries(opts.headers ?? {})) args.push("-H", `${k}: ${v}`);
  if (opts.method === "POST") {
    args.push("-X", "POST");
    if (opts.body) args.push("--data-binary", opts.body);
  }
  args.push(url);

  const { stdout } = await run("curl", args, { maxBuffer: 64 * 1024 * 1024, windowsHide: true });
  const marker = stdout.lastIndexOf("\n__HTTP_STATUS__");
  const status = marker >= 0 ? Number(stdout.slice(marker + 16).trim()) : 0;
  const body = marker >= 0 ? stdout.slice(0, marker) : stdout;
  if (status < 200 || status >= 300) throw new HttpError(status, url, body);
  return body;
}

export async function fetchText(url: string, opts: FetchOpts = {}): Promise<string> {
  if (opts.client === "curl") {
    const retries = opts.retries ?? CONFIG.fetchRetries;
    let wait = opts.backoffMs ?? 1500;
    let lastErr: unknown;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await curlText(url, opts);
      } catch (e) {
        lastErr = e;
        if (e instanceof HttpError && e.status >= 400 && e.status < 500 && e.status !== 429) throw e;
      }
      if (attempt < retries) {
        await sleep(wait);
        wait *= 2;
      }
    }
    throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
  }
  const retries = opts.retries ?? CONFIG.fetchRetries;
  let wait = opts.backoffMs ?? 1500;
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? CONFIG.fetchTimeoutMs);
    try {
      const res = await fetch(url, {
        method: opts.method ?? "GET",
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "application/json, text/html;q=0.9, */*;q=0.8",
          "Accept-Language": "en-GB,en;q=0.9",
          ...(opts.headers ?? {}),
        },
        body: opts.body,
        signal: ctrl.signal,
        redirect: "follow",
      });
      const text = await res.text();
      if (!res.ok) {
        // 4xx (except 429) will not get better on retry.
        if (res.status >= 400 && res.status < 500 && res.status !== 429) throw new HttpError(res.status, url, text);
        lastErr = new HttpError(res.status, url, text);
      } else {
        return text;
      }
    } catch (e) {
      if (e instanceof HttpError && e.status < 500 && e.status !== 429) throw e;
      lastErr = e;
    } finally {
      clearTimeout(timer);
    }
    if (attempt < retries) {
      await sleep(wait);
      wait *= 2;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

export async function fetchJson<T = unknown>(url: string, opts: FetchOpts = {}): Promise<T> {
  const text = await fetchText(url, opts);
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Non-JSON body from ${url}: ${text.slice(0, 100).replace(/\s+/g, " ")}`);
  }
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Run `fn` over `items` with at most `limit` in flight. Never rejects: each result is settled. */
export async function pool<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      try {
        results[i] = { status: "fulfilled", value: await fn(items[i], i) };
      } catch (reason) {
        results[i] = { status: "rejected", reason };
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}
