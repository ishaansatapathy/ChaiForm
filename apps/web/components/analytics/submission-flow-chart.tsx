"use client";

import { useMemo } from "react";
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

type FlowAnswer = {
  fieldId: string;
  label: string;
  type: string;
  value: string;
};

type TerminalNodeData = { label: string };
type AnswerNodeData = { label: string; value: string; type: string };

function StartNode({ data }: NodeProps<Node<TerminalNodeData>>) {
  return (
    <div className="rounded-full border border-lime-400/40 bg-lime-400/10 px-5 py-2 text-center">
      <Handle type="source" position={Position.Bottom} className="!bg-lime-400" />
      <p className="font-mono text-[10px] tracking-[0.25em] text-lime-400 uppercase">{data.label}</p>
    </div>
  );
}

function AnswerNode({ data }: NodeProps<Node<AnswerNodeData>>) {
  return (
    <div className="min-w-[240px] rounded-2xl border border-white/10 bg-black/75 px-4 py-3 shadow-[0_8px_32px_rgba(0,0,0,0.45)] backdrop-blur-md">
      <Handle type="target" position={Position.Top} className="!bg-lime-400" />
      <p className="font-mono text-[9px] tracking-[0.22em] text-lime-400/70 uppercase">{data.type}</p>
      <p className="mt-1 text-sm font-semibold text-white">{data.label}</p>
      <p className="mt-2 rounded-lg border border-white/5 bg-white/3 px-3 py-2 text-xs text-white/75">
        {data.value || "— skipped —"}
      </p>
      <Handle type="source" position={Position.Bottom} className="!bg-lime-400" />
    </div>
  );
}

function EndNode({ data }: NodeProps<Node<TerminalNodeData>>) {
  return (
    <div className="rounded-full border border-white/15 bg-white/5 px-5 py-2 text-center">
      <Handle type="target" position={Position.Top} className="!bg-lime-400" />
      <p className="font-mono text-[10px] tracking-[0.25em] text-white/60 uppercase">{data.label}</p>
    </div>
  );
}

const nodeTypes = {
  start: StartNode,
  answer: AnswerNode,
  end: EndNode,
};

function buildFlow(answers: FlowAnswer[]) {
  const nodes: Node[] = [
    {
      id: "start",
      type: "start",
      position: { x: 220, y: 0 },
      data: { label: "Participant starts" },
    },
  ];
  const edges: Edge[] = [];
  let prevId = "start";

  answers.forEach((answer, index) => {
    const id = answer.fieldId;
    nodes.push({
      id,
      type: "answer",
      position: { x: 200, y: (index + 1) * 140 },
      data: {
        label: answer.label,
        value: answer.value,
        type: answer.type,
      },
    });
    edges.push({
      id: `e-${prevId}-${id}`,
      source: prevId,
      target: id,
      animated: true,
      style: { stroke: "#4ade80", strokeWidth: 2 },
    });
    prevId = id;
  });

  nodes.push({
    id: "end",
    type: "end",
    position: { x: 220, y: (answers.length + 1) * 140 },
    data: { label: "Submitted" },
  });
  edges.push({
    id: `e-${prevId}-end`,
    source: prevId,
    target: "end",
    animated: true,
    style: { stroke: "#4ade80", strokeWidth: 2 },
  });

  return { nodes, edges };
}

type SubmissionFlowChartProps = {
  answers: FlowAnswer[];
  participantLabel?: string;
};

export function SubmissionFlowChart({ answers, participantLabel }: SubmissionFlowChartProps) {
  const { nodes, edges } = useMemo(() => buildFlow(answers), [answers]);

  return (
    <div className="space-y-3">
      {participantLabel && (
        <p className="font-mono text-[10px] tracking-[0.28em] text-white/40 uppercase">
          {participantLabel}
        </p>
      )}
      <div className="h-[520px] overflow-hidden rounded-[32px] border border-white/10 bg-black/30">
        <ReactFlowProvider>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            proOptions={{ hideAttribution: true }}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={false}
            panOnScroll
            zoomOnScroll
          >
            <Background color="#4ade80" gap={20} size={1} style={{ opacity: 0.08 }} />
            <Controls className="!border-white/10 !bg-black/60 !shadow-none [&>button]:!border-white/10 [&>button]:!bg-black/40 [&>button]:!fill-white/70" />
            <MiniMap
              nodeColor="#4ade80"
              maskColor="rgba(0,0,0,0.75)"
              className="!border-white/10 !bg-black/50"
            />
          </ReactFlow>
        </ReactFlowProvider>
      </div>
    </div>
  );
}
