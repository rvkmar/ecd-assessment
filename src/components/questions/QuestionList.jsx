import React, { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

export default function QuestionList({ notify, onEdit }) {
  const [questions, setQuestions] = useState([]);
  const [search, setSearch] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");
  const [gradeFilter, setGradeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [stats, setStats] = useState({
    new: 0,
    review: 0,
    active: 0,
    retired: 0,
  });

  const subjects = ["Mathematics", "Science", "English", "Social Science"];
  const grades = [
    "Class 3",
    "Class 4",
    "Class 5",
    "Class 6",
    "Class 7",
    "Class 8",
    "Class 9",
    "Class 10",
  ];
  const statuses = ["new", "review", "active", "retired"];

  // load questions
  useEffect(() => {
    fetch("/api/questions")
      .then((res) => res.json())
      .then((data) => {
        setQuestions(data || []);
        calculateStats(data || []);
      })
      .catch(() => setQuestions([]));
  }, []);

  const calculateStats = (qs) => {
    const count = { new: 0, review: 0, active: 0, retired: 0 };
    for (const q of qs) {
      if (q.status && count[q.status] !== undefined) count[q.status]++;
    }
    setStats(count);
  };

  const filtered = questions.filter((q) => {
    const matchSearch =
      q.stem?.toLowerCase().includes(search.toLowerCase()) ||
      q.metadata?.topic?.toLowerCase().includes(search.toLowerCase());
    const matchSubject =
      !subjectFilter || q.metadata?.subject === subjectFilter;
    const matchGrade = !gradeFilter || q.metadata?.grade === gradeFilter;
    const matchStatus = !statusFilter || q.status === statusFilter;
    return matchSearch && matchSubject && matchGrade && matchStatus;
  });

  const handleDelete = async (id) => {
    if (!confirm("Delete this question?")) return;
    await fetch(`/api/questions/${id}`, { method: "DELETE" });
    const updated = questions.filter((q) => q.id !== id);
    setQuestions(updated);
    calculateStats(updated);
    notify?.("❌ Question deleted");
  };

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold">Question Bank Overview</h2>

      {/* Dashboard cards */}
      <div className="grid grid-cols-4 gap-4">
        <StatusCard label="New" color="bg-blue-100" value={stats.new} />
        <StatusCard label="Review" color="bg-yellow-100" value={stats.review} />
        <StatusCard label="Active" color="bg-green-100" value={stats.active} />
        <StatusCard label="Retired" color="bg-gray-100" value={stats.retired} />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 border p-3 rounded-md bg-gray-50">
        <Input
          type="text"
          placeholder="Search by question or topic..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1"
        />

        <select
          value={subjectFilter}
          onChange={(e) => setSubjectFilter(e.target.value)}
          className="border p-2 rounded text-sm"
        >
          <option value="">All Subjects</option>
          {subjects.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <select
          value={gradeFilter}
          onChange={(e) => setGradeFilter(e.target.value)}
          className="border p-2 rounded text-sm"
        >
          <option value="">All Grades</option>
          {grades.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border p-2 rounded text-sm"
        >
          <option value="">All Statuses</option>
          {statuses.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <button
          onClick={() => {
            setSearch("");
            setSubjectFilter("");
            setGradeFilter("");
            setStatusFilter("");
          }}
          className="bg-gray-600 text-white px-3 py-1 rounded text-sm"
        >
          Reset
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse border text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="border p-2 text-left">ID</th>
              <th className="border p-2 text-left">Stem</th>
              <th className="border p-2 text-left">Subject</th>
              <th className="border p-2 text-left">Grade</th>
              <th className="border p-2 text-left">Topic</th>
              <th className="border p-2 text-left">Difficulty</th>
              <th className="border p-2 text-left">Status</th>
              <th className="border p-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan="8"
                  className="text-center text-gray-500 p-3 italic"
                >
                  No matching questions found.
                </td>
              </tr>
            )}
            {filtered.map((q) => (
              <tr key={q.id} className="hover:bg-gray-50">
                <td className="border p-2">{q.id}</td>
                <td className="border p-2 max-w-sm truncate">{q.stem}</td>
                <td className="border p-2">{q.metadata?.subject}</td>
                <td className="border p-2">{q.metadata?.grade}</td>
                <td className="border p-2">{q.metadata?.topic}</td>
                <td className="border p-2 capitalize">
                  {q.metadata?.difficulty}
                </td>
                <td
                  className={`border p-2 capitalize font-semibold ${
                    q.status === "active"
                      ? "text-green-600"
                      : q.status === "review"
                      ? "text-yellow-600"
                      : q.status === "retired"
                      ? "text-gray-500"
                      : "text-blue-600"
                  }`}
                >
                  {q.status}
                </td>
                <td className="border p-2 space-x-2">
                  <button
                    onClick={() => onEdit(q)}
                    className="bg-blue-600 text-white px-2 py-1 rounded"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(q.id)}
                    className="bg-red-500 text-white px-2 py-1 rounded"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusCard({ label, color, value }) {
  const colorClass = {
    "New": "bg-blue-100 text-blue-700 border-blue-300",
    "Review": "bg-yellow-100 text-yellow-700 border-yellow-300",
    "Active": "bg-green-100 text-green-700 border-green-300",
    "Retired": "bg-gray-100 text-gray-700 border-gray-300",
  }[label];

  return (
    <div
      className={`p-4 border rounded-md text-center shadow-sm ${colorClass}`}
    >
      <div className="text-sm font-medium">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}
