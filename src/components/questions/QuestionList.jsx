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

  // --- Group reading sets ---
  const readingSets = filtered
    .filter((q) => q.type === "reading")
    .map((parent) => ({
      parent,
      children: filtered.filter((child) => child.passageId === parent.id),
    }));

  const nonReading = filtered.filter(
    (q) => q.type !== "reading" && !q.passageId
  );

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
            {/* Render grouped reading sets first */}
            {readingSets.map(({ parent, children }) => (
              <React.Fragment key={parent.id}>
                <tr className="bg-yellow-50 border-t-2 border-yellow-300">
                  <td className="border p-2 font-semibold">{parent.id}</td>
                  <td className="border p-2 max-w-sm">
                    📖 <strong>{parent.stem.slice(0, 100)}</strong>
                  </td>
                  <td className="border p-2">{parent.metadata?.subject}</td>
                  <td className="border p-2">{parent.metadata?.grade}</td>
                  <td className="border p-2">{parent.metadata?.topic}</td>
                  <td className="border p-2 capitalize">{parent.metadata?.difficulty}</td>
                  <td className="border p-2 font-semibold text-blue-700">
                    {parent.status}
                  </td>
                  <td className="border p-2 space-x-2">
                    <button
                      onClick={() => onEdit(parent)}
                      className="bg-blue-600 text-white px-2 py-1 rounded"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(parent.id)}
                      className="bg-red-500 text-white px-2 py-1 rounded"
                    >
                      Delete
                    </button>
                  </td>
                </tr>

                {/* Nested sub-questions */}
                {children.map((child) => (
                  <tr key={child.id} className="bg-white hover:bg-gray-50">
                    <td className="border p-2 pl-6 text-gray-700">{child.id}</td>
                    <td className="border p-2 max-w-sm text-gray-700">
                      ↳ {child.stem.slice(0, 80)}
                    </td>
                    <td className="border p-2">{child.metadata?.subject}</td>
                    <td className="border p-2">{child.metadata?.grade}</td>
                    <td className="border p-2">{child.metadata?.topic}</td>
                    <td className="border p-2 capitalize">
                      {child.metadata?.difficulty}
                    </td>
                    <td
                      className={`border p-2 capitalize font-semibold ${
                        child.status === "active"
                          ? "text-green-600"
                          : child.status === "review"
                          ? "text-yellow-600"
                          : child.status === "retired"
                          ? "text-gray-500"
                          : "text-blue-600"
                      }`}
                    >
                      {child.status}
                    </td>
                    <td className="border p-2 space-x-2">
                      <button
                        onClick={() => onEdit(child)}
                        className="bg-blue-500 text-white px-2 py-1 rounded"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(child.id)}
                        className="bg-red-500 text-white px-2 py-1 rounded"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </React.Fragment>
            ))}

            {/* Non-reading questions */}
            {nonReading.map((q) => (
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
