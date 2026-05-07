import React, {useEffect, useLayoutEffect, useMemo, useRef, useState} from "react";
import * as d3 from "d3";
import {Castle, Compass, MapPin, Minus, Mountain, Plus, RotateCcw, Users} from "lucide-react";

// Adjust this path to match your project structure.
// In Vite, Next.js, or similar setups, importing the SVG as a URL is usually fine.
import delkarethUrl from "./delkareth.svg";

const KINGDOMS = [
    {
        id: "lysanthia",
        name: "Lysanthia",
        kind: "kingdom",
        info: "Waldreich und alte Kulturen.",
        x: 0,
        y: 0,
        fill: "rgb(65,93,50)",
        stroke: "rgb(51,68,42)",
    },
    {
        id: "unclaimed",
        name: "Unclaimed",
        kind: "wildlands",
        info: "Umkämpftes Niemandsland.",
        x: 0,
        y: 0,
        fill: "rgb(226,213,182)",
        stroke: "rgb(165,156,134)",
    },
    {
        id: "graumark",
        name: "Graumark",
        kind: "kingdom",
        info: "Berge, Pässe und Festungen.",
        x: 0,
        y: 0,
        fill: "rgb(158,162,167)",
        stroke: "rgb(100,103,106)",
    },
    {
        id: "shalkaar",
        name: "Shalkaar",
        kind: "kingdom",
        info: "Unbekanntes Land umwoben von Mythen und Legenden.",
        x: 0,
        y: 0,
        fill: "rgb(66,66,66)",
        stroke: "rgb(27,27,27)",
    },
    {
        id: "valryndor",
        name: "Valryndor",
        kind: "kingdom",
        info: "Reiches Kernland mit vielen Städten.",
        x: 0,
        y: 0,
        fill: "rgb(137,193,199)",
        stroke: "rgb(87,122,126)",
    },
    {
        id: "tyrasalar",
        name: "Tyras Alar",
        kind: "kingdom",
        info: "Grenzland mit vielen alten Narben.",
        x: 0,
        y: 0,
        fill: "rgb(192,188,130)",
        stroke: "rgb(119,116,80)",
    },
    {
        id: "azmaran",
        name: "Azmaran",
        kind: "kingdom",
        info: "Händler und Piraten.",
        x: 0,
        y: 0,
        fill: "rgb(255,207,110)",
        stroke: "rgb(180,146,78)",
    },
    {
        id: "eldarion",
        name: "Eldarion",
        kind: "kingdom",
        info: "Hoher Norden voller Eis und Schnee.",
        x: 0,
        y: 0,
        fill: "rgb(214,211,211)",
        stroke: "rgb(133,133,133)",
    },
];

const MARKERS = [
    {
        id: "city-aelvar",
        name: "Aelvar",
        kind: "city",
        layer: "cities",
        x: 338,
        y: 262,
        info: "Hauptstadt am Fluss.",
        ruler: "Fürstin Rhea",
    },
    {
        id: "city-karnhold",
        name: "Karnhold",
        kind: "city",
        layer: "cities",
        x: 468,
        y: 186,
        info: "Bergfestung und Erzstadt.",
        ruler: "Rat der Zehn",
    },
    {
        id: "place-shadowwood",
        name: "Schattenwald",
        kind: "place",
        layer: "places",
        x: 374,
        y: 336,
        info: "Dichter Wald mit alten Steinen.",
    },
    {
        id: "place-drachenpass",
        name: "Drachenpass",
        kind: "place",
        layer: "places",
        x: 452,
        y: 92,
        info: "Enger Pass zwischen Bergen.",
    },
    {
        id: "npc-maera",
        name: "Maera die Kartenmacherin",
        kind: "person",
        layer: "people",
        x: 327,
        y: 274,
        info: "Kennt geheime Wege und alte Grenzen.",
    },
    {
        id: "npc-thoren",
        name: "Thoren Eisenhand",
        kind: "person",
        layer: "people",
        x: 474,
        y: 193,
        info: "Wächter der Bergpässe.",
    },
];

