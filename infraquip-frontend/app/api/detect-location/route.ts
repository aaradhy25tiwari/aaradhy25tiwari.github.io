import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get("lat");
  const lon = searchParams.get("lon");

  // 1. If coordinates are provided by client browser GPS -> Reverse Geocode
  if (lat && lon) {
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);

    if (!isNaN(latitude) && !isNaN(longitude)) {
      // Try OpenStreetMap Nominatim
      try {
        const nomRes = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`,
          {
            signal: AbortSignal.timeout(5000),
            headers: {
              "User-Agent": "InfraQuip-Location/1.0 (support@infraquip.in)",
              "Accept": "application/json",
            },
          }
        );

        if (nomRes.ok) {
          const data = await nomRes.json();
          const addr = data.address || {};
          // Prioritize official District / State District over local village/suburb/colony
          const rawDistrict = (
            addr.state_district ||
            addr.district ||
            addr.county ||
            addr.city ||
            addr.town ||
            ""
          )
            .replace(/\s+district$/i, "")
            .replace(/\s+zila$/i, "")
            .trim()
            .slice(0, 40);

          const state = (addr.state || "").trim().slice(0, 40);
          const postcode = (addr.postcode || "").trim();

          if (rawDistrict || state) {
            return NextResponse.json({
              success: true,
              source: "gps_district",
              city: rawDistrict || state,
              district: rawDistrict || state,
              state: state || rawDistrict,
              pincode: postcode || undefined,
            });
          }
        }
      } catch {
        /* Fall through to IP detection */
      }
    }
  }

  // 2. IP-based Geolocation Detection
  // Extract client IP if present in headers
  const forwardedFor = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const cfIp = request.headers.get("cf-connecting-ip");

  let clientIp = cfIp || (forwardedFor ? forwardedFor.split(",")[0].trim() : realIp) || "";
  if (clientIp === "127.0.0.1" || clientIp === "::1" || clientIp.startsWith("192.168.") || clientIp.startsWith("10.")) {
    clientIp = ""; // Let remote provider detect outgoing public IP
  }

  // Provider A: ipwho.is
  try {
    const url = clientIp ? `https://ipwho.is/${clientIp}` : "https://ipwho.is/";
    const res = await fetch(url, {
      signal: AbortSignal.timeout(5000),
      headers: { "Accept": "application/json" },
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success !== false && (data.city || data.region)) {
        const city = (data.city || data.region || "").trim().slice(0, 40);
        const state = (data.region || data.region_code || "").trim().slice(0, 40);
        const postal = (data.postal || "").trim();
        return NextResponse.json({
          success: true,
          source: "ip_ipwho",
          city,
          state,
          pincode: postal || undefined,
          latitude: data.latitude,
          longitude: data.longitude,
        });
      }
    }
  } catch {
    /* Fallback to Provider B */
  }

  // Provider B: ip-api.com
  try {
    const url = clientIp ? `http://ip-api.com/json/${clientIp}` : "http://ip-api.com/json/";
    const res = await fetch(url, {
      signal: AbortSignal.timeout(5000),
      headers: { "Accept": "application/json" },
    });

    if (res.ok) {
      const data = await res.json();
      if (data.status === "success" && (data.city || data.regionName)) {
        const city = (data.city || data.regionName || "").trim().slice(0, 40);
        const state = (data.regionName || "").trim().slice(0, 40);
        const postal = (data.zip || "").trim();
        return NextResponse.json({
          success: true,
          source: "ip_ipapi",
          city,
          state,
          pincode: postal || undefined,
          latitude: data.lat,
          longitude: data.lon,
        });
      }
    }
  } catch {
    /* All failed */
  }

  return NextResponse.json(
    { success: false, error: "Could not detect location. Please enter city and state manually." },
    { status: 404 }
  );
}
