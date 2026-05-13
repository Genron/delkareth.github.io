import {useEffect, useRef} from "react";
import * as d3 from "d3";

let currentK = 1;

export default function ZoomableExternalSvg({
                                                url,
                                                minZoom = 0.5,
                                                maxZoom = 12,
                                                className = "",
                                                style = {},
                                            }) {
    const hostRef = useRef(null);

    useEffect(() => {
        let cancelled = false;
        let cleanup = () => {
        };

        const run = async () => {
            const host = hostRef.current;
            if (!host) return;

            // D3 parses the SVG into a Document, so we need the actual <svg> element.
            const doc = await d3.svg(url);
            if (cancelled || !hostRef.current) return;

            const sourceSvg = doc.documentElement;
            if (!sourceSvg || sourceSvg.tagName.toLowerCase() !== "svg") {
                throw new Error("Die geladene Datei enthält kein gültiges <svg>.");
            }

            host.replaceChildren();

            // Clone into the current document so D3 can work on it normally.
            const svg = document.importNode(sourceSvg, true);
            host.appendChild(svg);

            const root = d3.select(svg);

            root
                .attr("width", window.innerWidth)
                .attr("height", window.innerHeight)
                .style("display", "block")
                .style("touch-action", "none")
            ;

            // Keep defs at the root, move everything else into a viewport group.
            let viewport = svg.querySelector("g[data-zoom-viewport]");
            if (!viewport) {
                viewport = document.createElementNS("http://www.w3.org/2000/svg", "g");
                viewport.setAttribute("data-zoom-viewport", "true");

                const children = Array.from(svg.children);
                for (const child of children) {
                    if (child.tagName.toLowerCase() === "defs") continue;
                    viewport.appendChild(child);
                }

                svg.appendChild(viewport);
            }

            const viewportSel = d3.select(viewport);

            const syncVisibility = (k) => {
                // Elements may use:
                // data-min-zoom="2"
                // data-max-zoom="5"
                // If omitted, the bound is open-ended.
                viewportSel
                    .selectAll("[data-min-zoom], [data-max-zoom]")
                    .each(function () {
                        const el = this;
                        const minAttr = el.getAttribute("data-min-zoom");
                        const maxAttr = el.getAttribute("data-max-zoom");

                        const min = minAttr == null ? 0 : Number(minAttr);
                        const max = maxAttr == null ? Infinity : Number(maxAttr);

                        el.style.display = k >= min && k <= max ? "" : "none";
                    });
            };
          
            const syncColor = (k) => {
                // Elements may use:
                // data-min-zoom="2"
                // data-max-zoom="5"
                // If omitted, the bound is open-ended.
                viewportSel.selectAll("*")
                    .filter(function () {
                        return Array.from(this.attributes)
                            .some(attr => attr.name.startsWith("data-color"));
                    })
                    .each(function () {
                        const colorAttrs = Array.from(this.attributes)
                            .filter(attr => attr.name.startsWith("data-color"));

                        colorAttrs.forEach(attr => {
                            const kk = Number(attr.name.match(/data-color(-(.*))?/)[2]?.replace('_', '.') || 0);
                            if (k >= kk) {
                                this.style.fill = attr.value;
                            }
                        });
                    });
                viewportSel.selectAll("*")
                    .filter(function () {
                        return Array.from(this.attributes)
                            .some(attr => attr.name.startsWith("data-stroke"));
                    })
                    .each(function () {
                        const colorAttrs = Array.from(this.attributes)
                            .filter(attr => attr.name.startsWith("data-stroke"));

                        colorAttrs.forEach(attr => {
                            const kk = Number(attr.name.match(/data-stroke(-(.*))?/)[2]?.replace('_', '.') || 0);
                            if (k >= kk) {
                                this.style.stroke = attr.value;
                            }
                        });
                    });
            };

            const zoom = d3.zoom()
                .scaleExtent([minZoom, maxZoom])
                .on("zoom", (event) => {
                    viewportSel.attr("transform", event.transform);
                    if (event.transform.k !== currentK) {
                        currentK = event.transform.k;
                        syncVisibility(event.transform.k);
                        syncColor(event.transform.k);
                        host.style.backgroundColor = viewportSel.select('#background').style('fill');
                    }
                });

            root.call(zoom);
            syncVisibility(1);
            syncColor(1);   
            host.style.backgroundColor = viewportSel.select('#background').style('fill');

            cleanup = () => {
                root.on(".zoom", null);
            };
        };

        run();

        return () => {
            cancelled = true;
            cleanup();
            hostRef.current?.replaceChildren();
        };
    }, [url, minZoom, maxZoom]);

    return (
        <div
            ref={hostRef}
            className={className}
            style={{
                width: "100%",
                height: "100%",
                overflow: "hidden",
                backgroundColor: 'orange',
                ...style,
            }}
        />
    );
}