const LAYER_RULES = {
    kingdoms: 1,
    cities: 4,
    places: 6,
    people: 8,
};

const KINGDOM_LABEL_POSITIONS = {
    lysanthia: { x: 170, y: 275 },
    unclaimed: { x: 365, y: 405 },
    graumark: { x: 565, y: 180 },
    shalkaar: { x: 585, y: 470 },
    valryndor: { x: 340, y: 404 },
    tyrasalar: { x: 525, y: 315 },
    azmaran: { x: 150, y: 486 },
    eldarion: { x: 0, y: 0 },
};

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function layerVisible(layer, zoom) {
    return zoom >= LAYER_RULES[layer];
}

function zoomToScale(zoom) {
    return 0.8 + zoom * 0.25;
}

function iconFor(kind, size) {
    if (kind === "city") return <MapPin size={size} />;
    if (kind === "place") return <Compass size={size} />;
    if (kind === "person") return <Users size={size} />;
    if (kind === "kingdom") return <Castle size={size} />;
    return <Mountain size={size} />;
}

function PanelCard({ children }) {
    return <div className="rounded-2xl border border-slate-800 bg-slate-900/70 shadow-2xl">{children}</div>;
}

function PanelButton({ onClick, children, title }) {
    return (
        <button
            type="button"
            onClick={onClick}
            title={title}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700 bg-slate-800 text-slate-100 transition hover:bg-slate-700 active:scale-95"
        >
            {children}
        </button>
    );
}

