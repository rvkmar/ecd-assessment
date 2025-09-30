import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function StudentsManager({ notify }) {
  const [students, setStudents] = useState([]);
  const [newName, setNewName] = useState("");
  const [newClass, setNewClass] = useState("");
  const [newDistrict, setNewDistrict] = useState("");
  const [loading, setLoading] = useState(true);

  // Load students on mount
  useEffect(() => {
    fetch("/api/students")
      .then((r) => r.json())
      .then((data) => setStudents(data || []))
      .catch(() => notify?.("❌ Failed to load students"))
      .finally(() => setLoading(false));
  }, []);

  // Add student
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
      notify?.("✅ Student added");
    } catch (err) {
      console.error(err);
      notify?.("❌ Failed to add student");
    }
  };

  // Delete student
  const handleDelete = async (id) => {
    if (!confirm("Delete this student?")) return;
    try {
      const res = await fetch(`/api/students/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete student");
      setStudents(students.filter((s) => s.id !== id));
      notify?.("🗑️ Student deleted");
    } catch (err) {
      console.error(err);
      notify?.("❌ Failed to delete student");
    }
  };

  if (loading) return <div className="p-4">Loading students...</div>;

  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <CardTitle>Manage Students</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Add new student */}
          <form
            onSubmit={handleAdd}
            className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6"
          >
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
            <Button type="submit" className="md:col-span-3">
              + Add Student
            </Button>
          </form>

          {/* Student list */}
          {students.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full border text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-3 py-2 text-left border-b">Name</th>
                    <th className="px-3 py-2 text-left border-b">Class</th>
                    <th className="px-3 py-2 text-left border-b">District</th>
                    <th className="px-3 py-2 text-left border-b">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s) => (
                    <tr key={s.id} className="border-b">
                      <td className="px-3 py-2">{s.name}</td>
                      <td className="px-3 py-2">{s.classId || "-"}</td>
                      <td className="px-3 py-2">{s.districtId || "-"}</td>
                      <td className="px-3 py-2">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(s.id)}
                        >
                          Delete
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-gray-500">
              No students defined yet.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
