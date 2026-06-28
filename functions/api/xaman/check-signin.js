export async function onRequestGet(context) {
  try {
    const apiKey = context.env.XUMM_API_KEY;
    const apiSecret = context.env.XUMM_API_SECRET;

    if (!apiKey || !apiSecret) {
      return json({
        error: "Missing XUMM_API_KEY or XUMM_API_SECRET environment variables."
      }, 500);
    }

    const url = new URL(context.request.url);
    const uuid = url.searchParams.get("uuid");

    if (!uuid) {
      return json({
        error: "Missing uuid."
      }, 400);
    }

    const xamanResponse = await fetch("https://xumm.app/api/v1/platform/payload/" + encodeURIComponent(uuid), {
      method: "GET",
      headers: {
        "X-API-Key": apiKey,
        "X-API-Secret": apiSecret
      }
    });

    const data = await xamanResponse.json();

    if (!xamanResponse.ok) {
      return json({
        error: "Xaman payload check failed.",
        details: data
      }, xamanResponse.status);
    }

    return json({
      uuid,
      resolved: Boolean(data.meta?.resolved),
      signed: Boolean(data.meta?.signed),
      expired: Boolean(data.meta?.expired),
      cancelled: Boolean(data.meta?.cancelled),
      account: data.response?.account || null
    });

  } catch (error) {
    return json({
      error: error.message || "Unknown server error."
    }, 500);
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    }
  });
}
