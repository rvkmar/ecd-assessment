import React, { useMemo } from "react";
import Card from "./Card";
import { loadDB } from "../utils/db";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export default function AnalyticsPanel() {
  const db = loadDB();

  const data = useMemo(() => {
    const sessions = db.sessions || [];
    const tasks = db.tasks || [];
    const evidenceModels = db.evidenceModels || [];
    const competencyModels = db.competencyModels || [];

    // Score accumulators
    const scores = {};
    const rubricScores = {};

    // ✅ Initialize all competencies
    competencyModels.forEach((c) => {
      scores[c.id] = { total: 0, count: 0 };
      rubricScores[c.id] = { total: 0, count: 0 };
    });

    sessions.forEach((session) => {
      const task = tasks.find((t) => t.id === session.taskId);
      if (!task) return;

      const em = evidenceModels.find((m) => m.id === task.evidenceModelId);
      if (!em) return;

      em.constructs.forEach((construct) => {
        if (!construct.linkedCompetencyId) return;

        const scoreObj = session.scores?.find(
          (s) => s.constructId === construct.id
        );
        if (!scoreObj) return;

        const compId = construct.linkedCompetencyId;
        if (!scores[compId]) scores[compId] = { total: 0, count: 0 };

        scores[compId].total += scoreObj.value;
        scores[compId].count += 1;

        // ✅ Handle rubric scores separately
        if (scoreObj.isRubric) {
          if (!rubricScores[compId])
            rubricScores[compId] = { total: 0, count: 0 };
          rubricScores[compId].total += scoreObj.value;
          rubricScores[compId].count += 1;
        }
      });
    });

    // Transform into chart data
    return Object.entries(scores)
      .map(([competencyId, { total, count }]) => {
        const compObj = competencyModels.find((c) => c.id === competencyId);
        if (!compObj) return null;

        const label = compObj.modelLabel
          ? `${compObj.modelLabel}: ${compObj.name}`
          : compObj.name;

        const rubricData = rubricScores[competencyId] || { total: 0, count: 0 };

        return {
          competency: label,
          avgScore: count > 0 ? total / count : 0,
          rubricAvg:
            rubricData.count > 0 ? rubricData.total / rubricData.count : 0,
        };
      })
      .filter(Boolean);
  }, [db]);

  return (
    <Card title="Analytics by Competency">
      {data.length === 0 ? (
        <p className="text-sm text-gray-600">No data available yet.</p>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={data}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <XAxis dataKey="competency" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="avgScore" fill="#8884d8" name="Average Score" />
            <Bar dataKey="rubricAvg" fill="#82ca9d" name="Rubric Average" />
          </BarChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}
