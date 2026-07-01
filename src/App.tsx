/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Bus as BusIcon, 
  MapPin, 
  Navigation, 
  Users, 
  Settings, 
  AlertTriangle, 
  Info, 
  Clock, 
  Search, 
  DollarSign, 
  Play, 
  Pause, 
  RefreshCw, 
  Volume2, 
  HelpCircle,
  TrendingUp,
  Map as MapIcon,
  CheckCircle2,
  Sliders,
  UserCheck,
  Fuel,
  Compass,
  ArrowRightLeft,
  PlusCircle
} from "lucide-react";

import { Bus, BusStop, Route, TrafficLevel, BusType, BusStatus, JourneyResult } from "./types";
import { INITIAL_STOPS, INITIAL_ROUTES, INITIAL_BUSES, CONDU_SHOUTS, ANNOUNCEMENTS, projectCoordinates, COLOMBO_BOUNDS } from "./data";

export default function App() {
  // State variables
  const [buses, setBuses] = useState<Bus[]>(INITIAL_BUSES);
  const [stops, setStops] = useState<BusStop[]>(INITIAL_STOPS);
  const [routes] = useState<Route[]>(INITIAL_ROUTES);
  const [traffic, setTraffic] = useState<TrafficLevel>("NORMAL");
  const [isSimulating, setIsSimulating] = useState(true);
  const [selectedBusId, setSelectedBusId] = useState<string | null>("B_138_SLTB_1");
  const [selectedStopId, setSelectedStopId] = useState<string | null>("S_MAHARAGAMA");
  
  // Tab control
  const [activeTab, setActiveTab] = useState<"map" | "planner" | "timetable" | "fleet">("map");

  // Shout state
  const [lastShout, setLastShout] = useState<string>("Click to shout: Pettah Pettah Pettah!");
  const [shoutingBusId, setShoutingBusId] = useState<string | null>(null);

  // Search filter
  const [searchQuery, setSearchQuery] = useState("");

  // Planner Form state
  const [plannerStart, setPlannerStart] = useState("S_MAHARAGAMA");
  const [plannerEnd, setPlannerEnd] = useState("S_PETTAH");
  const [plannerResult, setPlannerResult] = useState<JourneyResult | null>(null);

  // Announcements log
  const [alerts, setAlerts] = useState(ANNOUNCEMENTS);

  // Time state
  const [colomboTime, setColomboTime] = useState("");

  // Refs for custom projection container
  const mapContainerRef = useRef<HTMLDivElement>(null);

  // Live Colombo Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      // Adjust to Colombo time zone (UTC +5:30) if possible, or just standard local with Colombo tag
      const options: Intl.DateTimeFormatOptions = {
        timeZone: "Asia/Colombo",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true
      };
      setColomboTime(new Intl.DateTimeFormat("en-US", options).format(now));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Journey planner calculation whenever start or end stop changes
  useEffect(() => {
    calculateJourney(plannerStart, plannerEnd);
  }, [plannerStart, plannerEnd, buses]);

  // Handle Speech Announcement (Conductor voice)
  const triggerConductorShout = (targetBusId?: string) => {
    const randomShout = CONDU_SHOUTS[Math.floor(Math.random() * CONDU_SHOUTS.length)];
    setLastShout(randomShout);
    
    // Choose a random moving bus if none specified
    const activeBus = targetBusId || buses.find(b => b.status === "MOVING")?.id || buses[0].id;
    setShoutingBusId(activeBus);
    
    // Speech synthesis helper
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      // Translate colloquial shouts slightly so robotic synthesizer sounds funny but clear
      let cleanText = randomShout;
      if (randomShout.includes("Pettah")) {
        cleanText = "Pettah! Town Hall! Pettah Pettah! Ticket please, stand forward!";
      } else if (randomShout.includes("Nugegoda")) {
        cleanText = "Next stop Nugegoda! Move inside, there is plenty of space!";
      } else if (randomShout.includes("Maharagama")) {
        cleanText = "Maharagama High Level! Kottawa! Boarding now!";
      } else {
        cleanText = "Pettah! Pettah! Town Hall Pettah! Colombo Fort!";
      }

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = "en-GB"; // High pitch English or Indian accents fit the vibe nicely
      utterance.rate = 1.15;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    }

    // Auto clear shouting bubble after 4 seconds
    setTimeout(() => {
      setShoutingBusId(null);
    }, 4000);
  };

  // NTC Stage-based Bus Fare Calculator in Sri Lanka
  const calculateJourney = (startId: string, endId: string) => {
    if (startId === endId) {
      setPlannerResult(null);
      return;
    }

    // Find the route that links both stops (if any)
    const matchingRoute = routes.find(r => r.stops.includes(startId) && r.stops.includes(endId));
    if (!matchingRoute) {
      setPlannerResult(null);
      return;
    }

    const startIndex = matchingRoute.stops.indexOf(startId);
    const endIndex = matchingRoute.stops.indexOf(endId);
    const isForward = startIndex < endIndex;

    // Get stops along the journey
    const stopsToTravel: BusStop[] = [];
    const orderedStops = matchingRoute.stops;
    const step = isForward ? 1 : -1;

    for (let i = startIndex; isForward ? i <= endIndex : i >= endIndex; i += step) {
      const stopObj = stops.find(s => s.id === orderedStops[i]);
      if (stopObj) stopsToTravel.push(stopObj);
    }

    // Sri Lanka Bus Fare stages (NTC rates are roughly Rs. 8 - Rs. 10 per km for normal)
    const numStops = stopsToTravel.length - 1;
    const totalDistanceKm = Number((numStops * 2.4).toFixed(1)); // Approx distance
    const baseFare = Math.max(40, Math.round(numStops * 25)); // Base fare stages
    const durationMinutes = Math.max(10, Math.round(totalDistanceKm * 3.2));

    // Get buses active on this route
    const availableBuses = buses.filter(b => b.routeId === matchingRoute.id);

    setPlannerResult({
      route: matchingRoute,
      fareLkr: baseFare,
      stopsToTravel,
      totalDistanceKm,
      durationMinutes,
      availableBuses,
    });
  };

  // Live Bus simulation interval
  useEffect(() => {
    if (!isSimulating) return;

    const interval = setInterval(() => {
      setBuses((prevBuses) => {
        return prevBuses.map((bus) => {
          // Adjust status randomly
          let status = bus.status;
          let speed = bus.speed;

          // Stopped buses have a chance to start moving
          if (bus.status === "STOPPED") {
            if (Math.random() < 0.2) {
              status = "MOVING";
              speed = Math.round(25 + Math.random() * 20);
            }
          } else if (bus.status === "MOVING") {
            // Moving buses have a chance to stop briefly at waypoints
            if (Math.random() < 0.15) {
              status = "STOPPED";
              speed = 0;
            }
          }

          // Adjust speed based on Colombo Traffic
          if (status === "MOVING") {
            let trafficFactor = 1.0;
            if (traffic === "HIGH_LEVEL_JAM") trafficFactor = 0.35;
            else if (traffic === "RUSH_HOUR") trafficFactor = 0.5;
            else if (traffic === "PILIYANDALA_CRAWL") trafficFactor = 0.45;
            else if (traffic === "FORT_BLOCKED") trafficFactor = 0.2;

            speed = Math.round((30 + Math.random() * 15) * trafficFactor);
          }

          const route = routes.find((r) => r.id === bus.routeId);
          if (!route) return bus;

          const path = route.path;
          let waypointIndex = bus.currentWaypointIndex;
          let direction = bus.direction;

          // Target index
          let targetIndex = waypointIndex + direction;

          // Reach terminus
          if (targetIndex >= path.length || targetIndex < 0) {
            // Reverse direction
            direction = direction === 1 ? -1 : 1;
            targetIndex = waypointIndex + direction;
            status = "STOPPED";
            speed = 0;
          }

          const currentCoords = [bus.lat, bus.lng];
          const targetCoords = path[targetIndex];

          // Linear interpolation towards the next waypoint
          // Move 20% of the distance each tick
          const stepSize = 0.20;
          const newLat = bus.lat + (targetCoords[0] - currentCoords[0]) * stepSize;
          const newLng = bus.lng + (targetCoords[1] - currentCoords[1]) * stepSize;

          // Check if we are very close to the target waypoint to snap to it
          const distance = Math.sqrt(
            Math.pow(targetCoords[0] - newLat, 2) + Math.pow(targetCoords[1] - newLng, 2)
          );

          let updatedWaypoint = waypointIndex;
          let finalLat = newLat;
          let finalLng = newLng;

          if (distance < 0.003) {
            // Lock to waypoint
            finalLat = targetCoords[0];
            finalLng = targetCoords[1];
            updatedWaypoint = targetIndex;

            // Trigger random passenger exchange when snapping to a stop waypoint
            // Every stop is close to some real coordinates
          }

          // Slow fuel drain
          const finalFuel = Math.max(12, Number((bus.fuel - Math.random() * 0.12).toFixed(1)));

          // Check if fuel is critically low to trigger warning log
          if (finalFuel < 20 && bus.fuel >= 20) {
            setAlerts(prev => [
              {
                id: Date.now(),
                text: `Fuel level critical on SLTB Red ${bus.plate} (${route.number} Maharagama-Pettah).`,
                time: "Just Now",
                type: "warning"
              },
              ...prev
            ]);
          }

          // Calculate visual occupancy
          let pax = bus.passengers;
          if (status === "STOPPED") {
            const passengerChange = Math.round(Math.random() * 8 - 3); // More boarders than leavers
            pax = Math.max(4, Math.min(bus.capacity, bus.passengers + passengerChange));
          }

          let occupancy: "Low" | "Medium" | "High" | "Full House" = "Low";
          const ratio = pax / bus.capacity;
          if (ratio > 0.9) occupancy = "Full House";
          else if (ratio > 0.6) occupancy = "High";
          else if (ratio > 0.3) occupancy = "Medium";

          // Calculate dynamic ETA to next key stop
          const remainingStopsCount = Math.abs(route.stops.length - 1 - updatedWaypoint);
          const calculatedEta = Math.max(1, Math.round(remainingStopsCount * (traffic === "HIGH_LEVEL_JAM" ? 8 : 4) + Math.random() * 2));

          return {
            ...bus,
            lat: finalLat,
            lng: finalLng,
            currentWaypointIndex: updatedWaypoint,
            direction,
            status,
            speed,
            fuel: finalFuel,
            passengers: pax,
            occupancy,
            etaMinutes: calculatedEta,
          };
        });
      });

      // Randomly fluctuate stop passenger count for Colombo rush hours
      setStops((prevStops) => {
        return prevStops.map((stop) => {
          if (Math.random() < 0.25) {
            const multiplier = traffic === "RUSH_HOUR" ? 4 : 1;
            const flow = Math.round(Math.random() * 3 - 1) * multiplier;
            return {
              ...stop,
              passengerCount: Math.max(5, Math.min(150, stop.passengerCount + flow))
            };
          }
          return stop;
        });
      });
    }, 1800);

    return () => clearInterval(interval);
  }, [isSimulating, traffic, routes]);

  // Handle Dispatching an Emergency Special SLTB Bus
  const dispatchSpecialBus = () => {
    const id = `B_SPECIAL_${Date.now()}`;
    const plates = ["WP ND-8809", "WP NB-3412", "WP LY-7761"];
    const randomPlate = plates[Math.floor(Math.random() * plates.length)];

    const specialBus: Bus = {
      id,
      plate: randomPlate,
      type: "SLTB_RED",
      speed: 35,
      status: "MOVING",
      routeId: "R_138",
      currentWaypointIndex: 0,
      lat: 6.8510,
      lng: 79.9215,
      direction: 1,
      passengers: 4,
      capacity: 54,
      fuel: 100,
      driverName: "Dharmasena Pathiraja",
      conductorName: "Wimal Kumara",
      occupancy: "Low",
      lastStop: "S_MAHARAGAMA",
      nextStop: "S_DELKANDA",
      etaMinutes: 12,
      specialService: "Office Special",
    };

    setBuses(prev => [...prev, specialBus]);
    setAlerts(prev => [
      {
        id: Date.now(),
        text: `Special SLTB Red Service ${randomPlate} Dispatched from Maharagama to Pettah to ease peak crowd!`,
        time: "Just Now",
        type: "info"
      },
      ...prev
    ]);
  };

  // Filtered lists
  const filteredBuses = buses.filter(b => {
    const r = routes.find(route => route.id === b.routeId);
    const searchLower = searchQuery.toLowerCase();
    return (
      b.plate.toLowerCase().includes(searchLower) ||
      b.driverName.toLowerCase().includes(searchLower) ||
      r?.number.toLowerCase().includes(searchLower) ||
      r?.name.toLowerCase().includes(searchLower)
    );
  });

  // Projection helper for rendering on our interactive vector SVG
  const getSVGCoords = (lat: number, lng: number) => {
    const { minLat, maxLat, minLng, maxLng } = COLOMBO_BOUNDS;
    const x = ((lng - minLng) / (maxLng - minLng)) * 740 + 30; // added padding
    const y = 430 - ((lat - minLat) / (maxLat - minLat)) * 380 + 20; // inverted and padded
    return { x, y };
  };

  // Find currently focused entity details
  const focusedBus = buses.find(b => b.id === selectedBusId);
  const focusedRoute = focusedBus ? routes.find(r => r.id === focusedBus.routeId) : null;

  const focusedStop = stops.find(s => s.id === selectedStopId);
  const incomingToStop = buses.filter(b => {
    const r = routes.find(route => route.id === b.routeId);
    return r?.stops.includes(selectedStopId || "") && b.status === "MOVING";
  });

  return (
    <div id="ceylon-transit-app" className="min-height-screen bg-[#070A13] text-slate-100 flex flex-col antialiased">
      
      {/* Top Professional Header Bar */}
      <header className="border-b border-slate-800 bg-[#0A0E1A] py-3 px-6 sticky top-0 z-50 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-rose-500 to-amber-500 p-2 rounded-lg shadow-lg shadow-rose-900/30">
            <BusIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs bg-rose-600/20 text-rose-400 font-bold px-2 py-0.5 rounded-full border border-rose-500/20 uppercase tracking-widest font-mono">WP Colombo</span>
              <span className="text-xs bg-amber-500/10 text-amber-400 font-bold px-2 py-0.5 rounded-full border border-amber-500/20 font-mono flex items-center gap-1">
                <Clock className="w-3 h-3" /> Live
              </span>
            </div>
            <h1 className="text-lg md:text-xl font-display font-extrabold tracking-tight bg-gradient-to-r from-slate-50 to-slate-300 bg-clip-text text-transparent">
              Ceylon Transit • Route 138 Command Center
            </h1>
          </div>
        </div>

        {/* Live Audio / Sound Shoutboard Trigger */}
        <div className="flex items-center gap-3 bg-slate-900/80 border border-slate-800 px-3 py-1.5 rounded-xl max-w-full md:max-w-md">
          <div className="bg-rose-500/10 text-rose-400 p-2 rounded-lg">
            <Volume2 className="w-4 h-4 pulse-red" />
          </div>
          <div className="hidden sm:block text-left min-w-0 flex-1">
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Conductor Shouter</div>
            <p className="text-xs text-rose-300 truncate font-medium italic">"{lastShout}"</p>
          </div>
          <button 
            onClick={() => triggerConductorShout()}
            className="bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 active:scale-95 text-xs text-white font-bold py-1.5 px-3 rounded-lg transition-all duration-150 flex items-center gap-1.5 shadow-md shadow-rose-950/40"
          >
            Shout Pettah!
          </button>
        </div>

        {/* Real-time Time & System Status */}
        <div className="flex items-center gap-4">
          <div className="text-right hidden md:block">
            <div className="text-xs text-slate-500 uppercase font-bold tracking-wider">Sri Lanka Time (SLST)</div>
            <div className="text-md font-mono font-bold text-amber-400 drop-shadow-md">{colomboTime || "04:30:15 PM"}</div>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-1.5 rounded-xl flex gap-1">
            <button 
              onClick={() => setIsSimulating(!isSimulating)}
              title={isSimulating ? "Pause Simulation" : "Start Simulation"}
              className={`p-2 rounded-lg transition-all ${isSimulating ? 'bg-indigo-600/20 text-indigo-400' : 'text-slate-400 hover:bg-slate-800'}`}
            >
              {isSimulating ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
            <button 
              onClick={() => {
                setBuses(INITIAL_BUSES);
                setStops(INITIAL_STOPS);
                setAlerts(ANNOUNCEMENTS);
                setTraffic("NORMAL");
                setLastShout("Simulation reset to default.");
              }}
              title="Reset Grid"
              className="p-2 text-slate-400 hover:bg-slate-800 hover:text-white rounded-lg transition-all"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Operational Workspace */}
      <main className="flex-1 p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-7xl mx-auto w-full">
        
        {/* Left Hand Quick Analytics Dashboard (Span 3) */}
        <div className="lg:col-span-3 flex flex-col gap-6">
          
          {/* Real-time Colombo Traffic Panel */}
          <section className="glass-panel rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-indigo-400" /> Colombo Traffic Flow
              </h2>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                traffic === "NORMAL" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
              }`}>
                Simulated
              </span>
            </div>

            <div className="space-y-3">
              {[
                { id: "NORMAL", label: "Normal (LKR Flow)", desc: "Standard High-Level Flow (35-45 km/h)", color: "emerald" },
                { id: "HIGH_LEVEL_JAM", label: "Nugegoda Flyover Jam", desc: "Monsoon rains slow Nugegoda (10-15 km/h)", color: "rose" },
                { id: "RUSH_HOUR", label: "Colombo Office Rush Hour", desc: "Heavy incoming/outgoing load (15-22 km/h)", color: "amber" },
                { id: "PILIYANDALA_CRAWL", label: "120 Route Pamankada Crawl", desc: "Narrow bridge bottle-neck (12-18 km/h)", color: "indigo" },
                { id: "FORT_BLOCKED", label: "Pettah Fort Blocked", desc: "High congestion near terminal (5-10 km/h)", color: "rose" }
              ].map((lvl) => (
                <button
                  key={lvl.id}
                  onClick={() => {
                    setTraffic(lvl.id as TrafficLevel);
                    setAlerts(prev => [
                      {
                        id: Date.now(),
                        text: `Colombo Dispatch changed system traffic profile to: ${lvl.label}.`,
                        time: "Just Now",
                        type: "info"
                      },
                      ...prev
                    ]);
                  }}
                  className={`w-full text-left p-3 rounded-xl border transition-all duration-150 flex items-start gap-3 ${
                    traffic === lvl.id 
                      ? `bg-indigo-600/10 border-indigo-500/40 text-white shadow-md shadow-indigo-950/20` 
                      : `bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-700 hover:bg-slate-900`
                  }`}
                >
                  <div className={`w-2 h-2 rounded-full mt-1.5 ${
                    lvl.color === "emerald" ? "bg-emerald-500 shadow-lg shadow-emerald-500/50" :
                    lvl.color === "rose" ? "bg-rose-500 shadow-lg shadow-rose-500/50" :
                    "bg-amber-500 shadow-lg shadow-amber-500/50"
                  }`} />
                  <div className="min-w-0">
                    <div className={`text-xs font-bold ${traffic === lvl.id ? "text-white" : "text-slate-300"}`}>
                      {lvl.label}
                    </div>
                    <div className="text-[10px] text-slate-500 truncate mt-0.5">{lvl.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </section>

          {/* Quick Stats Widgets */}
          <section className="grid grid-cols-2 gap-4">
            <div className="glass-panel p-4 rounded-2xl text-center flex flex-col items-center justify-center">
              <div className="bg-indigo-500/10 p-2 rounded-xl text-indigo-400 mb-2">
                <BusIcon className="w-5 h-5" />
              </div>
              <div className="text-2xl font-mono font-black text-white">{buses.length}</div>
              <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1">Fleet Buses</div>
            </div>
            
            <div className="glass-panel p-4 rounded-2xl text-center flex flex-col items-center justify-center">
              <div className="bg-emerald-500/10 p-2 rounded-xl text-emerald-400 mb-2">
                <Users className="w-5 h-5" />
              </div>
              <div className="text-2xl font-mono font-black text-white">
                {stops.reduce((acc, s) => acc + s.passengerCount, 0)}
              </div>
              <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1">Stops Queue</div>
            </div>

            <div className="glass-panel p-4 rounded-2xl text-center flex flex-col items-center justify-center">
              <div className="bg-amber-500/10 p-2 rounded-xl text-amber-400 mb-2">
                <Navigation className="w-5 h-5" />
              </div>
              <div className="text-lg font-mono font-bold text-white">R-138 Hub</div>
              <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1">Primary Route</div>
            </div>

            <div className="glass-panel p-4 rounded-2xl text-center flex flex-col items-center justify-center">
              <div className="bg-rose-500/10 p-2 rounded-xl text-rose-400 mb-2">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div className="text-2xl font-mono font-black text-rose-400">94%</div>
              <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1">ETA Accuracy</div>
            </div>
          </section>

          {/* Colombo Dispatch Announcements Widget */}
          <section className="glass-panel rounded-2xl p-5 shadow-xl flex-1 flex flex-col min-h-[220px]">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
              <Info className="w-4 h-4 text-rose-500" /> Radio Dispatch Logs
            </h2>
            <div className="space-y-3 overflow-y-auto max-h-[240px] flex-1 pr-1">
              <AnimatePresence initial={false}>
                {alerts.map((item) => (
                  <motion.div 
                    key={item.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl flex items-start gap-2.5"
                  >
                    {item.type === "alert" ? (
                      <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                    ) : item.type === "warning" ? (
                      <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    )}
                    <div className="min-w-0">
                      <p className="text-[11px] text-slate-300 font-medium leading-relaxed">{item.text}</p>
                      <span className="text-[9px] text-slate-500 font-mono mt-1 block">{item.time}</span>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </section>

        </div>

        {/* Center Canvas + Main Tabbed Content (Span 6) */}
        <div className="lg:col-span-6 flex flex-col gap-6">
          
          {/* Tab Selection */}
          <div className="bg-slate-900 p-1.5 rounded-2xl border border-slate-800 flex gap-1">
            {[
              { id: "map", label: "Live System Map", icon: MapIcon },
              { id: "planner", label: "Fare & Journey Planner", icon: DollarSign },
              { id: "timetable", label: "Stop Board Displays", icon: Clock },
              { id: "fleet", label: "Colombo Fleet Register", icon: BusIcon }
            ].map((tab) => {
              const IconComp = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 text-xs font-bold rounded-xl transition-all ${
                    activeTab === tab.id 
                      ? "bg-gradient-to-br from-indigo-600 to-indigo-700 text-white shadow-md shadow-indigo-950/50" 
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                  }`}
                >
                  <IconComp className="w-4 h-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* MAIN TAB VIEWPORTS */}
          <div className="flex-1 flex flex-col min-h-[480px]">
            
            {/* VIEW 1: CO-ORDINATE VECTOR MAP (IMPRESSIVE SCHEMATIC COMMAND BOARD) */}
            {activeTab === "map" && (
              <div className="glass-panel rounded-2xl p-4 shadow-2xl flex-1 flex flex-col relative overflow-hidden min-h-[480px]">
                
                {/* Map Utilities Header */}
                <div className="flex items-center justify-between mb-3 z-10">
                  <div>
                    <h3 className="text-sm font-bold font-display text-white">Colombo Transit Command Matrix</h3>
                    <p className="text-[10px] text-slate-500">Live projected vector map. Scale represents Colombo bounds.</p>
                  </div>
                  
                  {/* Map Legend */}
                  <div className="flex items-center gap-3 bg-slate-950/80 border border-slate-800/80 px-3 py-1 rounded-full text-[10px] font-bold">
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-rose-600 block" /> SLTB Red</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-sky-500 block" /> Private Standard</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-teal-500 block" /> Luxury A/C</span>
                  </div>
                </div>

                {/* Vector SVG Map Viewport */}
                <div 
                  ref={mapContainerRef}
                  className="flex-1 w-full bg-[#04060C] border border-slate-800/50 rounded-xl relative overflow-hidden grid-overlay"
                  style={{ minHeight: "380px" }}
                >
                  <svg 
                    viewBox="0 0 800 500" 
                    className="w-full h-full absolute inset-0 select-none pointer-events-auto"
                  >
                    {/* Definitions for map styling */}
                    <defs>
                      {/* Linear Gradients for pulsing route lines */}
                      <linearGradient id="roseGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.3" />
                        <stop offset="50%" stopColor="#f43f5e" stopOpacity="0.8" />
                        <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.3" />
                      </linearGradient>
                      <linearGradient id="skyGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.3" />
                        <stop offset="50%" stopColor="#0ea5e9" stopOpacity="0.8" />
                        <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.3" />
                      </linearGradient>
                      <linearGradient id="tealGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.3" />
                        <stop offset="50%" stopColor="#14b8a6" stopOpacity="0.8" />
                        <stop offset="100%" stopColor="#14b8a6" stopOpacity="0.3" />
                      </linearGradient>
                    </defs>

                    {/* Ground Reference Grids */}
                    <text x="700" y="480" className="fill-slate-700 text-[10px] font-mono font-bold">WP Grid Projector</text>
                    
                    {/* Major Geographic Roads / Routes path polylines */}
                    {routes.map((route) => {
                      const pointsStr = route.path.map(([lat, lng]) => {
                        const { x, y } = getSVGCoords(lat, lng);
                        return `${x},${y}`;
                      }).join(" ");

                      return (
                        <g key={route.id} className="opacity-80">
                          {/* Inner glowing pathway */}
                          <polyline
                            points={pointsStr}
                            fill="none"
                            stroke={route.color}
                            strokeWidth="3.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="transition-all duration-300"
                          />
                          {/* Pulsing trail overlays for moving visual effect */}
                          <polyline
                            points={pointsStr}
                            fill="none"
                            stroke={
                              route.id === "R_138" ? "url(#roseGradient)" :
                              route.id === "R_120" ? "url(#skyGradient)" : "url(#tealGradient)"
                            }
                            strokeWidth="6"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="animate-flow"
                          />
                        </g>
                      );
                    })}

                    {/* Static Landmarks Labels */}
                    <g className="opacity-20 text-[9px] fill-slate-500 font-mono">
                      <text x="35" y="475">Indian Ocean</text>
                      <text x="40" y="240">Galle Face Green</text>
                      <text x="650" y="70">Kelani Valley Corridor</text>
                    </g>

                    {/* Bus Stops Pins on vector path */}
                    {stops.map((stop) => {
                      const { x, y } = getSVGCoords(stop.lat, stop.lng);
                      const isSelected = selectedStopId === stop.id;

                      return (
                        <g 
                          key={stop.id}
                          className="cursor-pointer transition-transform duration-150 active:scale-95"
                          onClick={() => {
                            setSelectedStopId(stop.id);
                            setSelectedBusId(null);
                          }}
                        >
                          {/* Stop shadow / glow halo */}
                          <circle
                            cx={x}
                            cy={y}
                            r={isSelected ? 10 : 6}
                            className={`transition-all duration-300 fill-indigo-500/10 stroke-indigo-500/20 ${
                              isSelected ? 'stroke-[3] opacity-100' : 'stroke-[1] opacity-60'
                            }`}
                          />
                          {/* Core stop point */}
                          <circle
                            cx={x}
                            cy={y}
                            r="4.5"
                            className={`transition-all duration-300 stroke-slate-950 stroke-[1.5] ${
                              isSelected ? 'fill-indigo-400' : 'fill-slate-500 hover:fill-indigo-300'
                            }`}
                          />
                        </g>
                      );
                    })}

                    {/* Animated Simulated Buses sliding smoothly */}
                    {buses.map((bus) => {
                      const { x, y } = getSVGCoords(bus.lat, bus.lng);
                      const isSelected = selectedBusId === bus.id;
                      const isShouting = shoutingBusId === bus.id;
                      const route = routes.find((r) => r.id === bus.routeId);

                      // Plate Color based on Bus Type
                      const markerBg = 
                        bus.type === "SLTB_RED" ? "#EF4444" : 
                        bus.type === "LUXURY_AC" ? "#14B8A6" : "#0EA5E9";

                      return (
                        <g 
                          key={bus.id}
                          className="cursor-pointer transition-all duration-300 pointer-events-auto"
                          onClick={() => {
                            setSelectedBusId(bus.id);
                            setSelectedStopId(null);
                          }}
                        >
                          {/* Radial Pulse under active moving bus */}
                          {bus.status === "MOVING" && (
                            <circle
                              cx={x}
                              cy={y}
                              r={isSelected ? 18 : 13}
                              fill="none"
                              stroke={markerBg}
                              strokeWidth="1.5"
                              className="animate-ping opacity-25"
                            />
                          )}

                          {/* Interactive Bus Pin */}
                          <g transform={`translate(${x - 9}, ${y - 9})`}>
                            <rect
                              width="18"
                              height="18"
                              rx="5"
                              fill={markerBg}
                              stroke="#ffffff"
                              strokeWidth={isSelected ? "2.5" : "1.2"}
                              className="transition-all duration-200 shadow-md"
                            />
                            {/* Direction Indicator chevron */}
                            <path
                              d={bus.direction === 1 ? "M6 11l3-3 3 3" : "M6 7l3 3 3-3"}
                              fill="none"
                              stroke="#ffffff"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                              className="opacity-90"
                            />
                          </g>

                          {/* Route Tag Overlay label next to active bus */}
                          {route && (
                            <g transform={`translate(${x + 12}, ${y - 12})`}>
                              <rect
                                width="34"
                                height="15"
                                rx="4"
                                fill="#0F172A"
                                stroke="#334155"
                                strokeWidth="1"
                                className="opacity-90"
                              />
                              <text
                                x="17"
                                y="11"
                                textAnchor="middle"
                                className="fill-slate-200 text-[8px] font-mono font-bold"
                              >
                                {route.number}
                              </text>
                            </g>
                          )}

                          {/* Speech bubble if Conductor is Shouting */}
                          {isShouting && (
                            <g transform={`translate(${x - 60}, ${y - 48})`} className="pointer-events-none">
                              <rect
                                width="120"
                                height="28"
                                rx="6"
                                fill="#F43F5E"
                                className="shadow-xl"
                              />
                              <text
                                x="60"
                                y="17"
                                textAnchor="middle"
                                className="fill-white text-[9px] font-sans font-extrabold truncate px-2"
                              >
                                PETTAH! PETTAH!
                              </text>
                              {/* Shout bubble tip arrow */}
                              <polygon
                                points="55,28 65,28 60,33"
                                fill="#F43F5E"
                              />
                            </g>
                          )}
                        </g>
                      );
                    })}
                  </svg>

                  {/* SVG Map Calibration Labels */}
                  <div className="absolute top-4 left-4 bg-slate-950/80 border border-slate-800/80 rounded-lg p-2 flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                    <Compass className="w-3.5 h-3.5 text-rose-500 animate-spin" style={{ animationDuration: "12s" }} />
                    <span>WP COLOMBO • 79.84E 6.88N</span>
                  </div>

                  {/* Dispatch Speed Modifier HUD */}
                  <div className="absolute bottom-4 left-4 bg-slate-950/80 border border-slate-800/80 rounded-lg py-1 px-2.5 text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>NTC STREAM FEED ACTIVE</span>
                  </div>

                  {/* Emergency Trigger Button on map corner */}
                  <div className="absolute bottom-4 right-4 flex gap-2">
                    <button 
                      onClick={dispatchSpecialBus}
                      className="bg-rose-600 hover:bg-rose-500 active:scale-95 text-white font-bold py-1.5 px-3 rounded-lg text-xs transition-all flex items-center gap-1 shadow-lg shadow-rose-950/40"
                    >
                    <PlusCircle className="w-3.5 h-3.5" /> Dispatch SLTB Special
                    </button>
                  </div>
                </div>

                {/* Simple Vector Map Info Legend Drawer */}
                <div className="mt-4 p-3 bg-slate-950/80 border border-slate-850 rounded-xl text-xs flex flex-wrap gap-4 justify-between items-center">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-indigo-400" />
                    <span className="text-slate-400">Map Focus:</span>
                    <span className="text-slate-200 font-semibold">
                      {selectedBusId ? `Tracking Bus ${buses.find(b => b.id === selectedBusId)?.plate}` : selectedStopId ? `Stop ${stops.find(s => s.id === selectedStopId)?.name}` : "None"}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    *Tip: Click any stop point or bus on the visual projection layout to audit real-time telemetry.
                  </div>
                </div>

              </div>
            )}

            {/* VIEW 2: CEYLON JOURNEY PLANNER & FARE CALCULATOR */}
            {activeTab === "planner" && (
              <div className="glass-panel rounded-2xl p-6 shadow-2xl flex-1 flex flex-col gap-6">
                <div>
                  <h3 className="text-md font-display font-bold text-white flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-emerald-400" /> NTC Stage Fare & Route Calculator
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Calculate official National Transport Commission Sri Lanka bus tickets stages, transfer paths, and standard fares.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Journey Input Form */}
                  <div className="space-y-4">
                    <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                        Origin Bus Stop (පිටත්වීම)
                      </label>
                      <select
                        value={plannerStart}
                        onChange={(e) => setPlannerStart(e.target.value)}
                        className="w-full bg-[#080B13] border border-slate-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                      >
                        {stops.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex justify-center">
                      <button 
                        onClick={() => {
                          const temp = plannerStart;
                          setPlannerStart(plannerEnd);
                          setPlannerEnd(temp);
                        }}
                        className="p-2 bg-slate-900 border border-slate-800 rounded-full hover:border-slate-700 hover:text-white"
                        title="Swap Origin and Destination"
                      >
                        <ArrowRightLeft className="w-4 h-4 text-indigo-400" />
                      </button>
                    </div>

                    <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                        Destination Bus Stop (ගමනාන්තය)
                      </label>
                      <select
                        value={plannerEnd}
                        onChange={(e) => setPlannerEnd(e.target.value)}
                        className="w-full bg-[#080B13] border border-slate-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                      >
                        {stops.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Calculated Results Area */}
                  <div className="flex flex-col justify-between">
                    {plannerResult ? (
                      <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-5 space-y-4 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs bg-indigo-600/20 text-indigo-400 font-bold px-2 py-0.5 rounded-full border border-indigo-500/20">
                            Best Route: {plannerResult.route.number}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">Stage Tariff Rates</span>
                        </div>

                        <div>
                          <div className="text-xs text-slate-400 font-medium">Estimated Ticket Fare</div>
                          <div className="flex items-baseline gap-2 mt-1">
                            <span className="text-3xl font-mono font-black text-emerald-400">Rs. {plannerResult.fareLkr}</span>
                            <span className="text-xs text-slate-500">LKR Stage Rate</span>
                          </div>
                          {/* AC Rate */}
                          <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-teal-400 inline-block" />
                            Luxury A/C Rate: <span className="font-bold text-teal-300">Rs. {plannerResult.fareLkr * 2} LKR</span>
                          </div>
                        </div>

                        {/* Staged itinerary metrics */}
                        <div className="grid grid-cols-2 gap-4 border-t border-slate-850 pt-3">
                          <div>
                            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Total distance</div>
                            <div className="text-sm font-mono font-bold text-white">{plannerResult.totalDistanceKm} km</div>
                          </div>
                          <div>
                            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Travel duration</div>
                            <div className="text-sm font-mono font-bold text-white">{plannerResult.durationMinutes} mins</div>
                          </div>
                        </div>

                        {/* List of stops in-between */}
                        <div className="border-t border-slate-850 pt-3">
                          <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2">Transit Stops stages ({plannerResult.stopsToTravel.length})</div>
                          <div className="flex flex-wrap gap-1.5 max-h-[80px] overflow-y-auto pr-1">
                            {plannerResult.stopsToTravel.map((s, index) => (
                              <span 
                                key={s.id} 
                                className={`text-[9px] px-2 py-0.5 rounded border ${
                                  index === 0 ? "bg-indigo-600/10 text-indigo-300 border-indigo-500/30" :
                                  index === plannerResult.stopsToTravel.length - 1 ? "bg-rose-600/10 text-rose-300 border-rose-500/30" :
                                  "bg-slate-900 text-slate-400 border-slate-800"
                                }`}
                              >
                                {s.name.split(" ")[0]}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Live active buses for boarding */}
                        <div className="border-t border-slate-850 pt-3">
                          <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2">Available Live Buses To Board</div>
                          <div className="space-y-1.5">
                            {plannerResult.availableBuses.length > 0 ? (
                              plannerResult.availableBuses.slice(0, 2).map(bus => (
                                <div key={bus.id} className="flex justify-between items-center text-[10px] bg-slate-950/50 p-2 rounded-lg border border-slate-850">
                                  <span className="font-mono text-indigo-300 font-bold">{bus.plate}</span>
                                  <span className={`px-1.5 py-0.2 rounded font-semibold ${
                                    bus.type === "SLTB_RED" ? "bg-rose-500/20 text-rose-300" :
                                    bus.type === "LUXURY_AC" ? "bg-teal-500/20 text-teal-300" : "bg-sky-500/20 text-sky-300"
                                  }`}>
                                    {bus.type.replace("_", " ")}
                                  </span>
                                  <span className="text-slate-400 font-medium">ETA: <b className="text-amber-400 font-bold">{bus.etaMinutes} mins</b></span>
                                </div>
                              ))
                            ) : (
                              <div className="text-[10px] text-slate-500 italic">No live active buses on route currently. Use dispatch admin to inject a bus.</div>
                            )}
                          </div>
                        </div>

                      </div>
                    ) : (
                      <div className="bg-slate-900/30 border border-slate-800/60 rounded-xl p-8 flex flex-col items-center justify-center text-center flex-1">
                        <HelpCircle className="w-8 h-8 text-slate-600 mb-2" />
                        <h4 className="text-xs font-bold text-slate-400">Direct Route Not Available</h4>
                        <p className="text-[11px] text-slate-500 mt-1 max-w-[200px]">
                          Please select valid connected Colombo stops along Route 138, 120, or 177 to evaluate stage pricing.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            )}

            {/* VIEW 3: STOP TIMETABLE DISPLAY BOARD */}
            {activeTab === "timetable" && (
              <div className="glass-panel rounded-2xl p-6 shadow-2xl flex-1 flex flex-col gap-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold font-display text-white">Digital Station Departure Signboard</h3>
                    <p className="text-xs text-slate-400">Simulating live LED platform displays at key high-level bus stops.</p>
                  </div>
                  
                  {/* Select stop dropdown */}
                  <select
                    value={selectedStopId || "S_MAHARAGAMA"}
                    onChange={(e) => setSelectedStopId(e.target.value)}
                    className="bg-slate-900 border border-slate-800 text-xs text-white rounded-xl p-2 focus:outline-none focus:border-indigo-500"
                  >
                    {stops.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                {/* Simulated Digital LED display stop board */}
                <div className="bg-[#04060C] border border-slate-800 rounded-xl overflow-hidden shadow-inner p-4 font-mono">
                  {/* LED Top Header */}
                  <div className="border-b border-amber-500/20 pb-3 flex justify-between text-amber-500 text-xs font-black tracking-widest uppercase">
                    <span>Stop: {focusedStop?.name}</span>
                    <span className="animate-pulse">Live Feed</span>
                  </div>

                  {/* LED Sinhala Title */}
                  <div className="text-[11px] text-slate-500 py-2">
                    {focusedStop?.sinhalaName}
                  </div>

                  {/* Incoming Grid */}
                  <div className="space-y-3 mt-3">
                    <div className="grid grid-cols-12 text-[10px] text-slate-400 font-bold uppercase border-b border-slate-800 pb-1">
                      <span className="col-span-2">Route</span>
                      <span className="col-span-4">Plate No</span>
                      <span className="col-span-3">Next Stop</span>
                      <span className="col-span-3 text-right">Estimated Arrival</span>
                    </div>

                    {incomingToStop.length > 0 ? (
                      incomingToStop.map((bus) => {
                        const route = routes.find(r => r.id === bus.routeId);
                        return (
                          <div 
                            key={bus.id} 
                            className="grid grid-cols-12 text-xs font-mono py-1.5 hover:bg-slate-900/50 rounded px-1 text-slate-200"
                          >
                            <span className="col-span-2 text-rose-400 font-bold">{route?.number}</span>
                            <span className="col-span-4 font-bold">{bus.plate}</span>
                            <span className="col-span-3 text-slate-400">{bus.nextStop.replace("S_", "")}</span>
                            <span className="col-span-3 text-right font-black text-amber-400 animate-pulse">
                              {bus.etaMinutes === 0 ? "Arriving Now" : `${bus.etaMinutes} mins`}
                            </span>
                          </div>
                        );
                      })
                    ) : (
                      <div className="py-6 text-center text-xs text-slate-500 italic">
                        No scheduled buses currently approaching {focusedStop?.name.split(" ")[0]}.
                      </div>
                    )}
                  </div>
                </div>

                {/* Additional Stop Amenities Card */}
                <div className="bg-slate-900 p-4 rounded-xl border border-slate-850 flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-300">Station Terminal Queue Size</h4>
                    <p className="text-[11px] text-slate-400 mt-1">Average waiting crowd currently boarding: <b>{focusedStop?.passengerCount} commuters</b></p>
                  </div>
                  <div className="flex gap-1.5">
                    {focusedStop?.amenities.map(a => (
                      <span key={a} className="text-[9px] bg-indigo-600/10 text-indigo-300 border border-indigo-500/20 px-2 py-0.5 rounded-lg">
                        {a}
                      </span>
                    ))}
                  </div>
                </div>

              </div>
            )}

            {/* VIEW 4: ACTIVE FLEET REGISTER */}
            {activeTab === "fleet" && (
              <div className="glass-panel rounded-2xl p-6 shadow-2xl flex-1 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold font-display text-white">Colombo Transit Fleet Audit</h3>
                    <p className="text-xs text-slate-400">Real-time GPS tracker parameters and driver assignments.</p>
                  </div>
                  
                  {/* Search Bar */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input 
                      type="text" 
                      placeholder="Search bus, plate, driver..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="bg-slate-900 border border-slate-800 text-xs rounded-xl pl-8 pr-3 py-1.5 text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Fleet Register Grid List */}
                <div className="space-y-3 overflow-y-auto max-h-[360px] pr-1">
                  {filteredBuses.map((bus) => {
                    const route = routes.find(r => r.id === bus.routeId);
                    const isSelected = selectedBusId === bus.id;

                    return (
                      <div 
                        key={bus.id}
                        onClick={() => setSelectedBusId(bus.id)}
                        className={`p-4 rounded-xl border transition-all cursor-pointer ${
                          isSelected 
                            ? "bg-slate-900 border-indigo-500 shadow-lg shadow-indigo-950/20" 
                            : "bg-slate-900/40 border-slate-800 hover:border-slate-700"
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono font-bold text-slate-100">{bus.plate}</span>
                              <span className={`text-[9px] px-2 py-0.5 rounded font-bold ${
                                bus.type === "SLTB_RED" ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" :
                                bus.type === "LUXURY_AC" ? "bg-teal-500/10 text-teal-400 border border-teal-500/20" :
                                "bg-sky-500/10 text-sky-400 border border-sky-500/20"
                              }`}>
                                {bus.type === "SLTB_RED" ? "SLTB Red Bus" : bus.type === "LUXURY_AC" ? "Leyland Luxury A/C" : "Private Standard"}
                              </span>
                              {bus.specialService && (
                                <span className="text-[9px] bg-amber-500/15 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded font-bold uppercase tracking-wider animate-pulse">
                                  {bus.specialService}
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 font-medium mt-1">
                              Route {route?.number}: {route?.name}
                            </div>
                          </div>

                          <div className="text-right">
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                              bus.status === "MOVING" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-slate-700/20 text-slate-400 border border-slate-700/20"
                            }`}>
                              {bus.status}
                            </span>
                            <div className="text-[10px] font-mono font-bold text-slate-300 mt-1.5">{bus.speed} km/h</div>
                          </div>
                        </div>

                        {/* Expandable active parameter details */}
                        <div className="grid grid-cols-4 gap-2 mt-3 pt-3 border-t border-slate-800 text-[10px] text-slate-400 font-medium">
                          <div>
                            <span className="text-slate-500 block uppercase font-bold text-[8px] tracking-wider">Driver</span>
                            <span className="text-slate-200 truncate block">{bus.driverName.split(" ")[0]}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block uppercase font-bold text-[8px] tracking-wider">Conductor</span>
                            <span className="text-slate-200 truncate block">{bus.conductorName.split(" ")[0]}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block uppercase font-bold text-[8px] tracking-wider">Load Count</span>
                            <span className="text-slate-200 block">{bus.passengers} / {bus.capacity} pax</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block uppercase font-bold text-[8px] tracking-wider">Battery Fuel</span>
                            <span className="text-slate-200 block">{bus.fuel}%</span>
                          </div>
                        </div>

                      </div>
                    );
                  })}
                </div>

              </div>
            )}

          </div>

        </div>

        {/* Right Hand Diagnostics & Active Terminal HUD (Span 3) */}
        <div className="lg:col-span-3 flex flex-col gap-6">
          
          {/* Detailed Telemetry Monitor Drawer */}
          <section className="glass-panel rounded-2xl p-5 shadow-xl flex-1 flex flex-col">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
              <Compass className="w-4 h-4 text-indigo-400" /> Live Audit Monitoring
            </h2>

            {focusedBus ? (
              <div className="space-y-4 flex-1 flex flex-col justify-between">
                <div>
                  {/* Bus Header */}
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-lg font-mono font-black text-white">{focusedBus.plate}</div>
                      <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">Vehicle License Ledger</div>
                    </div>
                    <div className={`p-2.5 rounded-xl ${
                      focusedBus.type === "SLTB_RED" ? "bg-rose-500/10 text-rose-400" :
                      focusedBus.type === "LUXURY_AC" ? "bg-teal-500/10 text-teal-400" : "bg-sky-500/10 text-sky-400"
                    }`}>
                      <BusIcon className="w-5 h-5" />
                    </div>
                  </div>

                  {/* Route Summary */}
                  <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-xl mt-3 text-xs">
                    <div className="text-slate-400 font-semibold flex items-center justify-between">
                      <span>Route {focusedRoute?.number}</span>
                      <span className="text-indigo-400 font-mono font-bold">STAGE FARE</span>
                    </div>
                    <p className="text-slate-300 font-medium mt-1 truncate">{focusedRoute?.name}</p>
                  </div>

                  {/* Staged Parameter Lists */}
                  <div className="space-y-3 mt-4 text-xs">
                    <div className="flex justify-between py-1.5 border-b border-slate-850">
                      <span className="text-slate-500 font-medium">Crew Driver</span>
                      <span className="text-slate-200 font-bold flex items-center gap-1">
                        <UserCheck className="w-3.5 h-3.5 text-indigo-400" /> {focusedBus.driverName}
                      </span>
                    </div>

                    <div className="flex justify-between py-1.5 border-b border-slate-850">
                      <span className="text-slate-500 font-medium">Crew Conductor</span>
                      <span className="text-slate-200 font-bold">{focusedBus.conductorName}</span>
                    </div>

                    <div className="flex justify-between py-1.5 border-b border-slate-850">
                      <span className="text-slate-500 font-medium">Telemetry Speed</span>
                      <span className="text-slate-200 font-mono font-bold text-amber-400">{focusedBus.speed} km/h</span>
                    </div>

                    <div className="flex justify-between py-1.5 border-b border-slate-850">
                      <span className="text-slate-500 font-medium">GPS Coordinates</span>
                      <span className="text-slate-200 font-mono text-[10px]">{focusedBus.lat.toFixed(4)}N, {focusedBus.lng.toFixed(4)}E</span>
                    </div>

                    <div className="flex justify-between py-1.5 border-b border-slate-850">
                      <span className="text-slate-500 font-medium">Battery Fuel Gauge</span>
                      <span className="text-slate-200 font-bold font-mono flex items-center gap-1">
                        <Fuel className="w-3.5 h-3.5 text-emerald-400" /> {focusedBus.fuel}%
                      </span>
                    </div>

                    <div className="flex justify-between py-1.5 border-b border-slate-850">
                      <span className="text-slate-500 font-medium">Next Stage Terminal</span>
                      <span className="text-slate-200 font-bold text-rose-400">{focusedBus.nextStop.replace("S_", "")}</span>
                    </div>
                  </div>

                  {/* Occupancy Indicator block */}
                  <div className="mt-4 bg-slate-900/40 p-3.5 rounded-xl border border-slate-800">
                    <div className="flex justify-between text-[10px] font-bold uppercase text-slate-500 mb-1.5">
                      <span>Occupancy Density</span>
                      <span className="text-slate-300 font-mono font-bold">{focusedBus.passengers} / {focusedBus.capacity} commuters</span>
                    </div>
                    <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-300 ${
                          focusedBus.occupancy === "Full House" ? "bg-rose-500 shadow-md shadow-rose-500/50" :
                          focusedBus.occupancy === "High" ? "bg-amber-500" :
                          focusedBus.occupancy === "Medium" ? "bg-indigo-500" : "bg-emerald-500"
                        }`} 
                        style={{ width: `${Math.round((focusedBus.passengers / focusedBus.capacity) * 100)}%` }} 
                      />
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-slate-400 mt-2">
                      <span>Status Profile:</span>
                      <span className={`font-bold uppercase ${
                        focusedBus.occupancy === "Full House" ? "text-rose-400" : "text-indigo-300"
                      }`}>{focusedBus.occupancy}</span>
                    </div>
                  </div>
                </div>

                {/* Dispatch action for targeted bus */}
                <div className="space-y-2 mt-4 pt-4 border-t border-slate-850">
                  <button 
                    onClick={() => triggerConductorShout(focusedBus.id)}
                    className="w-full bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                  >
                    <Volume2 className="w-4 h-4 animate-bounce" /> Ping Conductor Audio Shout
                  </button>
                  <button 
                    onClick={() => {
                      setAlerts(prev => [
                        {
                          id: Date.now(),
                          text: `SOS EMERGENCY SIGNAL from Crew Sunil Shantha (${focusedBus.plate}): Route 138 high passenger surge at Nugegoda.`,
                          time: "Just Now",
                          type: "alert"
                        },
                        ...prev
                      ]);
                    }}
                    className="w-full bg-rose-600/15 hover:bg-rose-600/25 text-rose-400 border border-rose-500/35 py-2 rounded-xl text-xs font-bold transition-all"
                  >
                    Declare Stage Congestion Alert
                  </button>
                </div>

              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center flex-1 py-12">
                <HelpCircle className="w-10 h-10 text-slate-700 mb-2" />
                <h4 className="text-xs font-bold text-slate-400">No Bus Audited</h4>
                <p className="text-[11px] text-slate-500 mt-1 max-w-[180px]">
                  Select an active bus plate on the command vector map or fleet register to trigger direct telemetry parameters.
                </p>
              </div>
            )}
          </section>

          {/* Colombo Weather delay prediction metrics */}
          <section className="glass-panel rounded-2xl p-5 shadow-xl">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
              <Compass className="w-4 h-4 text-indigo-400" /> Monsoonal Rain Factor
            </h2>
            <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-xl flex items-center justify-between text-xs">
              <div>
                <div className="font-bold text-white">Weather delay multiplier</div>
                <div className="text-[10px] text-slate-500 mt-0.5">Colombo Southwest Monsoon</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold font-mono text-amber-400">1.35x</div>
                <div className="text-[9px] text-emerald-400 font-bold uppercase">Moderate Impact</div>
              </div>
            </div>
          </section>

        </div>

      </main>

      {/* Humble professional credit footer */}
      <footer className="border-t border-slate-900 bg-[#060810] py-4 px-6 text-center text-[11px] text-slate-600 font-mono">
        Colombo Smart Bus Tracking Ledger • WP Sri Lanka Transportation Board (SLTB) Node Protocol • 2026.
      </footer>

    </div>
  );
}
