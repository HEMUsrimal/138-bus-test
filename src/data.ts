/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Bus, BusStop, Route } from "./types";

// Colombo coordinate bounds for projection
export const COLOMBO_BOUNDS = {
  minLat: 6.7800,
  maxLat: 6.9550,
  minLng: 79.8350,
  maxLng: 79.9700,
};

// Projection helper to convert Lat/Lng to X/Y percentages on our SVG map
export function projectCoordinates(lat: number, lng: number): { x: number; y: number } {
  const { minLat, maxLat, minLng, maxLng } = COLOMBO_BOUNDS;
  
  // X is simple linear interpolation for Longitude
  const x = ((lng - minLng) / (maxLng - minLng)) * 100;
  
  // Y is inverted because SVG (0,0) is top-left and higher latitude is north (upwards)
  const y = 100 - ((lat - minLat) / (maxLat - minLat)) * 100;
  
  return {
    x: Math.min(Math.max(x, 0), 100),
    y: Math.min(Math.max(y, 0), 100),
  };
}

export const INITIAL_STOPS: BusStop[] = [
  {
    id: "S_PETTAH",
    name: "Pettah Central Terminal (Fort)",
    sinhalaName: "පිටකොටුව ප්‍රධාන බස් නැවතුම්පොළ",
    lat: 6.9344,
    lng: 79.8450,
    passengerCount: 85,
    amenities: ["Shelter", "Digital Signboard", "NTC Ticket Counter", "SLTB Canteen", "Restroom"],
  },
  {
    id: "S_TOWNHALL",
    name: "Colombo Town Hall",
    sinhalaName: "ටවුන් හෝල් (නගර ශාලාව)",
    lat: 6.9150,
    lng: 79.8580,
    passengerCount: 45,
    amenities: ["Shelter", "Digital Signboard", "Public Wi-Fi"],
  },
  {
    id: "S_BORELLA",
    name: "Borella Junction",
    sinhalaName: "බොරැල්ල හන්දිය",
    lat: 6.9144,
    lng: 79.8780,
    passengerCount: 55,
    amenities: ["Shelter", "Digital Signboard", "NTC Help Desk"],
  },
  {
    id: "S_KOLLUPITIYA",
    name: "Kollupitiya Junction",
    sinhalaName: "කොල්ලුපිටිය හන්දිය",
    lat: 6.9115,
    lng: 79.8490,
    passengerCount: 38,
    amenities: ["Shelter", "Smart Charger", "CCTV Monitor"],
  },
  {
    id: "S_BAMBALAPITIYA",
    name: "Bambalapitiya (Galle Road)",
    sinhalaName: "බම්බලපිටිය",
    lat: 6.8960,
    lng: 79.8550,
    passengerCount: 42,
    amenities: ["Shelter", "Digital Signboard", "Tactile Paving"],
  },
  {
    id: "S_THUMMULLA",
    name: "Thummulla (Havelock Road)",
    sinhalaName: "තුම්මුල්ල හන්දිය",
    lat: 6.8880,
    lng: 79.8640,
    passengerCount: 29,
    amenities: ["Shelter", "Tactile Paving"],
  },
  {
    id: "S_KIRULAPONE",
    name: "Kirulapone Market",
    sinhalaName: "කිරුළපන වෙළඳපොළ",
    lat: 6.8790,
    lng: 79.8710,
    passengerCount: 34,
    amenities: ["Shelter", "Digital Signboard"],
  },
  {
    id: "S_KOHUWALA",
    name: "Kohuwala Junction",
    sinhalaName: "කොහුවල හන්දිය",
    lat: 6.8690,
    lng: 79.8760,
    passengerCount: 28,
    amenities: ["Shelter", "ATM Nearby"],
  },
  {
    id: "S_NUGEGODA",
    name: "Nugegoda Flyover Junction",
    sinhalaName: "නුගේගොඩ ගුවන් පාලම හන්දිය",
    lat: 6.8730,
    lng: 79.8885,
    passengerCount: 72,
    amenities: ["Shelter", "Digital Signboard", "Smart Seating", "CCTV", "E-Ticket Machine"],
  },
  {
    id: "S_DELKANDA",
    name: "Delkanda Court Junction",
    sinhalaName: "දෙල්කඳ උසාවිය හන්දිය",
    lat: 6.8640,
    lng: 79.9010,
    passengerCount: 22,
    amenities: ["Shelter", "Tactile Paving"],
  },
  {
    id: "S_MAHARAGAMA",
    name: "Maharagama Central Terminal",
    sinhalaName: "මහරගම බස් නැවතුම්පොළ",
    lat: 6.8510,
    lng: 79.9215,
    passengerCount: 95,
    amenities: ["Shelter", "Digital Signboard", "Food Court", "SLTB Ticket Counter", "Restroom", "CCTV"],
  },
  {
    id: "S_KOTTAWA",
    name: "Kottawa Bus Terminal",
    sinhalaName: "කොට්ටාව මල්ටිමෝඩල් හබ්",
    lat: 6.8410,
    lng: 79.9610,
    passengerCount: 48,
    amenities: ["Shelter", "Digital Signboard", "Multimodal Train Link", "Restroom"],
  },
  {
    id: "S_PILIYANDALA",
    name: "Piliyandala Clock Tower",
    sinhalaName: "පිළියන්දල ඔරලෝසු කණුව",
    lat: 6.8010,
    lng: 79.9220,
    passengerCount: 62,
    amenities: ["Shelter", "Digital Signboard", "Ticket Booth"],
  },
  {
    id: "S_MALABE",
    name: "Malabe Junction",
    sinhalaName: "මාලබේ හන්දිය",
    lat: 6.9040,
    lng: 79.9540,
    passengerCount: 50,
    amenities: ["Shelter", "Digital Signboard", "USB Charger"],
  }
];

