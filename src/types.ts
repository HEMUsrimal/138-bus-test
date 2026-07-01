/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type BusType = "SLTB_RED" | "PRIVATE_STANDARD" | "LUXURY_AC";

export type BusStatus = "MOVING" | "STOPPED" | "BREAK" | "DELAYED";

export type TrafficLevel = "NORMAL" | "HIGH_LEVEL_JAM" | "RUSH_HOUR" | "PILIYANDALA_CRAWL" | "FORT_BLOCKED";

export interface Bus {
  id: string;
  plate: string;
  type: BusType;
  speed: number;
  status: BusStatus;
  routeId: string;
  currentWaypointIndex: number;
  lat: number;
  lng: number;
  direction: 1 | -1; // 1 = Maharagama/Terminal -> Pettah/Fort, -1 = Pettah/Fort -> Maharagama/Terminal
  passengers: number;
  capacity: number;
  fuel: number;
  driverName: string;
  conductorName: string;
  occupancy: "Low" | "Medium" | "High" | "Full House";
  lastStop: string;
  nextStop: string;
  etaMinutes: number;
  specialService?: string; // "Sisu Seriya", "Office Special", etc.
}

export interface BusStop {
  id: string;
  name: string;
  sinhalaName: string;
  lat: number;
  lng: number;
  passengerCount: number;
  amenities: string[];
}

export interface Route {
  id: string;
  number: string;
  name: string;
  origin: string;
  destination: string;
  distanceKm: number;
  avgTravelTimeMinutes: number;
  baseFareLkr: number;
  color: string;
  stops: string[]; // Stop IDs in order
  path: [number, number][]; // coordinates for drawing path
}

export interface JourneyResult {
  route: Route;
  fareLkr: number;
  stopsToTravel: BusStop[];
  totalDistanceKm: number;
  durationMinutes: number;
  availableBuses: Bus[];
}
