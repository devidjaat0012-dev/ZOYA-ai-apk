import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  CloudSun,
  Thermometer,
  MapPin,
  RefreshCw,
  Search,
  Wind,
  Droplets,
  X,
  Compass,
  Sparkles,
  ChevronRight,
  ChevronDown,
  Sun,
  ShieldCheck,
  ShieldAlert,
  Info,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export interface WeatherData {
  city: string;
  temperature: number;
  apparentTemperature: number;
  humidity: number;
  windSpeed: number;
  uvIndex: number;
  uvIndexMax?: number;
  weatherCode: number;
  isDay: boolean;
  conditionLabel: string;
  icon: string;
  updatedAt: string;
}

interface AreaTemperaturePillProps {
  onAskZoyaWeather?: (weatherSummary: string) => void;
  className?: string;
}

// Convert WMO Weather Codes to Human Label + Icon
function interpretWmoCode(code: number, isDay: boolean = true): { label: string; icon: string } {
  switch (code) {
    case 0:
      return { label: isDay ? "Clear Sky" : "Clear Night", icon: isDay ? "☀️" : "🌙" };
    case 1:
      return { label: isDay ? "Mainly Clear" : "Clear & Calm", icon: isDay ? "🌤️" : "🌙" };
    case 2:
      return { label: "Partly Cloudy", icon: "⛅" };
    case 3:
      return { label: "Overcast", icon: "☁️" };
    case 45:
    case 48:
      return { label: "Foggy & Hazy", icon: "🌫️" };
    case 51:
    case 53:
    case 55:
      return { label: "Light Drizzle", icon: "🌦️" };
    case 61:
    case 63:
    case 65:
      return { label: "Rainy", icon: "🌧️" };
    case 71:
    case 73:
    case 75:
      return { label: "Snow", icon: "❄️" };
    case 80:
    case 81:
    case 82:
      return { label: "Rain Showers", icon: "🌧️" };
    case 95:
    case 96:
    case 99:
      return { label: "Thunderstorm", icon: "⛈️" };
    default:
      return { label: "Pleasant Weather", icon: "⛅" };
  }
}

// UV Index category helper
function getUvInfo(uv: number): {
  label: string;
  levelColor: string;
  badgeBg: string;
  badgeBorder: string;
  advice: string;
} {
  if (uv <= 2) {
    return {
      label: "Low",
      levelColor: "text-emerald-400",
      badgeBg: "bg-emerald-500/15",
      badgeBorder: "border-emerald-500/30",
      advice: "Safe outside",
    };
  }
  if (uv <= 5) {
    return {
      label: "Moderate",
      levelColor: "text-amber-400",
      badgeBg: "bg-amber-500/15",
      badgeBorder: "border-amber-500/30",
      advice: "Wear sunshade",
    };
  }
  if (uv <= 7) {
    return {
      label: "High",
      levelColor: "text-orange-400",
      badgeBg: "bg-orange-500/15",
      badgeBorder: "border-orange-500/30",
      advice: "Sun protection needed",
    };
  }
  if (uv <= 10) {
    return {
      label: "Very High",
      levelColor: "text-rose-400",
      badgeBg: "bg-rose-500/15",
      badgeBorder: "border-rose-500/30",
      advice: "Avoid midday sun",
    };
  }
  return {
    label: "Extreme",
    levelColor: "text-purple-400",
    badgeBg: "bg-purple-500/15",
    badgeBorder: "border-purple-500/30",
    advice: "Take full precautions",
  };
}

// Humidity category helper
function getHumidityInfo(hum: number): string {
  if (hum < 30) return "Dry";
  if (hum <= 60) return "Comfortable";
  if (hum <= 75) return "Humid";
  return "Very Humid";
}

// Wind speed category helper
function getWindInfo(kmh: number): string {
  if (kmh < 5) return "Calm";
  if (kmh < 12) return "Light Breeze";
  if (kmh < 20) return "Gentle";
  if (kmh < 30) return "Moderate";
  return "Breezy";
}

