import React, { useEffect, useState } from "react";

export default function ClassReport({ classId, onClose }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!classId) return;
    setLoading(true);
    fetch(`/api/reports/teacher/class/${classId}`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to fetch class report");
        return r.json();
      })
      .then((data) => setReport(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [classId]);

  if (!classId) return null;
  if (loading) return <div className="p-4">Loading class report...</div>;
  if (error) return <div className="p-4 text-red-600">❌ {error}</div>;

  return (
    <div className="p-4 border rounded bg-white">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Class Report: {classId}</h2>
        {onClose && (
          <button
            onClick={onClose}
            className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
          >
            Close
          </button>
        )}
      </div>

      {/* Example summary */}
      {report.summary && (
        <div className="mb-4">
          <h3 className="font-semibold">Summary</h3>
          <p>Total Students: {report.summary.totalStudents}</p>
          <p>Completed Sessions: {report.summary.completedSessions}</p>
          <p>Average Mastery: {report.summary.avgMasteryLevel}</p>
        </div>
      )}

      {/* Student-level results */}
      {report.students && report.students.length > 0 ? (
        <div>
          <h3 className="font-semibold mb-2">Student Results</h3>
          <table className="w-full border text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="border px-2 py-1">Student</th>
                <th className="border px-2 py-1">Sessions</th>
                <th className="border px-2 py-1">Mastery</th>
              </tr>
            </thead>
            <tbody>
              {report.students.map((s) => (
                <tr key={s.id}>
                  <td className="border px-2 py-1">{s.name || s.id}</td>
                  <td className="border px-2 py-1">{s.completedSessions}</td>
                  <td className="border px-2 py-1">{s.masteryLevel}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-gray-500">No student results yet</p>
      )}
    </div>
  );
}
