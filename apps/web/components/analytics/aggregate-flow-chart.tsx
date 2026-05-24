"use client";

import { useMemo, useState } from "react";
import {
  Background,
  Controls,
  Handle,
  MiniMap,
  Position,
  ReactFlow,
  ReactFlowProvider,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import type { FilterableField } from "~/lib/analytics-filters";

type FlowFieldNodeData = {
  label: string;
  type: string;
  options: { value: string; label: string; count: number }[];
  activeValue?: string;
  onSelect: (fieldId: string, value: string) => void;
  fieldId: string;
};

type FlowStartNodeData = { label: string; count: number };

function StartNode({ data }: NodeProps<Node<FlowStartNodeData>>) {
  return (
    <div className="rounded-full border border-lime-400/40 bg-lime-400/10 px-5 py-2 text-center">
      <Handle type="source" position={Position.Bottom} className="!bg-lime-400" />
      <p className="font-mono text-[10px] tracking-[0.25em] text-lime-400 uppercase">{data.label}</p>
      <p className="mt-1 text-xs text-white/50">{data.count} participants</p>
    </div>
  );
}

function FieldNode({ data }: NodeProps<Node<FlowFieldNodeData>>) {
  return (
    <div className="w-[280px] rounded-2xl border border-white/10 bg-black/80 px-4 py-3 shadow-[0_8px_32px_rgba(0,0,0,0.45)] backdrop-blur-md">
      <Handle type="target" position={Position.Top} className="!bg-lime-400" />
      <p className="font-mono text-[9px] tracking-[0.22em] text-lime-400/70 uppercase">{data.type}</p>
      <p className="mt-1 text-sm font-semibold text-white">{data.label}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {data.options.map((option) => {
          const active = data.activeValue === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => data.onSelect(data.fieldId, option.value)}
              className={`rounded-full border px-2.5 py-1 text-[10px] font-bold transition-colors ${
                active
                  ? "border-lime-400 bg-lime-400/20 text-lime-300"
                  : "border-white/10 bg-white/5 text-white/60 hover:border-lime-400/30 hover:text-lime-300"
              }`}
            >
              {option.label} ({option.count})
            </button>
          );
        })}
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-lime-400" />
    </div>
  );
}

const nodeTypes = {
  start: StartNode,
  field: FieldNode,
};

type AggregateFlowChartProps = {
  fields: FilterableField[];
  participantCount: number;
  activeFilters: Record<string, string>;
  onFilterSelect: (fieldId: string, value: string) => void;
};

function AggregateFlowChartInner({
  fields,
  participantCount,
  activeFilters,
  onFilterSelect,
}: AggregateFlowChartProps) {
  const { nodes, edges } = useMemo(() => {
    const nodes: Node[] = [
      {
        id: "start",
        type: "start",
        position: { x: 280, y: 0 },
        data: { label: "Responses", count: participantCount },
      },
    ];
    const edges: Edge[] = [];
    let prevId = "start";

    fields.forEach((field, index) => {
      const id = field.fieldId;
      nodes.push({
        id,
        type: "field",
        position: { x: 240, y: (index + 1) * 180 },
        data: {
          fieldId: field.fieldId,
          label: field.label,
          type: field.type,
          options: field.options,
          activeValue: activeFilters[field.fieldId],
          onSelect: onFilterSelect,
        },
      });
      edges.push({
        id: `e-${prevId}-${id}`,
        source: prevId,
        target: id,
        animated: true,
        label: "next",
        style: { stroke: "#4ade80", strokeWidth: 2 },
        labelStyle: { fill: "#86efac", fontSize: 10 },
      });
      prevId = id;
    });

    return { nodes, edges };
  }, [fields, participantCount, activeFilters, onFilterSelect]);

  return (
    <div className="h-[620px] overflow-hidden rounded-[32px] border border-white/10 bg-black/30">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.25 }}
        proOptions={{ hideAttribution: true }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnScroll
        zoomOnScroll
      >
        <Background color="#4ade80" gap={20} size={1} style={{ opacity: 0.08 }} />
        <Controls className="!border-white/10 !bg-black/60 !shadow-none [&>button]:!border-white/10 [&>button]:!bg-black/40 [&>button]:!fill-white/70" />
        <MiniMap nodeColor="#4ade80" maskColor="rgba(0,0,0,0.75)" className="!border-white/10 !bg-black/50" />
      </ReactFlow>
    </div>
  );
}

export function AggregateFlowChart(props: AggregateFlowChartProps) {
  return (
    <ReactFlowProvider>
      <AggregateFlowChartInner {...props} />
    </ReactFlowProvider>
  );
}