const PRESET_CITIES = [
  { name: "Delhi", lat: 28.6139, lon: 77.209 },
  { name: "Mumbai", lat: 19.076, lon: 72.8777 },
  { name: "Bengaluru", lat: 12.9716, lon: 77.5946 },
  { name: "Hyderabad", lat: 17.385, lon: 78.4867 },
  { name: "Kolkata", lat: 22.5726, lon: 88.3639 },
  { name: "Jaipur", lat: 26.9124, lon: 75.7873 },
  { name: "Pune", lat: 18.5204, lon: 73.8567 },
  { name: "Lucknow", lat: 26.8467, lon: 80.9462 },
  { name: "Chandigarh", lat: 30.7333, lon: 76.7794 },
  { name: "Ahmedabad", lat: 23.0225, lon: 72.5714 },
];

export default function AreaTemperaturePill({
  onAskZoyaWeather,
  className = "",
}: AreaTemperaturePillProps) {
  const [weather, setWeather] = useState<WeatherData | null>(() => {
    try {
      const cached = localStorage.getItem("zoya_area_weather_cached");
      if (cached) return JSON.parse(cached);
    } catch {}
    return null;
  });

  const [isLoading, setIsLoading] = useState<boolean>(!weather);
  const [isPopoverOpen, setIsPopoverOpen] = useState<boolean>(false);
  const [showLocationPicker, setShowLocationPicker] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchResults, setSearchResults] = useState<
    Array<{ name: string; country: string; admin1?: string; lat: number; lon: number }>
  >([]);
  const [gpsDetecting, setGpsDetecting] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>("");

  const popoverRef = useRef<HTMLDivElement | null>(null);

  // Coordinates ref for refresh
  const currentCoordsRef = useRef<{ lat: number; lon: number; city: string }>({
    lat: 28.6139,
    lon: 77.209,
    city: "Delhi",
  });

  // Fetch weather given lat, lon, and city name (including UV index, humidity, wind)
  const fetchWeatherForLocation = useCallback(
    async (lat: number, lon: number, cityName: string) => {
      setIsLoading(true);
      try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,wind_speed_10m,uv_index&daily=uv_index_max&timezone=auto`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("Failed to fetch weather");
        const data = await res.json();
        const current = data.current;
        const daily = data.daily;

        const { label, icon } = interpretWmoCode(current.weather_code, current.is_day === 1);

        const parsed: WeatherData = {
          city: cityName,
          temperature: Math.round(current.temperature_2m),
          apparentTemperature: Math.round(current.apparent_temperature),
          humidity: Math.round(current.relative_humidity_2m),
          windSpeed: Math.round(current.wind_speed_10m),
          uvIndex: Number((current.uv_index ?? (current.is_day === 1 ? 3.5 : 0)).toFixed(1)),
          uvIndexMax:
            daily?.uv_index_max?.[0] != null
              ? Number(daily.uv_index_max[0].toFixed(1))
              : undefined,
          weatherCode: current.weather_code,
          isDay: current.is_day === 1,
          conditionLabel: label,
          icon,
          updatedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };

        setWeather(parsed);
        currentCoordsRef.current = { lat, lon, city: cityName };

        try {
          localStorage.setItem("zoya_area_weather_cached", JSON.stringify(parsed));
          localStorage.setItem(
            "zoya_saved_location",
            JSON.stringify({ lat, lon, city: cityName })
          );
        } catch {}
      } catch (err) {
        console.warn("Weather fetch fallback:", err);
        // Fallback sensible values if offline
        if (!weather) {
          setWeather({
            city: cityName,
            temperature: 28,
            apparentTemperature: 30,
            humidity: 55,
            windSpeed: 8,
            uvIndex: 4.2,
            uvIndexMax: 5.0,
            weatherCode: 1,
            isDay: true,
            conditionLabel: "Mainly Clear",
            icon: "🌤️",
            updatedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          });
        }
      } finally {
        setIsLoading(false);
      }
    },
    [weather]
  );

  // Reverse geocode lat/lon to friendly city name
  const reverseGeocodeCity = async (lat: number, lon: number): Promise<string> => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
        { headers: { "Accept-Language": "en" } }
      );
      if (res.ok) {
        const data = await res.json();
        const addr = data.address;
        return (
          addr.city ||
          addr.town ||
          addr.suburb ||
          addr.state_district ||
          addr.state ||
          "Local Area"
        );
      }
    } catch {}
    return "Delhi";
  };

  // Attempt Browser Geolocation
  const detectLiveLocation = () => {
    if (!navigator.geolocation) {
      setStatusMessage("Geolocation not supported. Defaulting to Delhi.");
      fetchWeatherForLocation(28.6139, 77.209, "Delhi");
      return;
    }

    setGpsDetecting(true);
    setStatusMessage("Detecting GPS coordinates...");

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        const city = await reverseGeocodeCity(lat, lon);
        setStatusMessage(`Located: ${city}`);
        await fetchWeatherForLocation(lat, lon, city);
        setGpsDetecting(false);
        setTimeout(() => setStatusMessage(""), 2200);
      },
      (err) => {
        console.warn("Geolocation permission skipped or denied:", err.message);
        setGpsDetecting(false);
        setStatusMessage("Using standard area location");
        try {
          const savedLoc = localStorage.getItem("zoya_saved_location");
          if (savedLoc) {
            const parsed = JSON.parse(savedLoc);
            fetchWeatherForLocation(parsed.lat, parsed.lon, parsed.city);
            return;
          }
        } catch {}
        fetchWeatherForLocation(28.6139, 77.209, "Delhi");
      },
      { timeout: 7000, enableHighAccuracy: false }
    );
  };

  // Initial load
  useEffect(() => {
    try {
      const savedLoc = localStorage.getItem("zoya_saved_location");
      if (savedLoc) {
        const parsed = JSON.parse(savedLoc);
        currentCoordsRef.current = parsed;
        fetchWeatherForLocation(parsed.lat, parsed.lon, parsed.city);
        return;
      }
    } catch {}

    detectLiveLocation();
  }, [fetchWeatherForLocation]);

  // Close popover when clicking outside or pressing Escape
  useEffect(() => {
    if (!isPopoverOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsPopoverOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPopoverOpen]);

  // Search Cities via Open-Meteo Geocoding
  const handleSearchCity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const res = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
          searchQuery.trim()
        )}&count=5&language=en&format=json`
      );
      if (res.ok) {
        const data = await res.json();
        if (data.results && data.results.length > 0) {
          setSearchResults(
            data.results.map((r: any) => ({
              name: r.name,
              country: r.country,
              admin1: r.admin1,
              lat: r.latitude,
              lon: r.longitude,
            }))
          );
        } else {
          setSearchResults([]);
          setStatusMessage("No matching city found.");
        }
      }
    } catch {
      setStatusMessage("Search failed. Check connection.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectCity = (c: { name: string; lat: number; lon: number }) => {
    fetchWeatherForLocation(c.lat, c.lon, c.name);
    setShowLocationPicker(false);
    setSearchResults([]);
    setSearchQuery("");
  };

  const uvInfo = getUvInfo(weather?.uvIndex ?? 0);

  return (
    <div ref={popoverRef} className="relative inline-flex items-center">
      {/* ⛅ MAIN CLICKABLE PILL (Positioned strictly between Warm & Maya) */}
      <motion.button
        type="button"
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.96 }}
        onClick={() => setIsPopoverOpen((prev) => !prev)}
        className={`group flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-sky-500/15 via-blue-500/15 to-indigo-500/15 hover:from-sky-500/25 hover:to-indigo-500/25 border border-sky-400/35 hover:border-sky-400/60 text-sky-200 text-xs font-semibold shadow-[0_0_12px_rgba(56,189,248,0.15)] backdrop-blur-md transition-all cursor-pointer select-none ${className} ${
          isPopoverOpen ? "ring-2 ring-sky-400/50 shadow-[0_0_18px_rgba(56,189,248,0.3)]" : ""
        }`}
        title={`Area Temperature: ${weather?.city || "Local Area"} ${
          weather ? `${weather.temperature}°C` : "Loading..."
        } (Click to open detailed weather popover: humidity, wind speed & UV index)`}
      >
        {/* Animated weather indicator icon */}
        <span className="text-sm leading-none drop-shadow-[0_0_6px_rgba(56,189,248,0.5)]">
          {weather?.icon || "⛅"}
        </span>

        {/* Temperature Reading */}
        <span className="font-bold text-white tracking-tight drop-shadow-xs flex items-center gap-0.5">
          {isLoading && !weather ? (
            <RefreshCw size={11} className="animate-spin text-sky-400" />
          ) : (
            `${weather?.temperature ?? 28}°C`
          )}
        </span>

        {/* Separator Dot */}
        <span className="text-sky-400/50 text-[10px]">•</span>

        {/* Area / City Name */}
        <span className="text-sky-200 font-medium max-w-[85px] sm:max-w-[110px] truncate">
          {weather?.city || "Area Temp"}
        </span>

        {/* Small live badge pulse */}
        <span className="relative flex h-1.5 w-1.5 ml-0.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-sky-500" />
        </span>
      </motion.button>

      {/* 🌟 COMPACT DETAILED WEATHER POPOVER (Humidity, Wind Speed & UV Index) */}
      <AnimatePresence>
        {isPopoverOpen && (
          <>
            {/* Backdrop for click-outside dismissal */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={() => setIsPopoverOpen(false)}
              className="fixed inset-0 z-40 bg-black/45 backdrop-blur-[2px]"
            />

            {/* Popover Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 6 }}
              transition={{ type: "spring", duration: 0.22, bounce: 0.12 }}
              className="fixed sm:absolute top-20 sm:top-full left-1/2 -translate-x-1/2 sm:mt-2.5 z-50 w-[calc(100vw-28px)] max-w-sm sm:w-80 bg-[#0b1220]/95 border border-sky-400/40 rounded-2xl p-4 shadow-[0_12px_45px_rgba(0,0,0,0.7),0_0_25px_rgba(56,189,248,0.22)] text-white backdrop-blur-xl overflow-hidden select-none"
            >
              {/* Top ambient arrow on desktop */}
              <div className="hidden sm:block absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-[#0b1220] border-t border-l border-sky-400/40 rotate-45 pointer-events-none" />

              {/* Ambient top light glow */}
              <div className="absolute top-0 inset-x-0 h-20 bg-gradient-to-b from-sky-500/20 via-blue-500/5 to-transparent pointer-events-none" />

              {/* Header: Location & Quick Controls */}
              <div className="flex items-center justify-between pb-2.5 border-b border-white/10 relative z-10">
                <div className="flex items-center gap-1.5 min-w-0">
                  <div className="p-1.5 rounded-lg bg-sky-500/20 text-sky-300 border border-sky-500/30 shrink-0">
                    <MapPin size={13} className="text-sky-400" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-xs text-white truncate max-w-[140px]">
                        {weather?.city || "Local Area"}
                      </span>
                      <span className="text-[9.5px] px-1.5 py-0.2 rounded-full bg-sky-500/20 text-sky-300 font-semibold border border-sky-500/30">
                        Live
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">
                      {weather?.updatedAt ? `Updated ${weather.updatedAt}` : "Open-Meteo"}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() =>
                      fetchWeatherForLocation(
                        currentCoordsRef.current.lat,
                        currentCoordsRef.current.lon,
                        currentCoordsRef.current.city
                      )
                    }
                    className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-sky-300 transition-colors"
                    title="Refresh weather"
                  >
                    <RefreshCw size={13} className={isLoading ? "animate-spin text-sky-400" : ""} />
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsPopoverOpen(false)}
                    className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                    title="Close"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>

              {/* Weather Hero Snapshot */}
              <div className="my-3 p-3 rounded-xl bg-gradient-to-r from-sky-950/40 via-blue-900/20 to-slate-900/40 border border-sky-400/20 flex items-center justify-between relative overflow-hidden">
                <div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-white tracking-tight">
                      {weather?.temperature ?? 28}
                    </span>
                    <span className="text-lg font-light text-sky-300">°C</span>
                    <span className="text-[11px] text-slate-400 font-medium ml-1.5">
                      Feels like {weather?.apparentTemperature ?? 30}°C
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-sky-200 mt-0.5 flex items-center gap-1">
                    <span>{weather?.conditionLabel || "Clear Sky"}</span>
                  </div>
                </div>

                <div className="text-4xl drop-shadow-[0_0_12px_rgba(56,189,248,0.5)] shrink-0">
                  {weather?.icon || "⛅"}
                </div>
              </div>

              {/* 🌟 3 DETAILED VITALS: HUMIDITY, WIND SPEED, UV INDEX */}
              <div className="grid grid-cols-3 gap-2">
                {/* 1. Humidity */}
                <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/10 hover:border-cyan-400/40 transition-colors flex flex-col justify-between">
                  <div className="flex items-center justify-between text-slate-400 text-[10px]">
                    <span>Humidity</span>
                    <Droplets size={12} className="text-cyan-400 shrink-0" />
                  </div>
                  <div className="mt-1">
                    <div className="text-base font-bold text-white tracking-tight">
                      {weather?.humidity ?? 60}%
                    </div>
                    <div className="text-[9.5px] font-medium text-cyan-300/90 truncate mt-0.5">
                      {getHumidityInfo(weather?.humidity ?? 60)}
                    </div>
                  </div>
                </div>

                {/* 2. Wind Speed */}
                <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/10 hover:border-sky-400/40 transition-colors flex flex-col justify-between">
                  <div className="flex items-center justify-between text-slate-400 text-[10px]">
                    <span>Wind</span>
                    <Wind size={12} className="text-sky-400 shrink-0" />
                  </div>
                  <div className="mt-1">
                    <div className="text-base font-bold text-white tracking-tight flex items-baseline gap-0.5">
                      <span>{weather?.windSpeed ?? 6}</span>
                      <span className="text-[9px] font-normal text-slate-400">km/h</span>
                    </div>
                    <div className="text-[9.5px] font-medium text-sky-300/90 truncate mt-0.5">
                      {getWindInfo(weather?.windSpeed ?? 6)}
                    </div>
                  </div>
                </div>

                {/* 3. UV Index */}
                <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/10 hover:border-amber-400/40 transition-colors flex flex-col justify-between">
                  <div className="flex items-center justify-between text-slate-400 text-[10px]">
                    <span>UV Index</span>
                    <Sun size={12} className="text-amber-400 shrink-0" />
                  </div>
                  <div className="mt-1">
                    <div className="text-base font-bold text-white tracking-tight flex items-baseline gap-1">
                      <span>{weather?.uvIndex ?? 0}</span>
                      {weather?.uvIndexMax != null && weather.uvIndexMax > (weather.uvIndex ?? 0) && (
                        <span className="text-[9px] text-slate-400 font-normal">
                          / {weather.uvIndexMax}
                        </span>
                      )}
                    </div>
                    <div
                      className={`text-[9.5px] font-bold ${uvInfo.levelColor} truncate mt-0.5`}
                      title={uvInfo.advice}
                    >
                      {uvInfo.label}
                    </div>
                  </div>
                </div>
              </div>

              {/* Status Notice */}
              {statusMessage && (
                <div className="mt-2.5 px-2.5 py-1 rounded-lg bg-sky-500/15 border border-sky-500/30 text-[10.5px] text-sky-200 text-center animate-pulse">
                  {statusMessage}
                </div>
              )}

              {/* Quick Action Footer: Ask Zoya & Change Area */}
              <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    if (weather && onAskZoyaWeather) {
                      onAskZoyaWeather(
                        `Area: ${weather.city}, Temperature: ${weather.temperature}°C (Feels like ${weather.apparentTemperature}°C), Humidity: ${weather.humidity}%, Wind: ${weather.windSpeed} km/h, UV Index: ${weather.uvIndex} (${uvInfo.label}), Condition: ${weather.conditionLabel}`
                      );
                      setIsPopoverOpen(false);
                    }
                  }}
                  className="flex-1 py-1.5 px-2 rounded-xl bg-pink-500/20 hover:bg-pink-500/30 border border-pink-500/40 text-[11px] font-semibold text-pink-200 flex items-center justify-center gap-1 transition-all cursor-pointer shadow-xs"
                  title="Ask Zoya to speak about this weather"
                >
                  <Sparkles size={12} className="text-pink-400" />
                  <span>Ask Zoya</span>
                </button>

                <button
                  type="button"
                  onClick={detectLiveLocation}
                  disabled={gpsDetecting}
                  className="py-1.5 px-2 rounded-xl bg-white/[0.05] hover:bg-white/10 border border-white/10 text-[11px] font-medium text-slate-300 flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50"
                  title="Auto-detect area via GPS"
                >
                  <Compass size={12} className={gpsDetecting ? "animate-spin text-sky-400" : ""} />
                  <span className="hidden xs:inline">GPS</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowLocationPicker((prev) => !prev)}
                  className={`py-1.5 px-2 rounded-xl border text-[11px] font-medium flex items-center gap-1 transition-all cursor-pointer ${
                    showLocationPicker
                      ? "bg-sky-500/25 border-sky-400/50 text-white"
                      : "bg-white/[0.05] hover:bg-white/10 border-white/10 text-slate-300"
                  }`}
                  title="Change city or search area"
                >
                  <Search size={11} />
                  <span>Cities</span>
                  <ChevronDown
                    size={11}
                    className={`transition-transform ${showLocationPicker ? "rotate-180" : ""}`}
                  />
                </button>
              </div>

              {/* Expandable City Search & Quick Picks */}
              <AnimatePresence>
                {showLocationPicker && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.18 }}
                    className="overflow-hidden pt-2.5 mt-2 border-t border-white/10 space-y-2"
                  >
                    {/* Search Input */}
                    <form onSubmit={handleSearchCity} className="relative">
                      <input
                        type="text"
                        placeholder="Search area (e.g. Noida, Pune)..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-7 pr-14 py-1.5 rounded-lg bg-white/[0.06] border border-white/15 text-[11px] text-white placeholder-slate-400 focus:outline-none focus:border-sky-400"
                      />
                      <Search size={11} className="absolute left-2.5 top-2.5 text-slate-400" />
                      <button
                        type="submit"
                        disabled={isSearching}
                        className="absolute right-1 top-1 px-2 py-0.5 rounded bg-sky-500 hover:bg-sky-400 text-white text-[10px] font-bold cursor-pointer disabled:opacity-50"
                      >
                        {isSearching ? "..." : "Go"}
                      </button>
                    </form>

                    {/* Search Results */}
                    {searchResults.length > 0 && (
                      <div className="max-h-24 overflow-y-auto rounded-lg bg-black/60 border border-white/10 p-1 divide-y divide-white/5 text-[11px]">
                        {searchResults.map((r, idx) => (
                          <button
                            key={`${r.name}_${idx}`}
                            type="button"
                            onClick={() => handleSelectCity(r)}
                            className="w-full text-left px-2 py-1.5 hover:bg-sky-500/20 rounded flex items-center justify-between transition-colors text-slate-200 cursor-pointer"
                          >
                            <span className="truncate">
                              {r.name}
                              {r.admin1 ? `, ${r.admin1}` : ""}
                            </span>
                            <ChevronRight size={11} className="text-sky-400 shrink-0" />
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Quick City Chips */}
                    <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto pr-0.5">
                      {PRESET_CITIES.map((c) => (
                        <button
                          key={c.name}
                          type="button"
                          onClick={() => handleSelectCity(c)}
                          className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors cursor-pointer ${
                            weather?.city?.toLowerCase() === c.name.toLowerCase()
                              ? "bg-sky-500 text-white font-bold"
                              : "bg-white/[0.05] hover:bg-white/10 text-slate-300"
                          }`}
                        >
                          {c.name}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
