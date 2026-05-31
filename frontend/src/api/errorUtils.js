export function getApiErrorMessage(error, fallback = "No se pudo completar la operacion.") {
  const payload = error?.response?.data?.error;
  if (!payload) return fallback;

  const details = payload.details;
  if (details && typeof details === "object") {
    const firstKey = Object.keys(details)[0];
    const firstValue = details[firstKey];
    if (Array.isArray(firstValue) && firstValue.length > 0) {
      return firstValue[0];
    }
    if (typeof firstValue === "string") {
      return firstValue;
    }
  }

  return payload.message || fallback;
}

