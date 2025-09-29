import React, { useEffect, useState } from "react";

// SessionReport.jsx
// Props:
// - sessionId: string (required)
// - onClose?: callback to close modal/view
//
// Fetches reports from:
// - /api/reports/session/:id
// - /api/reports/session/:id/learner-feedback
// - /api/reports/session/:id/teacher-report

export default function SessionReport({ sessionId, onClose }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [report, setReport] = useState(null);
  const [learnerFeedback, setLearnerFeedback] = useState(null);
  const [teacherReport, setTeacherReport] = useState(null);
  const [tab, setTab] = useState("learner");

  useEffect(() => {
    if (!sessionId) return;
    setLoading(true);
    Promise.all([
      fetch(`/api/reports/session/${sessionId}`).then((r) => r.json()),
      fetch(`/api/reports/session/${sessionId}/learner-feedback`).then((r) => r.json()),
      fetch(`/api/reports/session/${sessionId}/teacher-report`).then((r) => r.json()),
    ])
      .then(([rep, learner, teacher]) => {
        setReport(rep);
        setLearnerFeedback(learner);
        setTeacherReport(teacher);
      })
      .catch((err) => {
        console.error("Failed to load report", err);
        setError("Failed to load report");
      })
      .finally(() => setLoading(false));
  }, [sessionId]);

  if (!sessionId) return null;
  if (loading) return <div className="p-4">Loading report...</div>;
  if (error) return <div className="p-4 text-red-600">{error}</div>;

  return (
    <div className="p-4 border rounded bg-white">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Session Report: {sessionId}</h2>
        {onClose && (
          <button onClick={onClose} className="px-3 py-1 bg-gray-300 rounded hover:bg-gray-400">Close</button>
        )}
      </div>

      {/* Tabs */}
      <div className="mb-4 flex space-x-2">
        <button
          className={`px-3 py-1 rounded ${tab === "learner" ? "bg-purple-600 text-white" : "bg-gray-200 hover:bg-gray-300"}`}
          onClick={() => setTab("learner")}
        >
          Learner Feedback
        </button>
        <button
          className={`px-3 py-1 rounded ${tab === "teacher" ? "bg-green-600 text-white" : "bg-gray-200 hover:bg-gray-300"}`}
          onClick={() => setTab("teacher")}
        >
          Teacher Report
        </button>
        <button
          className={`px-3 py-1 rounded ${tab === "raw" ? "bg-blue-600 text-white" : "bg-gray-200 hover:bg-gray-300"}`}
          onClick={() => setTab("raw")}
        >
          Raw JSON
        </button>
      </div>

      {/* Content */}
      {tab === "learner" && learnerFeedback && (
        <div className="space-y-3">
          <h3 className="font-semibold">Summary</h3>
          <p className="text-gray-700">Level: {learnerFeedback.summary?.level}</p>
          <p className="text-gray-700">{learnerFeedback.summary?.message}</p>

          {learnerFeedback.strengths?.length > 0 && (
            <div>
              <h4 className="font-semibold">Strengths</h4>
              <ul className="list-disc ml-5">
                {learnerFeedback.strengths.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </div>
          )}

          {learnerFeedback.focusAreas?.length > 0 && (
            <div>
              <h4 className="font-semibold">Focus Areas</h4>
              <ul className="list-disc ml-5">
                {learnerFeedback.focusAreas.map((f, i) => <li key={i}>{f}</li>)}
              </ul>
            </div>
          )}

          {learnerFeedback.nextSteps?.length > 0 && (
            <div>
              <h4 className="font-semibold">Next Steps</h4>
              <ul className="list-disc ml-5">
                {learnerFeedback.nextSteps.map((n, i) => <li key={i}>{n}</li>)}
              </ul>
            </div>
          )}

          <p className="italic text-gray-600 mt-2">{learnerFeedback.encouragement}</p>
        </div>
      )}

      {tab === "teacher" && teacherReport && (
        <div className="space-y-3">
          <h3 className="font-semibold">Teacher Report</h3>
          <p className="text-gray-700">Strategy: {teacherReport.strategy}</p>
          {teacherReport.studentName && (
            <p className="text-gray-700">Student: {teacherReport.studentName}</p>
          )}

          <div>
            <h4 className="font-semibold">Responses</h4>
            <ul className="list-disc ml-5 text-sm">
              {teacherReport.responses?.map((r, i) => (
                <li key={i}>
                  Task {r.taskId}: {r.rawAnswer || r.rubricLevel || r.scoredValue || "-"}{" "}
                  <span className="text-gray-500 text-xs">
                    [C: {r.competencyId || "?"}, E: {r.evidenceId || "?"}]
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold">Model Summary</h4>
            <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto">{JSON.stringify(teacherReport.modelSummary, null, 2)}</pre>
          </div>

          <div>
            <h4 className="font-semibold">Recommendations</h4>
            <ul className="list-disc ml-5 text-sm">
              {(teacherReport.recommendations?.individualLevel || []).map((r, i) => <li key={i}>{r}</li>)}
              {(teacherReport.recommendations?.groupLevel || []).map((r, i) => <li key={i}>{r}</li>)}
            </ul>
          </div>
        </div>
      )}

      {tab === "raw" && report && (
        <div>
          <h3 className="font-semibold mb-2">Raw Report JSON</h3>
          <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto max-h-96">{JSON.stringify(report, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
