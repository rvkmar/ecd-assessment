import React, { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import Modal from "../ui/Modal";


import toast from "react-hot-toast";
import { Send } from "lucide-react";

export default function QuestionList({ notify, onEdit }) {
  const [questions, setQuestions] = useState([]);
  const [search, setSearch] = useState("");
  
  // const notify = (msg, type = "info") => {
  //   if (type === "success") toast.success(msg);
  //   else if (type === "error") toast.error(msg);
  //   else toast(msg);
  // };
  
  const [subjectFilter, setSubjectFilter] = useState("");
  const [gradeFilter, setGradeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [stats, setStats] = useState({
    new: 0,
    review: 0,
    active: 0,
    retired: 0,
  });

  const [deleteModal, setDeleteModal] = useState({ open: false, id: null });

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

  // ---------------------------
  // Role-based lifecycle control
  // ---------------------------
  const role = localStorage.getItem("role") || "teacher";

  const handleLifecycleAction = async (id, action) => {
    try {
      const res = await fetch(`/api/questions/${id}/lifecycle`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, userId: role }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed");
      }
      const updated = await res.json();
      setQuestions((prev) =>
        prev.map((q) => (q.id === id ? { ...q, ...updated } : q))
      );
      calculateStats(
        questions.map((q) => (q.id === id ? { ...q, ...updated } : q))
      );
      notify?.(`✅ ${action} successful`);
    } catch (err) {
      console.error(err);
      notify?.(`❌ Failed to ${action}: ${err.message}`);
    }
  };

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

  // open modal
  const confirmDeleteFromList = (id) => setDeleteModal({ open: true, id });

  // perform deletion after confirm
  const performDeleteFromList = async () => {
    const { id } = deleteModal;
    if (!id) return setDeleteModal({ open: false, id: null });

    try {
      const res = await fetch(`/api/questions/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete question");
      const updated = questions.filter((q) => q.id !== id);
      setQuestions(updated);
      calculateStats(updated);
      notify?.("✅ Question deleted");
    } catch (e) {
      console.error(e);
      notify?.("❌ Failed to delete question");
    } finally {
      setDeleteModal({ open: false, id: null });
    }
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
                    disabled={
                      ["teacher", "district"].includes(role) &&
                      parent.status !== "new"
                    }
                    className={`px-2 py-1 rounded text-white ${
                      ["teacher", "district"].includes(role) &&
                      parent.status !== "new"
                        ? "bg-gray-400 cursor-not-allowed"
                        : "bg-blue-600 hover:bg-blue-700"
                    }`}
                  >
                    Edit
                  </button>

                  <button
                    onClick={() => confirmDeleteFromList(parent.id)}
                    disabled={
                      ["teacher", "district"].includes(role) &&
                      parent.status !== "new"
                    }
                    className={`px-2 py-1 rounded text-white ${
                      ["teacher", "district"].includes(role) &&
                      parent.status !== "new"
                        ? "bg-gray-400 cursor-not-allowed"
                        : "bg-red-500 hover:bg-red-600"
                    }`}
                  >
                    Delete
                  </button>

                  {/* 🔹 Lifecycle buttons by role & status */}

                  {/* 👩‍🏫 Teacher / 🏛️ District: only Send for Review (new → review) */}
                  {["teacher", "district"].includes(role) &&
                    parent.status === "new" && (
                      <button
                        onClick={() =>
                          handleLifecycleAction(parent.id, "review")
                        }
                        className="flex items-center gap-1 bg-yellow-500 text-white px-2 py-1 rounded"
                      >
                        <Send size={14} />
                        Send for Review
                      </button>
                    )}

                  {/* 🏛️ District / 👑 Admin: review → active */}
                  {["district", "admin"].includes(role) &&
                    parent.status === "review" && (
                      <button
                        onClick={() =>
                          handleLifecycleAction(parent.id, "activate")
                        }
                        className="bg-green-600 text-white px-2 py-1 rounded"
                      >
                        Mark as Active
                      </button>
                    )}

                  {/* 🏛️ District / 👑 Admin: active → review */}
                  {["district", "admin"].includes(role) &&
                    parent.status === "active" && (
                      <button
                        onClick={() =>
                          handleLifecycleAction(parent.id, "review")
                        }
                        className="bg-gray-500 text-white px-2 py-1 rounded"
                      >
                        Move to Review
                      </button>
                    )}

                  {/* 👑 Admin-only: retire / reactivate */}
                  {role === "admin" && parent.status === "active" && (
                    <button
                      onClick={() =>
                        handleLifecycleAction(parent.id, "retire")
                      }
                      className="bg-red-600 text-white px-2 py-1 rounded"
                    >
                      Retire
                    </button>
                  )}
                  {role === "admin" && parent.status === "retired" && (
                    <button
                      onClick={() =>
                        handleLifecycleAction(parent.id, "activate")
                      }
                      className="bg-blue-600 text-white px-2 py-1 rounded"
                    >
                      Reactivate
                    </button>
                  )}               
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
                        onClick={() => confirmDeleteFromList(child.id)}
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
                    onClick={() => confirmDeleteFromList(q.id)}
                    className="bg-red-500 text-white px-2 py-1 rounded"
                  >
                    Delete
                  </button>
                  {/* 🔹 Lifecycle Buttons for individual questions */}
                  {role === "teacher" && q.status === "new" && (
                    <button
                      onClick={() => handleLifecycleAction(q.id, "review")}
                      className="flex items-center gap-1 bg-yellow-500 text-white px-2 py-1 rounded"
                    >
                      <Send size={14} />
                      Send for Review
                    </button>
                  )}
                  {role === "district" && q.status === "review" && (
                    <button
                      onClick={() => handleLifecycleAction(q.id, "activate")}
                      className="bg-green-600 text-white px-2 py-1 rounded"
                    >
                      Approve
                    </button>
                  )}
                  {role === "admin" && q.status === "active" && (
                    <button
                      onClick={() => handleLifecycleAction(q.id, "retire")}
                      className="bg-gray-500 text-white px-2 py-1 rounded"
                    >
                      Retire
                    </button>
                  )}
                  {role === "admin" && q.status === "retired" && (
                    <button
                      onClick={() => handleLifecycleAction(q.id, "reactivate")}
                      className="bg-blue-500 text-white px-2 py-1 rounded"
                    >
                      Reactivate
                    </button>
                  )}                  
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Modal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, id: null })}
        onConfirm={performDeleteFromList}
        title="Confirm Delete"
        message="Delete this question? This will remove it from the question bank."
        confirmClass="bg-red-500 hover:bg-red-600 text-white"
      />
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
