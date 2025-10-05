import React, { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Input } from "@/components/ui/input";

export default function QuestionDashboard() {
  const [questions, setQuestions] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [subject, setSubject] = useState("");
  const [grade, setGrade] = useState("");
  const [status, setStatus] = useState("");

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
  const colors = {
    new: "#3B82F6",
    review: "#F59E0B",
    active: "#22C55E",
    retired: "#9CA3AF",
  };

  useEffect(() => {
    fetch("/api/questions")
      .then((res) => res.json())
      .then((data) => {
        setQuestions(data || []);
        setFiltered(data || []);
      })
      .catch(() => setQuestions([]));
  }, []);

  // filter logic
  useEffect(() => {
    const f = questions.filter((q) => {
      const matchSearch =
        q.stem?.toLowerCase().includes(search.toLowerCase()) ||
        q.metadata?.topic?.toLowerCase().includes(search.toLowerCase());
      const matchSubject = !subject || q.metadata?.subject === subject;
      const matchGrade = !grade || q.metadata?.grade === grade;
      const matchStatus = !status || q.status === status;
      return matchSearch && matchSubject && matchGrade && matchStatus;
    });
    setFiltered(f);
  }, [search, subject, grade, status, questions]);

  // aggregate stats
  const countByStatus = statuses.map((s) => ({
    name: s,
    count: filtered.filter((q) => q.status === s).length,
  }));

  const countBySubject = subjects.map((s) => ({
    subject: s,
    count: filtered.filter((q) => q.metadata?.subject === s).length,
  }));

  const countByGrade = grades.map((g) => ({
    grade: g,
    count: filtered.filter((q) => q.metadata?.grade === g).length,
  }));

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold">Question Bank Dashboard</h2>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 border p-3 rounded-md bg-gray-50">
        <Input
          placeholder="Search question or topic..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1"
        />

        <select
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="border p-2 rounded text-sm"
        >
          <option value="">All Subjects</option>
          {subjects.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>

        <select
          value={grade}
          onChange={(e) => setGrade(e.target.value)}
          className="border p-2 rounded text-sm"
        >
          <option value="">All Grades</option>
          {grades.map((g) => (
            <option key={g}>{g}</option>
          ))}
        </select>

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="border p-2 rounded text-sm"
        >
          <option value="">All Statuses</option>
          {statuses.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>

        <button
          onClick={() => {
            setSearch("");
            setSubject("");
            setGrade("");
            setStatus("");
          }}
          className="bg-gray-600 text-white px-3 py-1 rounded text-sm"
        >
          Reset
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        {countByStatus.map((s) => (
          <div
            key={s.name}
            className={`p-4 border rounded-md shadow-sm text-center font-semibold`}
            style={{
              backgroundColor: colors[s.name] + "20",
              color: colors[s.name],
              borderColor: colors[s.name],
            }}
          >
            <div className="text-sm capitalize">{s.name}</div>
            <div className="text-2xl">{s.count}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Status Pie */}
        <div className="p-4 border rounded-md bg-white shadow-sm">
          <h4 className="font-semibold mb-3">Question Distribution by Status</h4>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={countByStatus}
                dataKey="count"
                nameKey="name"
                outerRadius={100}
                label
              >
                {countByStatus.map((entry) => (
                  <Cell
                    key={entry.name}
                    fill={colors[entry.name] || "#ccc"}
                  />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Subject Bar */}
        <div className="p-4 border rounded-md bg-white shadow-sm">
          <h4 className="font-semibold mb-3">Questions by Subject</h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={countBySubject}>
              <XAxis dataKey="subject" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#3B82F6" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Grade Bar */}
        <div className="p-4 border rounded-md bg-white shadow-sm md:col-span-2">
          <h4 className="font-semibold mb-3">Questions by Grade</h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={countByGrade}>
              <XAxis dataKey="grade" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#10B981" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Summary footer */}
      <div className="text-sm text-gray-500 text-center pt-2 border-t">
        Total Questions: <strong>{filtered.length}</strong>
      </div>
    </div>
  );
}