export default function D3DnDWorldMapWithSvg() {
    const svgRef = useRef(null);
    const zoomBehaviorRef = useRef(null);
    const [transform, setTransform] = useState(d3.zoomIdentity);
    const [selected, setSelected] = useState(null);
    const [svgInner, setSvgInner] = useState("");
    const [labelPositions, setLabelPositions] = useState(KINGDOM_LABEL_POSITIONS);

    const zoomLevel = transform.k;

    const visibleLayers = useMemo(
        () => ({
            kingdoms: layerVisible("kingdoms", zoomLevel),
            cities: layerVisible("cities", zoomLevel),
            places: layerVisible("places", zoomLevel),
            people: layerVisible("people", zoomLevel),
        }),
        [zoomLevel]
    );

    useEffect(() => {
        let cancelled = false;

        fetch(delkarethUrl)
            .then((response) => response.text())
            .then((xmlText) => {
                if (cancelled) return;
                const doc = new DOMParser().parseFromString(xmlText, "image/svg+xml");
                const group = doc.querySelector("#delkareth");
                setSvgInner(group?.outerHTML ?? "");
            })
            .catch(() => {
                if (!cancelled) setSvgInner("");
            });

        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        if (!svgRef.current) return;

        const svg = d3.select(svgRef.current);
        const zoomBehavior = d3
            .zoom()
            .scaleExtent([0.8, 10])
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

    useLayoutEffect(() => {
        if (!svgRef.current || !svgInner) return;

        const nextLabels = {};

        KINGDOMS.forEach((kingdom) => {
            const el = svgRef.current?.querySelector<SVGPathElement>(`#${kingdom.id}`);
            if (!el) {
                nextLabels[kingdom.id] = KINGDOM_LABEL_POSITIONS[kingdom.id];
                return;
            }

            try {
                const box = el.getBBox();
                nextLabels[kingdom.id] = {
                    x: box.x + box.width / 2,
                    y: box.y + box.height / 2,
                };
            } catch {
                nextLabels[kingdom.id] = KINGDOM_LABEL_POSITIONS[kingdom.id];
            }
        });

        setLabelPositions(nextLabels);
    }, [svgInner]);

    useEffect(() => {
        if (!svgRef.current || !svgInner) return;

        KINGDOMS.forEach((kingdom) => {
            const el = svgRef.current?.querySelector<SVGPathElement>(`#${kingdom.id}`);
            if (!el) return;

            const isSelected = selected?.id === kingdom.id;
            el.style.fill = isSelected ? "rgba(250, 204, 21, 0.72)" : kingdom.fill;
            el.style.stroke = isSelected ? "rgba(253, 224, 71, 1)" : kingdom.stroke;
            el.style.strokeWidth = isSelected ? "4" : "2";
            el.style.opacity = selected && !isSelected ? "0.7" : "1";
            el.style.cursor = "pointer";
            el.style.transition = "fill 160ms ease, stroke 160ms ease, opacity 160ms ease";
        });
    }, [selected, svgInner]);

    const applyTransform = (next) => {
        if (!svgRef.current || !zoomBehaviorRef.current) return;
        const svg = d3.select(svgRef.current);
        svg.transition().duration(180).call(zoomBehaviorRef.current.transform, next);
    };

    const zoomBy = (factor) => {
        const next = clamp(transform.k * factor, 0.8, 10);
        const centered = d3.zoomIdentity.translate(transform.x, transform.y).scale(next);
        applyTransform(centered);
    };

    const resetView = () => {
        setSelected(null);
        applyTransform(d3.zoomIdentity);
    };

    const onSvgClick = (event) => {
        const target = event.target;
        if (!target?.id) return;

        const kingdom = KINGDOMS.find((entry) => entry.id === target.id);
        if (kingdom) {
            setSelected(kingdom);
            return;
        }

        const marker = MARKERS.find((entry) => entry.id === target.id);
        if (marker) {
            setSelected(marker);
        }
    };

    const onMarkerClick = (marker) => {
        setSelected(marker);
    };

    return (
        <div className="min-h-screen w-full bg-slate-950 p-4 text-slate-100">
            <div className="mx-auto grid max-w-7xl gap-4 lg:grid-cols-[1fr_340px]">
                <PanelCard>
                    <div className="flex items-center justify-between gap-3 border-b border-slate-800 px-4 py-3">
                        <div>
                            <h1 className="text-xl font-semibold">Interaktive DnD-Weltkarte</h1>
                            <p className="text-sm text-slate-400">Delkareth als SVG, mit D3-Zoom, Pan und einblendbaren Details.</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <PanelButton onClick={() => zoomBy(0.8)} title="Zoom out">
                                <Minus className="h-4 w-4" />
                            </PanelButton>
                            <PanelButton onClick={() => zoomBy(1.25)} title="Zoom in">
                                <Plus className="h-4 w-4" />
                            </PanelButton>
                            <PanelButton onClick={resetView} title="Ansicht zurücksetzen">
                                <RotateCcw className="h-4 w-4" />
                            </PanelButton>
                        </div>
                    </div>

                    <div className="relative h-[78vh] w-full overflow-hidden bg-[radial-gradient(circle_at_center,rgba(148,163,184,0.14),transparent_45%),linear-gradient(180deg,rgba(2,6,23,1),rgba(15,23,42,1))]">
                        <svg
                            ref={svgRef}
                            viewBox="0 0 744.72729 558.54547"
                            preserveAspectRatio="xMidYMid meet"
                            className="h-full w-full select-none"
                            onClick={onSvgClick}
                        >
                            <defs>
                                <filter id="glow">
                                    <feGaussianBlur stdDeviation="2.2" result="blur" />
                                    <feMerge>
                                        <feMergeNode in="blur" />
                                        <feMergeNode in="SourceGraphic" />
                                    </feMerge>
                                </filter>
                                <linearGradient id="water" x1="0" x2="0" y1="0" y2="1">
                                    <stop offset="0%" stopColor="#0f172a" />
                                    <stop offset="100%" stopColor="#08101d" />
                                </linearGradient>
                            </defs>

                            <rect width="744.72729" height="558.54547" fill="url(#water)" />
                            <g transform={transform.toString()}>
                                {svgInner ? <g dangerouslySetInnerHTML={{ __html: svgInner }} /> : null}

                                {visibleLayers.kingdoms &&
                                    KINGDOMS.map((kingdom) => {
                                        const pos = labelPositions[kingdom.id] ?? KINGDOM_LABEL_POSITIONS[kingdom.id];
                                        return (
                                            <g key={kingdom.id} pointerEvents="none" filter="url(#glow)">
                                                <text
                                                    x={pos.x}
                                                    y={pos.y}
                                                    textAnchor="middle"
                                                    className="fill-white text-[12px] font-semibold tracking-wide drop-shadow"
                                                    style={{ paintOrder: "stroke fill" }}
                                                    stroke="rgba(15, 23, 42, 0.95)"
                                                    strokeWidth="3"
                                                    strokeLinejoin="round"
                                                >
                                                    {kingdom.name}
                                                </text>
                                            </g>
                                        );
                                    })}

                                {MARKERS.map((marker) => {
                                    if (!visibleLayers[marker.layer]) return null;

                                    const size = marker.kind === "city" ? 15 : marker.kind === "person" ? 11 : 13;
                                    const isSelected = selected?.id === marker.id;

                                    return (
                                        <g
                                            key={marker.id}
                                            transform={`translate(${marker.x}, ${marker.y})`}
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                onMarkerClick(marker);
                                            }}
                                            style={{ cursor: "pointer" }}
                                        >
                                            <circle
                                                r={isSelected ? size * 1.45 : size}
                                                fill={isSelected ? "rgba(250, 204, 21, 0.35)" : "rgba(15, 23, 42, 0.78)"}
                                                stroke={isSelected ? "rgba(253, 224, 71, 1)" : "rgba(226, 232, 240, 0.8)"}
                                                strokeWidth={isSelected ? 4 : 2}
                                            />
                                            <foreignObject x={size + 8} y={-18} width={220} height={42} style={{ pointerEvents: "none" }}>
                                                <div className="flex items-center gap-2 text-left text-white drop-shadow">
                                                    {iconFor(marker.kind, Math.max(12, Math.round(size * 0.9)))}
                                                    <div>
                                                        <div className="text-sm font-semibold leading-none">{marker.name}</div>
                                                        <div className="text-[11px] uppercase tracking-[0.24em] text-slate-300/80">{marker.kind}</div>
                                                    </div>
                                                </div>
                                            </foreignObject>
                                        </g>
                                    );
                                })}
                            </g>
                        </svg>
                    </div>
                </PanelCard>

                <PanelCard>
                    <div className="p-4">
                        <div className="mb-4 flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-semibold">Layer</h2>
                                <p className="text-sm text-slate-400">Aktiv bei aktueller Zoomstufe</p>
                            </div>
                            <span className="inline-flex rounded-full border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs text-slate-100">Zoom {zoomLevel.toFixed(1)}</span>
                        </div>

                        <div className="space-y-2 text-sm">
                            {[
                                ["kingdoms", "Königreiche"],
                                ["cities", "Städte"],
                                ["places", "Orte"],
                                ["people", "Personen"],
                            ].map(([key, label]) => {
                                const active = visibleLayers[key];
                                return (
                                    <div key={key} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2">
                                        <span>{label}</span>
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
                                <p className="text-sm text-slate-400">Klicke auf ein Königreich oder einen Marker.</p>
                            )}
                        </div>

                        <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/50 p-4 text-sm text-slate-300">
                            <p className="font-semibold text-slate-100">Hinweis</p>
                            <p className="mt-2">
                                Das SVG wird direkt geladen und die einzelnen Path-IDs bleiben anklickbar. So kannst du später weitere Ebenen,
                                Marker oder Kampagnen-Informationen sauber darauf aufbauen.
                            </p>
                        </div>
                    </div>
                </PanelCard>
            </div>
        </div>
    );
}
