import React, { useEffect, useState } from "react";

// StudentsManager.jsx
// Minimal UI for managing students (list, add, delete)

export default function StudentsManager({ notify }) {
  const [students, setStudents] = useState([]);
  const [newName, setNewName] = useState("");
  const [newClass, setNewClass] = useState("");
  const [newDistrict, setNewDistrict] = useState("");
  const [loading, setLoading] = useState(true);

  // Load students
  useEffect(() => {
    fetch("/api/students")
      .then((r) => r.json())
      .then((data) => setStudents(data || []))
      .catch(() => notify?.("❌ Failed to load students"))
      .finally(() => setLoading(false));
  }, []);


  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return notify?.("Enter a student name");
    try {
      const res = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          classId: newClass.trim() || null,
          districtId: newDistrict.trim() || null,
        }),
      });
      if (!res.ok) throw new Error("Failed to add student");
      const created = await res.json();
      setStudents([...students, created]);
      setNewName("");
      setNewClass("");
      setNewDistrict("");
      notify?.("Student added");
    } catch (err) {
      console.error(err);
      notify?.("❌ Failed to add student");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this student?")) return;
    try {
      const res = await fetch(`/api/students/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete student");
      setStudents(students.filter((s) => s.id !== id));
      notify?.("Student deleted");
    } catch (err) {
      console.error(err);
      notify?.("❌ Failed to delete student");
    }
  };

  if (loading) return <div className="p-4">Loading students...</div>;


  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-bold">Students</h2>

      {/* Add new student */}
      <form onSubmit={handleAdd} className="grid grid-cols-3 gap-2">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Student name"
          className="border p-2 rounded"
        />
        <input
          type="text"
          value={newClass}
          onChange={(e) => setNewClass(e.target.value)}
          placeholder="Class ID"
          className="border p-2 rounded"
        />
        <input
          type="text"
          value={newDistrict}
          onChange={(e) => setNewDistrict(e.target.value)}
          placeholder="District ID"
          className="border p-2 rounded"
        />
        <button
          type="submit"
          className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 col-span-3"
        >
          Add
        </button>
      </form>

      {/* Student list */}
      {students.length > 0 ? (
        <ul className="divide-y border rounded">
          {students.map((s) => (
            <li key={s.id} className="flex justify-between items-center p-2">
              <div>
                <span className="font-medium">{s.name}</span>
                <span className="ml-2 text-sm text-gray-500">
                  (Class: {s.classId || "-"}, District: {s.districtId || "-"})
                </span>
              </div>
              <button
                onClick={() => handleDelete(s.id)}
                className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-gray-500">No students defined yet</p>
      )}
    </div>
  );
}