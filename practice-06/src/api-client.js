export class ApiError extends Error {
  constructor(message, {
    kind,
    status = null,
    code = null,
    details = null,
    url = null,
    cause,
  } = {}) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = "ApiError";
    this.kind = kind;
    this.status = status;
    this.code = code;
    this.details = details;
    this.url = url;
  }
}

const ALLOWED_METHODS = new Set(["GET", "POST", "PATCH", "DELETE"]);

function parseBaseUrl(baseUrl) {
  if (typeof baseUrl !== "string" || baseUrl.trim() === "") {
    throw new TypeError("baseUrl должен быть непустой строкой.");
  }
  let parsed;
  try {
    parsed = new URL(baseUrl);
  } catch (error) {
    throw new TypeError("baseUrl должен быть абсолютным адресом.", { cause: error });
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new TypeError("baseUrl должен использовать схему http или https.");
  }
  if (parsed.search !== "" || parsed.hash !== "") {
    throw new TypeError("baseUrl не должен содержать query или hash.");
  }
  return parsed;
}

// Соединяет абсолютный baseUrl, путь и непустые query-параметры.
export function buildUrl(baseUrl, path, query = {}) {
  const base = parseBaseUrl(baseUrl);
  if (typeof path !== "string" || path.trim() === "") {
    throw new TypeError("path должен быть непустой строкой.");
  }
  if (/^[a-z][a-z0-9+.-]*:/i.test(path) || path.startsWith("//")) {
    throw new TypeError("path должен быть относительным путём.");
  }
  if (query === null || typeof query !== "object" || Array.isArray(query)) {
    throw new TypeError("query должен быть обычным объектом.");
  }

  const basePath = base.pathname.replace(/\/+$/, "");
  const relativePath = path.replace(/^\/+/, "");
  const url = new URL(base.origin);
  url.pathname = `${basePath}/${relativePath}`;

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    // undefined, null и пустая строка пропускаются; false и 0 сохраняются.
    if (value === undefined || value === null || value === "") continue;
    params.append(key, String(value));
  }
  url.search = params.toString();
  return url.toString();
}

function isPositiveSafeInteger(value) {
  return Number.isSafeInteger(value) && value > 0;
}

function isJsonContentType(contentType) {
  if (typeof contentType !== "string") return false;
  const mediaType = contentType.split(";")[0].trim().toLowerCase();
  return mediaType === "application/json" || /^application\/[\w.+-]+\+json$/.test(mediaType);
}

// Разбирает отказ fetch: отмена, тайм-аут или сетевая ошибка.
function classifyFailure(error, { externalSignal, timeoutSignal, timeoutMs, url }) {
  if (externalSignal?.aborted) {
    return new ApiError("Запрос отменён.", { kind: "aborted", url, cause: error });
  }
  if (timeoutSignal.aborted) {
    return new ApiError(`Превышено время ожидания ответа (${timeoutMs} мс).`, {
      kind: "timeout",
      url,
      cause: error,
    });
  }
  return new ApiError(`Сетевая ошибка: ${error?.message ?? String(error)}`, {
    kind: "network",
    url,
    cause: error,
  });
}

// requestJson(path, { method, query, body, signal, timeoutMs } = {})
// поддерживает GET, POST, PATCH и DELETE; ответ 204 преобразуется в null.
export function createApiClient({
  baseUrl,
  fetchFn = globalThis.fetch,
  timeoutMs = 3000,
} = {}) {
  const base = parseBaseUrl(baseUrl);
  if (typeof fetchFn !== "function") {
    throw new TypeError("fetchFn должен быть функцией.");
  }
  if (!isPositiveSafeInteger(timeoutMs)) {
    throw new TypeError("timeoutMs должен быть положительным целым числом.");
  }
  const normalizedBase = base.toString();

  async function requestJson(path, {
    method = "GET",
    query,
    body,
    signal,
    timeoutMs: requestTimeout,
  } = {}) {
    const verb = String(method).toUpperCase();
    if (!ALLOWED_METHODS.has(verb)) {
      throw new TypeError(`Метод ${verb} не поддерживается.`);
    }
    if (verb === "GET" && body !== undefined) {
      throw new TypeError("GET-запрос не должен содержать body.");
    }
    const limit = requestTimeout ?? timeoutMs;
    if (!isPositiveSafeInteger(limit)) {
      throw new TypeError("timeoutMs запроса должен быть положительным целым числом.");
    }
    const url = buildUrl(normalizedBase, path, query ?? {});

    // Accept добавляется всегда; Content-Type — только вместе с телом.
    const headers = { Accept: "application/json" };
    const init = { method: verb, headers };
    if (body !== undefined) {
      headers["Content-Type"] = "application/json";
      init.body = JSON.stringify(body);
    }

    const timeoutSignal = AbortSignal.timeout(limit);
    init.signal = signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal;
    const context = { externalSignal: signal, timeoutSignal, timeoutMs: limit, url };

    let response;
    try {
      response = await fetchFn(url, init);
    } catch (error) {
      throw classifyFailure(error, context);
    }

    if (!(response instanceof Response)) {
      throw new ApiError("fetch вернул значение, не являющееся Response.", {
        kind: "invalid-response",
        url,
      });
    }

    // Сначала обрабатывается HTTP-ошибка, затем формат успешного ответа.
    if (!response.ok) {
      let payload = null;
      try {
        if (isJsonContentType(response.headers.get("content-type"))) {
          payload = JSON.parse(await response.text());
        }
      } catch {
        payload = null;
      }
      const apiError = payload?.error;
      const message = typeof apiError?.message === "string" && apiError.message !== ""
        ? apiError.message
        : `Сервер вернул HTTP ${response.status}.`;
      throw new ApiError(message, {
        kind: "http",
        status: response.status,
        code: typeof apiError?.code === "string" ? apiError.code : null,
        details: apiError?.details ?? null,
        url,
      });
    }

    // Ответ 204 не содержит тела: JSON не читается.
    if (response.status === 204) {
      return null;
    }

    if (!isJsonContentType(response.headers.get("content-type"))) {
      throw new ApiError("Ответ сервера не содержит JSON (неверный Content-Type).", {
        kind: "invalid-response",
        status: response.status,
        url,
      });
    }

    let text;
    try {
      text = await response.text();
    } catch (error) {
      throw classifyFailure(error, context);
    }

    try {
      return JSON.parse(text);
    } catch (error) {
      throw new ApiError("Не удалось разобрать JSON ответа сервера.", {
        kind: "invalid-response",
        status: response.status,
        url,
        cause: error,
      });
    }
  }

  return { requestJson };
}
