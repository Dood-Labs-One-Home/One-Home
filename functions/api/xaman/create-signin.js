export async function onRequestPost(context) {
  try {
    const apiKey = context.env.XUMM_API_KEY;
    const apiSecret = context.env.XUMM_API_SECRET;

    if (!apiKey || !apiSecret) {
      return json({
        error: "Missing XUMM_API_KEY or XUMM_API_SECRET environment variables."
      }, 500);
    }

    const payload = {
      txjson: {
        TransactionType: "SignIn"
      },
      options: {
        submit: false,
        expire: 5,
        return_url: {
          app: context.request.headers.get("Referer") || "https://xaman.app",
          web: context.request.headers.get("Referer") || "https://xaman.app"
        }
      },
      custom_meta: {
        instruction: "Sign in to HORDE Yard",
        blob: {
          app: "HORDE Yard",
          purpose: "Wallet connection"
        }
      }
    };

    const xamanResponse = await fetch("https://xumm.app/api/v1/platform/payload", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
        "X-API-Secret": apiSecret
      },
      body: JSON.stringify(payload)
    });

    const data = await xamanResponse.json();

    if (!xamanResponse.ok) {
      return json({
        error: "Xaman payload creation failed.",
        details: data
      }, xamanResponse.status);
    }

    return json({
      uuid: data.uuid,
      qr_png: data.refs?.qr_png,
      qr_matrix: data.refs?.qr_matrix,
      next: data.next?.always
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