export const INITIAL_ROUTES: Route[] = [
  {
    id: "R_138",
    number: "138",
    name: "Maharagama - Pettah (High Level Rd)",
    origin: "Maharagama Central",
    destination: "Pettah",
    distanceKm: 15.2,
    avgTravelTimeMinutes: 45,
    baseFareLkr: 90,
    color: "#E11D48", // Rose Red
    stops: ["S_MAHARAGAMA", "S_DELKANDA", "S_NUGEGODA", "S_KIRULAPONE", "S_THUMMULLA", "S_TOWNHALL", "S_PETTAH"],
    path: [
      [6.8510, 79.9215], // Maharagama
      [6.8580, 79.9110], // Interpolated Road High Level
      [6.8640, 79.9010], // Delkanda
      [6.8690, 79.8940],
      [6.8730, 79.8885], // Nugegoda
      [6.8760, 79.8800],
      [6.8790, 79.8710], // Kirulapone
      [6.8830, 79.8675],
      [6.8880, 79.8640], // Thummulla (Havelock Rd)
      [6.9010, 79.8600], // Thummulla to Town Hall
      [6.9150, 79.8580], // Town Hall
      [6.9240, 79.8510], // Town Hall to Pettah
      [6.9344, 79.8450], // Pettah Central
    ]
  },
  {
    id: "R_120",
    number: "120",
    name: "Piliyandala - Pettah (Horana Road)",
    origin: "Piliyandala",
    destination: "Pettah",
    distanceKm: 18.5,
    avgTravelTimeMinutes: 55,
    baseFareLkr: 110,
    color: "#0284C7", // Sky Blue
    stops: ["S_PILIYANDALA", "S_KOHUWALA", "S_THUMMULLA", "S_TOWNHALL", "S_PETTAH"],
    path: [
      [6.8010, 79.9220], // Piliyandala
      [6.8240, 79.9050], // Boralesgamuwa
      [6.8480, 79.8850], // Pamankada
      [6.8690, 79.8760], // Kohuwala
      [6.8880, 79.8640], // Thummulla
      [6.9010, 79.8600],
      [6.9150, 79.8580], // Town Hall
      [6.9240, 79.8510],
      [6.9344, 79.8450], // Pettah Central
    ]
  },
  {
    id: "R_177",
    number: "177",
    name: "Malabe - Kollupitiya (via Kaduwela Rd)",
    origin: "Malabe Junction",
    destination: "Kollupitiya",
    distanceKm: 14.1,
    avgTravelTimeMinutes: 40,
    baseFareLkr: 85,
    color: "#0D9488", // Teal
    stops: ["S_MALABE", "S_BORELLA", "S_TOWNHALL", "S_KOLLUPITIYA"],
    path: [
      [6.9040, 79.9540], // Malabe
      [6.9010, 79.9320], // Koswatta
      [6.8980, 79.9050], // Battaramulla
      [6.9080, 79.8910], // Borella Rd
      [6.9144, 79.8780], // Borella
      [6.9150, 79.8580], // Town Hall
      [6.9115, 79.8490], // Kollupitiya
    ]
  }
];

