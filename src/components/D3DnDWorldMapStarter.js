import React, { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import { Castle, Compass, MapPin, Mountain, Minus, Plus, RotateCcw, Users } from "lucide-react";

const WORLD = {
    width: 2400,
    height: 1600,
    layers: {
        continents: [
            { id: "continent", name: "Eldoria", x: 1120, y: 790, kind: "continent", info: "Der große Kontinent." },
        ],
        borders: [
            { id: "kingdom-north", name: "Nordmark", x: 760, y: 410, kind: "kingdom", info: "Grenzreich mit kalten Bergen." },
            { id: "kingdom-south", name: "Sonnenbund", x: 1420, y: 1080, kind: "kingdom", info: "Fruchtbare Handelsländer." },
            { id: "kingdom-west", name: "Grauküste", x: 430, y: 860, kind: "kingdom", info: "Seefahrer und alte Ruinen." },
        ],
        cities: [
            { id: "city-1", name: "Aelvar", x: 980, y: 700, kind: "city", ruler: "Fürstin Rhea", info: "Hauptstadt am Fluss." },
            { id: "city-2", name: "Karnhold", x: 1330, y: 520, kind: "city", ruler: "Rat der Zehn", info: "Bergfestung und Erzstadt." },
            { id: "city-3", name: "Lunhafen", x: 560, y: 980, kind: "city", ruler: "Admiral Soren", info: "Großer Hafen an der Westküste." },
            { id: "city-4", name: "Velmora", x: 1630, y: 1040, kind: "city", ruler: "Bürgermeisterin Ilya", info: "Wein und Tempel." },
        ],
        places: [
            { id: "place-1", name: "Schattenwald", x: 1110, y: 900, kind: "place", info: "Dichter Wald mit alten Steinen." },
            { id: "place-2", name: "Drachenpass", x: 1210, y: 320, kind: "place", info: "Enger Pass zwischen Bergen." },
            { id: "place-3", name: "Aschenruine", x: 1710, y: 620, kind: "place", info: "Verlassene Tempelanlage." },
            { id: "place-4", name: "Silbermoor", x: 770, y: 1230, kind: "place", info: "Nebelgebiet mit alchemistischen Kräutern." },
        ],
        people: [
            { id: "npc-1", name: "Maera die Kartenmacherin", x: 1020, y: 760, kind: "person", info: "Kennt geheime Wege und alte Grenzen." },
            { id: "npc-2", name: "Thoren Eisenhand", x: 1340, y: 560, kind: "person", info: "Wächter der Bergpässe." },
            { id: "npc-3", name: "Niva vom Nebel", x: 1580, y: 1080, kind: "person", info: "Informantin aus Velmora." },
        ],
    },
};

const LAYER_RULES = {
    continents: 1,
    borders: 2.2,
    cities: 4,
    places: 6,
    people: 8,
};

const layerList = [
    { key: "continents", label: "Kontinent" },
    { key: "borders", label: "Grenzen" },
    { key: "cities", label: "Städte" },
    { key: "places", label: "Orte" },
    { key: "people", label: "Personen" },
];

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function markerSize(kind, zoom) {
    const base = kind === "continent" ? 26 : kind === "kingdom" ? 18 : kind === "city" ? 14 : kind === "place" ? 12 : 10;
    return base * (0.72 + zoom * 0.08);
}

function MarkerIcon({ kind, size }) {
    if (kind === "continent") return <Mountain size={size} />;
    if (kind === "kingdom") return <Castle size={size} />;
    if (kind === "city") return <MapPin size={size} />;
    if (kind === "person") return <Users size={size} />;
    return <Compass size={size} />;
}

function visibleForZoom(kind, zoom) {
    return zoom >= LAYER_RULES[kind];
}

export default function D3DnDWorldMapStarter() {
    const svgRef = useRef(null);
    const zoomBehaviorRef = useRef(null);
    const [transform, setTransform] = useState(d3.zoomIdentity.translate(0, 0).scale(1));
    const [selected, setSelected] = useState(null);

    const zoomLevel = transform.k;
    const allItems = [
        ...WORLD.layers.continents,
        ...WORLD.layers.borders,
        ...WORLD.layers.cities,
        ...WORLD.layers.places,
        ...WORLD.layers.people,
    ];

    const visibleLayers = useMemo(
        () => ({
            continents: visibleForZoom("continents", zoomLevel),
            borders: visibleForZoom("borders", zoomLevel),
            cities: visibleForZoom("cities", zoomLevel),
            places: visibleForZoom("places", zoomLevel),
            people: visibleForZoom("people", zoomLevel),
        }),
        [zoomLevel]
    );

    useEffect(() => {
        if (!svgRef.current) return;

        const svg = d3.select(svgRef.current);

        const zoomBehavior = d3
            .zoom()
            .scaleExtent([1, 10])
            .on("zoom", (event) => {
                setTransform(event.transform);
            });

        zoomBehaviorRef.current = zoomBehavior;
        svg.call(zoomBehavior);

        svg.on("dblclick.zoom", null);

        return () => {
            svg.on(".zoom", null);
        };
    }, []);

    const applyTransform = (next) => {
        if (!svgRef.current || !zoomBehaviorRef.current) return;
        const svg = d3.select(svgRef.current);
        svg.transition().duration(180).call(zoomBehaviorRef.current.transform, next);
    };

    const zoomBy = (factor) => {
        if (!svgRef.current) return;
        const centered = d3.zoomIdentity.translate(transform.x, transform.y).scale(clamp(transform.k * factor, 1, 10));
        applyTransform(centered);
    };

    const resetView = () => {
        applyTransform(d3.zoomIdentity);
        setSelected(null);
    };

    const layerVisible = (kind) => {
        if (kind === "continent") return visibleLayers.continents;
        if (kind === "kingdom") return visibleLayers.borders;
        if (kind === "city") return visibleLayers.cities;
        if (kind === "place") return visibleLayers.places;
        return visibleLayers.people;
    };

    return (
        <div className="min-h-screen w-full bg-slate-950 p-4 text-slate-100">
            <div className="mx-auto grid max-w-7xl gap-4 lg:grid-cols-[1fr_340px]">
                <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70 shadow-2xl">
                    <div className="flex items-center justify-between gap-3 border-b border-slate-800 px-4 py-3">
                        <div>
                            <h1 className="text-xl font-semibold">Interaktive DnD-Weltkarte mit D3</h1>
                            <p className="text-sm text-slate-400">Wheel zum Zoomen, ziehen zum Verschieben, Marker klicken für Details.</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => zoomBy(0.8)}
                                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700 bg-slate-800 text-slate-100 transition hover:bg-slate-700 active:scale-95"
                            >
                                <Minus className="h-4 w-4" />
                            </button>
                            <button
                                type="button"
                                onClick={() => zoomBy(1.25)}
                                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700 bg-slate-800 text-slate-100 transition hover:bg-slate-700 active:scale-95"
                            >
                                <Plus className="h-4 w-4" />
                            </button>
                            <button
                                type="button"
                                onClick={resetView}
                                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700 bg-slate-800 text-slate-100 transition hover:bg-slate-700 active:scale-95"
                            >
                                <RotateCcw className="h-4 w-4" />
                            </button>
                        </div>
                    </div>

                    <div className="relative h-[78vh] w-full overflow-hidden bg-[radial-gradient(circle_at_center,rgba(148,163,184,0.14),transparent_45%),linear-gradient(180deg,rgba(2,6,23,1),rgba(15,23,42,1))]">
                        <svg ref={svgRef} viewBox={`0 0 ${WORLD.width} ${WORLD.height}`} className="h-full w-full select-none">
                            <defs>
                                <filter id="glow">
                                    <feGaussianBlur stdDeviation="2.5" result="blur" />
                                    <feMerge>
                                        <feMergeNode in="blur" />
                                        <feMergeNode in="SourceGraphic" />
                                    </feMerge>
                                </filter>
                                <linearGradient id="land" x1="0" x2="1" y1="0" y2="1">
                                    <stop offset="0%" stopColor="#2b3a22" />
                                    <stop offset="100%" stopColor="#4c6032" />
                                </linearGradient>
                                <linearGradient id="sea" x1="0" x2="0" y1="0" y2="1">
                                    <stop offset="0%" stopColor="#0f172a" />
                                    <stop offset="100%" stopColor="#08101d" />
                                </linearGradient>
                                <pattern id="grid" width="120" height="120" patternUnits="userSpaceOnUse">
                                    <path d="M 120 0 L 0 0 0 120" fill="none" stroke="rgba(148,163,184,0.08)" strokeWidth="1" />
                                </pattern>
                            </defs>

                            <rect width={WORLD.width} height={WORLD.height} fill="url(#sea)" />
                            <rect width={WORLD.width} height={WORLD.height} fill="url(#grid)" />

                            <g transform={transform.toString()}>
                                <ellipse cx={1150} cy={820} rx={640} ry={470} fill="url(#land)" opacity="0.95" />
                                <ellipse cx={1160} cy={820} rx={640} ry={470} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="10" />

                                {visibleLayers.borders && (
                                    <g opacity={0.9}>
                                        <path d="M 690 550 C 860 450, 960 470, 1080 540" stroke="rgba(226,232,240,0.68)" strokeWidth="7" fill="none" strokeDasharray="18 12" />
                                        <path d="M 1040 560 C 1220 500, 1360 470, 1505 560" stroke="rgba(226,232,240,0.68)" strokeWidth="7" fill="none" strokeDasharray="18 12" />
                                        <path d="M 760 1010 C 940 940, 1120 940, 1280 1000" stroke="rgba(226,232,240,0.68)" strokeWidth="7" fill="none" strokeDasharray="18 12" />
                                    </g>
                                )}

                                <g filter="url(#glow)">
                                    {allItems.map((item) => {
                                        if (!layerVisible(item.kind)) return null;

                                        const size = markerSize(item.kind, zoomLevel);
                                        const highlighted = selected?.id === item.id;

                                        return (
                                            <g
                                                key={item.id}
                                                transform={`translate(${item.x}, ${item.y})`}
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    setSelected(item);
                                                }}
                                                style={{ cursor: "pointer" }}
                                            >
                                                <circle
                                                    r={highlighted ? size * 1.35 : size}
                                                    fill={highlighted ? "rgba(250,204,21,0.32)" : "rgba(15,23,42,0.72)"}
                                                    stroke={highlighted ? "rgba(250,204,21,0.95)" : "rgba(226,232,240,0.7)"}
                                                    strokeWidth={highlighted ? 4 : 2}
                                                />
                                                <foreignObject x={size + 8} y={-18} width={280} height={42} style={{ pointerEvents: "none" }}>
                                                    <div className="flex items-center gap-2 text-left text-white drop-shadow">
                                                        <MarkerIcon kind={item.kind} size={Math.max(12, Math.round(size * 0.9))} />
                                                        <div>
                                                            <div className="text-sm font-semibold leading-none">{item.name}</div>
                                                            <div className="text-[11px] uppercase tracking-[0.24em] text-slate-300/80">{item.kind}</div>
                                                        </div>
                                                    </div>
                                                </foreignObject>
                                            </g>
                                        );
                                    })}
                                </g>
                            </g>
                        </svg>
                    </div>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-900/70 shadow-2xl">
                    <div className="p-4">
                        <div className="mb-4 flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-semibold">Layer</h2>
                                <p className="text-sm text-slate-400">Aktiv bei aktueller Zoomstufe</p>
                            </div>
                            <span className="inline-flex rounded-full border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs text-slate-100">Zoom {zoomLevel.toFixed(1)}</span>
                        </div>

                        <div className="space-y-2 text-sm">
                            {layerList.map((layer) => {
                                const active =
                                    layer.key === "continents"
                                        ? visibleLayers.continents
                                        : layer.key === "borders"
                                            ? visibleLayers.borders
                                            : layer.key === "cities"
                                                ? visibleLayers.cities
                                                : layer.key === "places"
                                                    ? visibleLayers.places
                                                    : visibleLayers.people;

                                return (
                                    <div key={layer.key} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2">
                                        <span>{layer.label}</span>
                                        <span className={active ? "text-emerald-400" : "text-slate-500"}>{active ? "sichtbar" : "ausgeblendet"}</span>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
                            <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Ausgewählt</h3>
                            {selected ? (
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <span className="inline-flex rounded-full border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs text-slate-100">{selected.kind}</span>
                                        <span className="text-base font-semibold">{selected.name}</span>
                                    </div>
                                    {selected.ruler ? <p className="text-sm text-slate-300">Herrschaft: {selected.ruler}</p> : null}
                                    <p className="text-sm text-slate-300">{selected.info}</p>
                                    <p className="text-xs text-slate-500">Position: {Math.round(selected.x)}, {Math.round(selected.y)}</p>
                                </div>
                            ) : (
                                <p className="text-sm text-slate-400">Klicke auf einen Marker, um Details zu sehen.</p>
                            )}
                        </div>

                        <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/50 p-4 text-sm text-slate-300">
                            <p className="font-semibold text-slate-100">Nächster sinnvoller Ausbau</p>
                            <p className="mt-2">
                                Lege die Daten in JSON ab und verbinde später Regionsfilter, Kampagnen-Notizen oder ein minimales Suchfeld.
                                D3 ist hier vor allem stark für Zoom, Pan und datengetriebene Layer.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
