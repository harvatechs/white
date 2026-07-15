"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";

interface MarkovGraphProps {
  edges: { fromToken: string; toToken: string; weight: number }[];
  maxNodes?: number;
}

interface GraphNode {
  id: string;
  x: number;
  y: number;
  radius: number;
  label: string;
  totalWeight: number;
}

interface GraphEdge {
  from: GraphNode;
  to: GraphNode;
  weight: number;
  normalizedWeight: number;
}

// A simple, deterministic force-layout-free graph layout.
// Nodes are placed on concentric rings based on their frequency.
// The most-connected node goes in the center; others radiate outward.
export function MarkovGraph({ edges, maxNodes = 10 }: MarkovGraphProps) {
  const { nodes, links } = useMemo(() => {
    if (edges.length === 0) return { nodes: [] as GraphNode[], links: [] as GraphEdge[] };

    // collect all unique tokens and their total weight
    const tokenWeights = new Map<string, number>();
    const topEdges = edges.slice(0, maxNodes * 2);

    for (const e of topEdges) {
      tokenWeights.set(e.fromToken, (tokenWeights.get(e.fromToken) ?? 0) + e.weight);
      tokenWeights.set(e.toToken, (tokenWeights.get(e.toToken) ?? 0) + e.weight);
    }

    // sort tokens by weight, take top N
    const sorted = Array.from(tokenWeights.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, maxNodes);

    const maxWeight = sorted[0]?.[1] ?? 1;

    // place nodes on rings
    const cx = 150;
    const cy = 130;
    const nodes: GraphNode[] = sorted.map(([token, totalWeight], i) => {
      const normalizedSize = totalWeight / maxWeight;
      const radius = 14 + normalizedSize * 22; // 14..36
      if (i === 0) {
        return { id: token, x: cx, y: cy, radius, label: token, totalWeight };
      }
      // place on rings: ring 1 = 3 nodes, ring 2 = 6, ring 3 = 9...
      const ringIndex = Math.ceil((i) / 3);
      const ringRadius = 45 + ringIndex * 38;
      const nodesInRing = Math.min(3 * ringIndex, sorted.length - 1 - (3 * (ringIndex - 1)));
      const angleInRing = i - (3 * (ringIndex - 1)) - 1;
      const angleStep = (2 * Math.PI) / Math.max(nodesInRing, 1);
      const angle = angleInRing * angleStep - Math.PI / 2;
      return {
        id: token,
        x: cx + ringRadius * Math.cos(angle),
        y: cy + ringRadius * Math.sin(angle),
        radius,
        label: token,
        totalWeight,
      };
    });

    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    const links: GraphEdge[] = [];
    const maxEdgeWeight = Math.max(...topEdges.map((e) => e.weight), 1);

    for (const e of topEdges) {
      const from = nodeMap.get(e.fromToken);
      const to = nodeMap.get(e.toToken);
      if (from && to && from.id !== to.id) {
        links.push({
          from,
          to,
          weight: e.weight,
          normalizedWeight: e.weight / maxEdgeWeight,
        });
      }
    }

    return { nodes, links };
  }, [edges, maxNodes]);

  if (edges.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <p className="text-[12.5px] text-foreground/45">No transitions to graph yet.</p>
        <p className="mt-1 text-[11px] text-foreground/35">Search more to teach the chain.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl ws-hairline">
      <svg viewBox="0 0 300 260" className="w-full" style={{ maxHeight: 260 }}>
        <defs>
          <marker
            id="ws-arrow"
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="5"
            markerHeight="5"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--ws-accent)" opacity="0.5" />
          </marker>
        </defs>

        {/* edges */}
        {links.map((link, i) => {
          const dx = link.to.x - link.from.x;
          const dy = link.to.y - link.from.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 1) return null;
          // shorten the line so it starts/ends at the node edge
          const ux = dx / dist;
          const uy = dy / dist;
          const x1 = link.from.x + ux * link.from.radius;
          const y1 = link.from.y + uy * link.from.radius;
          const x2 = link.to.x - ux * (link.to.radius + 4);
          const y2 = link.to.y - uy * (link.to.radius + 4);
          const strokeWidth = 1 + link.normalizedWeight * 3;
          return (
            <motion.line
              key={`edge-${i}`}
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 0.3 + link.normalizedWeight * 0.4 }}
              transition={{ duration: 0.5, delay: i * 0.03 }}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="var(--ws-accent)"
              strokeWidth={strokeWidth}
              markerEnd="url(#ws-arrow)"
            />
          );
        })}

        {/* nodes */}
        {nodes.map((node, i) => (
          <motion.g
            key={`node-${node.id}`}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3, delay: i * 0.04, type: "spring", stiffness: 200 }}
            style={{ transformOrigin: `${node.x}px ${node.y}px` }}
          >
            <circle
              cx={node.x}
              cy={node.y}
              r={node.radius}
              fill="var(--ws-accent-soft)"
              stroke="var(--ws-accent)"
              strokeWidth={1.5}
              opacity={0.9}
            />
            <text
              x={node.x}
              y={node.y + 3}
              textAnchor="middle"
              className="select-none"
              style={{
                fontSize: Math.max(8, Math.min(12, node.radius * 0.5)),
                fontWeight: 600,
                fill: "var(--foreground)",
                fontFamily: "var(--font-geist-mono)",
              }}
            >
              {node.label.length > 8 ? node.label.slice(0, 7) + "…" : node.label}
            </text>
          </motion.g>
        ))}
      </svg>
      <div className="flex items-center justify-between px-3 py-2 ws-hairline-t">
        <span className="text-[11px] text-foreground/40">
          {nodes.length} tokens · {links.length} transitions
        </span>
        <span className="text-[11px] text-foreground/35">
          node size = frequency · edge width = strength
        </span>
      </div>
    </div>
  );
}