export const INITIAL_BUSES: Bus[] = [
  {
    id: "B_138_SLTB_1",
    plate: "WP NB-1834",
    type: "SLTB_RED",
    speed: 28,
    status: "MOVING",
    routeId: "R_138",
    currentWaypointIndex: 0,
    lat: 6.8510,
    lng: 79.9215,
    direction: 1,
    passengers: 48,
    capacity: 54,
    fuel: 85,
    driverName: "Sunil Shantha",
    conductorName: "Arjuna Ranatunga",
    occupancy: "High",
    lastStop: "S_MAHARAGAMA",
    nextStop: "S_DELKANDA",
    etaMinutes: 4,
  },
  {
    id: "B_138_PVT_1",
    plate: "WP ND-7892",
    type: "PRIVATE_STANDARD",
    speed: 35,
    status: "MOVING",
    routeId: "R_138",
    currentWaypointIndex: 4,
    lat: 6.8730,
    lng: 79.8885,
    direction: 1,
    passengers: 58,
    capacity: 50,
    fuel: 62,
    driverName: "Bandula Warnapura",
    conductorName: "Asela Gunaratne",
    occupancy: "Full House",
    lastStop: "S_NUGEGODA",
    nextStop: "S_KIRULAPONE",
    etaMinutes: 3,
  },
  {
    id: "B_138_AC_1",
    plate: "WP LY-0043",
    type: "LUXURY_AC",
    speed: 0,
    status: "STOPPED",
    routeId: "R_138",
    currentWaypointIndex: 10,
    lat: 6.9150,
    lng: 79.8580,
    direction: -1, // Heading back to Maharagama
    passengers: 22,
    capacity: 32,
    fuel: 90,
    driverName: "Kusal Perera",
    conductorName: "Lasith Malinga",
    occupancy: "Medium",
    lastStop: "S_PETTAH",
    nextStop: "S_TOWNHALL",
    etaMinutes: 0, // Arrived at Town Hall
  },
  {
    id: "B_120_SLTB_1",
    plate: "WP NB-9945",
    type: "SLTB_RED",
    speed: 22,
    status: "MOVING",
    routeId: "R_120",
    currentWaypointIndex: 3,
    lat: 6.8690,
    lng: 79.8760,
    direction: 1,
    passengers: 32,
    capacity: 54,
    fuel: 55,
    driverName: "Mahela Jayawardene",
    conductorName: "Kumar Sangakkara",
    occupancy: "Medium",
    lastStop: "S_KOHUWALA",
    nextStop: "S_THUMMULLA",
    etaMinutes: 6,
  },
  {
    id: "B_177_PVT_1",
    plate: "WP NC-5521",
    type: "PRIVATE_STANDARD",
    speed: 15,
    status: "MOVING",
    routeId: "R_177",
    currentWaypointIndex: 1,
    lat: 6.9010,
    lng: 79.9320,
    direction: 1,
    passengers: 12,
    capacity: 48,
    fuel: 48,
    driverName: "Roshan Mahanama",
    conductorName: "Dinesh Chandimal",
    occupancy: "Low",
    lastStop: "S_MALABE",
    nextStop: "S_BORELLA",
    etaMinutes: 8,
  }
];

export const CONDU_SHOUTS = [
  "පිටකොටුව! ටවුන් හෝල්! පිටකොටුව! (Pettah! Town Hall! Pettah Pettah!)",
  "නුගේගොඩ බහින අය ඉස්සරහට එන්න! (Nugegoda passengers, please step forward!)",
  "මහරගම හයිලෙවල්! කොට්ටාව! (Maharagama High Level! Kottawa!)",
  "ඉස්සරහට යන්න නංගි! ඉඩ තියෙනවා! (Move forward please, there is plenty of space!)",
  "කිරුළපන! තුම්මුල්ල! බහින අය කියන්න! (Kirulapone! Thummulla! Call out if you're dropping!)",
  "ටිකට් එකක් ගන්න නැගපු අය! (Get your tickets, those who just boarded!)",
  "හොරණ පිළියන්දල 120! කොල්ලුපිටිය බම්බලපිටිය 177!",
];

export const ANNOUNCEMENTS = [
  { id: 1, text: "Colombo High Level Road traffic slow near Nugegoda flyover due to heavy rains.", time: "2 mins ago", type: "alert" },
  { id: 2, text: "SLTB Special 'Sisu Seriya' school service bus added for Route 138 today at 2:00 PM.", time: "10 mins ago", type: "info" },
  { id: 3, text: "Route 120 bus WP NB-9945 reports heavy congestion around Pamankada bridge.", time: "15 mins ago", type: "warning" },
];
