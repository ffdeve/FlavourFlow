// ─── IP Geolocation Service ──────────────────────────────────────────────
// Detects the user's country from their IP address using a free API.
// Used as a supplementary signal alongside onboarding preferences.

const GEOLOCATION_API = "https://ipapi.co/json/";

interface GeoLocation {
  country_code: string;   // e.g. "PK"
  country_name: string;   // e.g. "Pakistan"
  city: string;           // e.g. "Lahore"
  region: string;         // e.g. "Punjab"
}

let cachedLocation: GeoLocation | null = null;

/**
 * Detect the user's country from their IP address.
 * Results are cached for the session to avoid repeated API calls.
 */
export async function detectUserCountry(): Promise<GeoLocation | null> {
  if (cachedLocation) return cachedLocation;

  try {
    const response = await fetch(GEOLOCATION_API, {
      method: "GET",
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      console.warn("Geolocation API returned status:", response.status);
      return null;
    }

    const data = await response.json();

    cachedLocation = {
      country_code: data.country_code || "PK",
      country_name: data.country_name || "Pakistan",
      city: data.city || "",
      region: data.region || "",
    };

    return cachedLocation;
  } catch (error) {
    console.warn("Failed to detect user country from IP:", error);
    // Fallback to Pakistan
    return {
      country_code: "PK",
      country_name: "Pakistan",
      city: "",
      region: "",
    };
  }
}

/**
 * Clear the cached location (e.g., on logout or VPN change)
 */
export function clearLocationCache() {
  cachedLocation = null;
}
