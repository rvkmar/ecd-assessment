import React from "react";
import ReactFlow, { Background } from "reactflow";
import "reactflow/dist/style.css";
import dagre from "dagre";

const nodeWidth = 60;
const nodeHeight = 25;

function getLayoutedElements(competencies = [], links = [], edgeOptions = {}) {
  if (!Array.isArray(competencies)) competencies = [];
  if (!Array.isArray(links)) links = [];

  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "TB" });

  competencies.forEach((c) => {
    if (c?.id) {
      g.setNode(c.id, { width: nodeWidth, height: nodeHeight });
    }
  });

  competencies
    .filter((c) => c?.parentId)
    .forEach((c) => {
      g.setEdge(c.parentId, c.id);
    });

  dagre.layout(g);

  const nodes = competencies.map((c) => {
    const pos = g.node(c.id) || { x: 0, y: 0 };
    return {
      id: c.id,
      data: { label: c.name || "" },
      position: { x: pos.x - nodeWidth / 2, y: pos.y - nodeHeight / 2 },
      style: {
        background: "#10b981",
        color: "white",
        borderRadius: "50%",
        width: nodeWidth,
        height: nodeWidth,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        fontSize: "8px",
        textAlign: "center",
        lineHeight: "1.1",
        padding: "2px",
      },
    };
  });

  // Green hierarchy edges (no arrow)
  const hierarchyEdges = competencies
    .filter((c) => c?.parentId)
    .map((c, idx) => ({
      id: `e${c.parentId}-${c.id}`,
      source: c.parentId,
      target: c.id,
      type: "bezier",
      animated: true,
      style: {
        stroke: "#10b981",
        strokeWidth: 2,
        ...edgeOptions.style,
      },
      markerEnd: undefined,
    }));

  // Blue cross-links (lighter, tiny arrow)
  const linkCountMap = {};
  const linkEdges = links
    .filter((l) => l?.sourceId && l?.destId)
    .map((l, idx) => {
      const key = `${l.sourceId}-${l.destId}`;
      linkCountMap[key] = (linkCountMap[key] || 0) + 1;
      const offsetIndex = linkCountMap[key];

      return {
        id: `link-${idx}`,
        source: l.sourceId,
        target: l.destId,
        type: "bezier",
        animated: true,
        style: {
          stroke: "rgba(100, 149, 237, 0.6)",
          strokeWidth: 1.2,
          strokeDasharray: "6,6",
          ...edgeOptions.style,
        },
        markerEnd: {
          type: "arrowclosed",
          color: "rgba(100, 149, 237, 0.6)",
          width: 6,
          height: 6,
        },
      };
    });

  return { nodes, edges: [...hierarchyEdges, ...linkEdges] };
}

export default function CompetencyOverview({ competencies = [], links = [], edgeOptions = {} }) {
  const { nodes, edges } = getLayoutedElements(competencies, links, edgeOptions);

  return (
    <div style={{ width: "100%", height: 500 }} className="border rounded">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        nodesConnectable={false}
        elementsSelectable={true}
        defaultEdgeOptions={{ type: "bezier" }}
        proOptions={{ hideAttribution: true }}
      >
        <Background />
      </ReactFlow>
    </div>
  );
}