import { NextRequest, NextResponse } from "next/server";

// In-memory cache for fast subsequent pincode lookups
const pincodeCache = new Map<string, { city: string; state: string; district?: string }>();

// Indian state 2-digit prefix lookup fallback
const PIN_PREFIX_STATE_MAP: Record<string, string> = {
  "11": "Delhi",
  "12": "Haryana",
  "13": "Haryana",
  "14": "Punjab",
  "15": "Punjab",
  "16": "Chandigarh",
  "17": "Himachal Pradesh",
  "18": "Jammu and Kashmir",
  "19": "Jammu and Kashmir",
  "20": "Uttar Pradesh",
  "21": "Uttar Pradesh",
  "22": "Uttar Pradesh",
  "23": "Uttar Pradesh",
  "24": "Uttarakhand",
  "25": "Uttar Pradesh",
  "26": "Uttar Pradesh",
  "27": "Uttar Pradesh",
  "28": "Uttar Pradesh",
  "30": "Rajasthan",
  "31": "Rajasthan",
  "32": "Rajasthan",
  "33": "Rajasthan",
  "34": "Rajasthan",
  "36": "Gujarat",
  "37": "Gujarat",
  "38": "Gujarat",
  "39": "Gujarat",
  "40": "Maharashtra",
  "41": "Maharashtra",
  "42": "Maharashtra",
  "43": "Maharashtra",
  "44": "Maharashtra",
  "45": "Madhya Pradesh",
  "46": "Madhya Pradesh",
  "47": "Madhya Pradesh",
  "48": "Madhya Pradesh",
  "49": "Chhattisgarh",
  "50": "Telangana",
  "51": "Andhra Pradesh",
  "52": "Andhra Pradesh",
  "53": "Andhra Pradesh",
  "56": "Karnataka",
  "57": "Karnataka",
  "58": "Karnataka",
  "59": "Karnataka",
  "60": "Tamil Nadu",
  "61": "Tamil Nadu",
  "62": "Tamil Nadu",
  "63": "Tamil Nadu",
  "64": "Tamil Nadu",
  "67": "Kerala",
  "68": "Kerala",
  "69": "Kerala",
  "70": "West Bengal",
  "71": "West Bengal",
  "72": "West Bengal",
  "73": "West Bengal",
  "74": "West Bengal",
  "75": "Odisha",
  "76": "Odisha",
  "77": "Odisha",
  "78": "Assam",
  "79": "North East",
  "80": "Bihar",
  "81": "Bihar",
  "82": "Jharkhand",
  "83": "Jharkhand",
  "84": "Bihar",
  "85": "Bihar",
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ pin: string }> }
) {
  const { pin } = await params;
  const cleanPin = (pin || "").trim();

  if (!/^\d{6}$/.test(cleanPin)) {
    return NextResponse.json(
      { success: false, error: "Invalid PIN code. Must be exactly 6 digits." },
      { status: 400 }
    );
  }

  // 1. Check in-memory cache
  if (pincodeCache.has(cleanPin)) {
    const cached = pincodeCache.get(cleanPin)!;
    return NextResponse.json({ success: true, ...cached, pincode: cleanPin });
  }

  // 2. Try India Post API (api.postalpincode.in)
  try {
    const res = await fetch(`https://api.postalpincode.in/pincode/${cleanPin}`, {
      signal: AbortSignal.timeout(6000),
      headers: { "Accept": "application/json" },
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data[0]?.Status === "Success" && data[0]?.PostOffice?.length > 0) {
        const offices = data[0].PostOffice;
        // Prefer Sub Post Office or Head Post Office or first office
        const po = offices.find((o: { BranchType?: string }) => o.BranchType?.includes("Sub") || o.BranchType?.includes("Head")) || offices[0];
        const rawCity = po.District || po.Block || po.Name || "";
        const rawState = po.State || "";
        const city = rawCity.replace(/\./g, "").trim().slice(0, 40);
        const state = rawState.replace(/\./g, "").trim().slice(0, 40);

        if (city && state) {
          const result = { city, state, district: po.District || undefined };
          pincodeCache.set(cleanPin, result);
          return NextResponse.json({ success: true, ...result, pincode: cleanPin });
        }
      }
    }
  } catch {
    /* proceed to next provider */
  }

  // 3. Try OpenStreetMap Nominatim with User-Agent
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?postalcode=${cleanPin}&country=India&format=json&addressdetails=1`,
      {
        signal: AbortSignal.timeout(5000),
        headers: {
          "User-Agent": "InfraQuip-App/1.0 (support@infraquip.in)",
          "Accept": "application/json",
        },
      }
    );
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const addr = data[0].address || {};
        const city = (
          addr.city ||
          addr.town ||
          addr.city_district ||
          addr.district ||
          addr.county ||
          addr.state_district ||
          ""
        ).trim().slice(0, 40);
        const state = (addr.state || "").trim().slice(0, 40);

        if (city && state) {
          const result = { city, state, district: addr.state_district || addr.district };
          pincodeCache.set(cleanPin, result);
          return NextResponse.json({ success: true, ...result, pincode: cleanPin });
        }
      }
    }
  } catch {
    /* proceed to next provider */
  }

  // 4. Try Zippopotam
  try {
    const res = await fetch(`https://api.zippopotam.us/in/${cleanPin}`, {
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.places && data.places.length > 0) {
        const place = data.places[0];
        const city = (place["place name"] || "").trim().slice(0, 40);
        const state = (place["state"] || "").trim().slice(0, 40);
        if (city && state) {
          const result = { city, state };
          pincodeCache.set(cleanPin, result);
          return NextResponse.json({ success: true, ...result, pincode: cleanPin });
        }
      }
    }
  } catch {
    /* proceed */
  }

  // 5. Fallback using 2-digit PIN prefix state map if known
  const prefix = cleanPin.slice(0, 2);
  const fallbackState = PIN_PREFIX_STATE_MAP[prefix];
  if (fallbackState) {
    const result = { city: fallbackState, state: fallbackState };
    return NextResponse.json({ success: true, ...result, pincode: cleanPin, isEstimated: true });
  }

  return NextResponse.json(
    { success: false, error: "Pincode not found. Please enter city and state manually." },
    { status: 404 }
  );
}
