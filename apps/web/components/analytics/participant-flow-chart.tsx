"use client";

import { useMemo, type MouseEvent } from "react";
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

import type { RouterOutputs } from "@repo/trpc/client";

import { formatCheckboxAnswerValue } from "~/lib/checkbox-value";
import { getParticipantName } from "~/lib/analytics-filters";

type Submission = RouterOutputs["forms"]["listSubmissions"]["items"][number];

type FormNodeData = { label: string; count: number };
type ParticipantNodeData = {
  label: string;
  submissionId: string;
  active: boolean;
  answerCount: number;
  submittedAt: string | null;
};
type AnswerNodeData = { label: string; value: string; type: string };

function FormNode({ data }: NodeProps<Node<FormNodeData>>) {
  return (
    <div className="rounded-2xl border-2 border-lime-400/60 bg-lime-400/15 px-6 py-3 text-center shadow-[0_0_30px_rgba(74,222,128,0.25)]">
      <Handle type="source" position={Position.Bottom} className="pointer-events-none! opacity-0!" />
      <p className="font-mono text-[9px] tracking-[0.3em] text-lime-400 uppercase">Form</p>
      <p className="mt-1 max-w-[220px] truncate text-sm font-bold text-white">{data.label}</p>
      <p className="mt-1 text-[10px] text-white/55">{data.count} participants</p>
    </div>
  );
}

function ParticipantNode({ data }: NodeProps<Node<ParticipantNodeData>>) {
  return (
    <div
      className={`nodrag nopan min-w-[180px] cursor-pointer rounded-2xl border px-4 py-3 text-left transition-all ${
        data.active
          ? "border-lime-400/70 bg-lime-400/15 shadow-[0_0_25px_rgba(74,222,128,0.3)]"
          : "border-white/15 bg-black/70 hover:border-lime-400/40 hover:bg-lime-400/5"
      }`}
    >
      <Handle type="target" position={Position.Top} className="pointer-events-none! opacity-0!" />
      <p className="font-mono text-[8px] tracking-[0.22em] text-lime-400/70 uppercase">User</p>
      <p className="mt-1 truncate text-sm font-bold text-white">{data.label}</p>
      <p className="mt-1 text-[10px] text-white/45">
        {data.answerCount} answers · {data.submittedAt ? new Date(data.submittedAt).toLocaleDateString() : "—"}
      </p>
      <p className="mt-2 text-[9px] font-bold tracking-wider text-lime-300/80 uppercase">
        {data.active ? "Showing responses ↓" : "Click to view ↓"}
      </p>
      {data.active && (
        <Handle type="source" position={Position.Bottom} className="pointer-events-none! opacity-0!" />
      )}
    </div>
  );
}

function AnswerNode({ data }: NodeProps<Node<AnswerNodeData>>) {
  const formatted =
    data.type === "rating"
      ? `⭐ ${data.value}`
      : data.type === "checkbox"
        ? formatCheckboxAnswerValue(data.value)
        : data.value || "— skipped —";

  return (
    <div className="min-w-[220px] rounded-xl border border-white/10 bg-black/80 px-3 py-2 shadow-[0_8px_28px_rgba(0,0,0,0.45)] backdrop-blur-md">
      <Handle type="target" position={Position.Top} className="pointer-events-none! opacity-0!" />
      <p className="font-mono text-[8px] tracking-[0.22em] text-lime-400/70 uppercase">{data.type}</p>
      <p className="mt-0.5 truncate text-xs font-semibold text-white">{data.label}</p>
      <p className="mt-1.5 rounded-md border border-white/5 bg-white/3 px-2 py-1 text-[11px] text-white/75">
        {formatted}
      </p>
    </div>
  );
}

const nodeTypes = {
  form: FormNode,
  participant: ParticipantNode,
  answer: AnswerNode,
};

type ParticipantFlowChartProps = {
  formTitle: string;
  submissions: Submission[];
  activeSubmissionId?: string;
  onSelectSubmission: (submissionId: string) => void;
};

