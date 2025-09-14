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

  // Flatten sessions, link back to tasks → evidence models → constructs → competencies
  const data = useMemo(() => {
    const sessions = db.sessions || [];
    const tasks = db.tasks || [];
    const evidenceModels = db.evidenceModels || [];
    const competencyModels = db.competencyModels || [];

    // Collect all competencies
    const allCompetencies = competencyModels.flatMap((cm) => cm.competencies);

    // Score accumulator per competency
    const scores = {};
    allCompetencies.forEach((c) => {
      scores[c] = { total: 0, count: 0 };
    });

    sessions.forEach((session) => {
      const task = tasks.find((t) => t.id === session.taskId);
      if (!task) return;

      const em = evidenceModels.find((m) => m.id === task.evidenceModelId);
      if (!em) return;

      // If constructs are linked to competencies, push scores
      em.constructs.forEach((construct) => {
        if (!construct.linkedCompetencyId) return;

        // Find this construct’s score in session
        const scoreObj = session.scores?.find((s) => s.constructId === construct.id);
        if (!scoreObj) return;

        const comp = construct.linkedCompetencyId;
        if (!scores[comp]) scores[comp] = { total: 0, count: 0 };

        scores[comp].total += scoreObj.value;
        scores[comp].count += 1;
      });
    });

    // Transform into chart data
    return Object.entries(scores).map(([competency, { total, count }]) => ({
      competency,
      avgScore: count > 0 ? total / count : 0,
    }));
  }, [db]);

  return (
    <Card title="Analytics by Competency">
      {data.length === 0 ? (
        <p className="text-sm text-gray-600">No data available yet.</p>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <XAxis dataKey="competency" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="avgScore" fill="#8884d8" name="Average Score" />
          </BarChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}
