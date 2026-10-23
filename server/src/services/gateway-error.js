export class GatewayError extends Error {
  constructor(message, { cause, response } = {}) {
    super(message, { cause });
    this.response = response;
  }
}

export async function fetchJson(url, options = {}) {
  let response;
  try {
    response = await fetch(url, { ...options, signal: AbortSignal.timeout(options.timeoutMs ?? 20000) });
  } catch (error) {
    throw new GatewayError(`Could not reach payment provider (${error.name})`, { cause: error });
  }
  const text = await response.text();
  let body;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { raw: text };
  }
  return { ok: response.ok, status: response.status, body };
}