function ParticipantFlowChartInner({
  formTitle,
  submissions,
  activeSubmissionId,
  onSelectSubmission,
}: ParticipantFlowChartProps) {
  const { nodes, edges } = useMemo(() => {
    const flowNodes: Node[] = [];
    const flowEdges: Edge[] = [];

    const count = submissions.length;
    const baseX = 0;

    const SPACING_X = 240;
    const totalWidth = Math.max(0, (count - 1) * SPACING_X);
    const startX = baseX - totalWidth / 2;

    flowNodes.push({
      id: "form",
      type: "form",
      position: { x: baseX - 130, y: 0 },
      data: { label: formTitle, count } satisfies FormNodeData,
    });

    submissions.forEach((submission, index) => {
      const x = startX + index * SPACING_X - 90;
      const isActive = submission.id === activeSubmissionId;
      const answerCount = submission.answers.filter((answer) => answer.value.trim()).length;

      flowNodes.push({
        id: `user-${submission.id}`,
        type: "participant",
        position: { x, y: 200 },
        data: {
          label: getParticipantName(submission, index),
          submissionId: submission.id,
          active: isActive,
          answerCount,
          submittedAt: submission.submittedAt,
        } satisfies ParticipantNodeData,
      });

      flowEdges.push({
        id: `edge-form-${submission.id}`,
        source: "form",
        target: `user-${submission.id}`,
        animated: isActive,
        style: { stroke: isActive ? "#4ade80" : "rgba(255,255,255,0.18)", strokeWidth: isActive ? 2 : 1.5 },
      });

      if (isActive) {
        const answers = submission.answers.filter((answer) => answer.value.trim().length > 0);
        const answerSpacing = 260;
        const answersWidth = Math.max(0, (answers.length - 1) * answerSpacing);
        const answersStartX = x + 90 - answersWidth / 2 - 110;

        answers.forEach((answer, answerIndex) => {
          const answerId = `answer-${submission.id}-${answer.fieldId}`;
          flowNodes.push({
            id: answerId,
            type: "answer",
            position: { x: answersStartX + answerIndex * answerSpacing, y: 400 },
            data: {
              label: answer.label,
              value: answer.value,
              type: answer.type,
            } satisfies AnswerNodeData,
          });
          flowEdges.push({
            id: `edge-${submission.id}-${answer.fieldId}`,
            source: `user-${submission.id}`,
            target: answerId,
            animated: true,
            style: { stroke: "#4ade80", strokeWidth: 1.5 },
          });
        });
      }
    });

    return { nodes: flowNodes, edges: flowEdges };
  }, [formTitle, submissions, activeSubmissionId]);

  const handleNodeClick = (_event: MouseEvent, node: Node) => {
    if (node.type !== "participant") return;
    const submissionId = (node.data as ParticipantNodeData).submissionId;
    onSelectSubmission(submissionId);
  };

  return (
    <div className="h-[640px] overflow-hidden rounded-[32px] border border-white/10 bg-black/30">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={handleNodeClick}
        fitView
        fitViewOptions={{ padding: 0.25 }}
        proOptions={{ hideAttribution: true }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnDrag={[1, 2]}
        panOnScroll
        zoomOnScroll
      >
        <Background color="#4ade80" gap={20} size={1} style={{ opacity: 0.08 }} />
        <Controls className="border-white/10! bg-black/60! shadow-none! [&>button]:border-white/10! [&>button]:bg-black/40! [&>button]:fill-white/70!" />
        <MiniMap nodeColor="#4ade80" maskColor="rgba(0,0,0,0.75)" className="border-white/10! bg-black/50!" />
      </ReactFlow>
    </div>
  );
}

export function ParticipantFlowChart(props: ParticipantFlowChartProps) {
  return (
    <ReactFlowProvider>
      <ParticipantFlowChartInner {...props} />
    </ReactFlowProvider>
  );
}
