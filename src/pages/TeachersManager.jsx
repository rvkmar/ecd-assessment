import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function TeachersManager({ notify }) {
  const [teachers, setTeachers] = useState([]);
  const [newName, setNewName] = useState("");
  const [newClass, setNewClass] = useState("");
  const [newDistrict, setNewDistrict] = useState("");
  const [loading, setLoading] = useState(true);

  // Load teachers on mount
  useEffect(() => {
    fetch("/api/teachers")
      .then((r) => r.json())
      .then((data) => setTeachers(data || []))
      .catch(() => notify?.("❌ Failed to load teachers"))
      .finally(() => setLoading(false));
  }, []);

  // Add teacher
  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return notify?.("Enter a teacher name");
    try {
      const res = await fetch("/api/teachers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          classId: newClass.trim() || null,
          districtId: newDistrict.trim() || null,
        }),
      });
      if (!res.ok) throw new Error("Failed to add teacher");
      const created = await res.json();
      setTeachers([...teachers, created]);
      setNewName("");
      setNewClass("");
      setNewDistrict("");
      notify?.("✅ Teacher added");
    } catch (err) {
      console.error(err);
      notify?.("❌ Failed to add teacher");
    }
  };

  // Delete teacher
  const handleDelete = async (id) => {
    if (!confirm("Delete this teacher?")) return;
    try {
      const res = await fetch(`/api/teachers/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete teacher");
      setTeachers(teachers.filter((t) => t.id !== id));
      notify?.("🗑️ Teacher deleted");
    } catch (err) {
      console.error(err);
      notify?.("❌ Failed to delete teacher");
    }
  };

  if (loading) return <div className="p-4">Loading teachers...</div>;

  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <CardTitle>Manage Teachers</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Add new teacher */}
          <form
            onSubmit={handleAdd}
            className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6"
          >
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Teacher name"
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
              + Add Teacher
            </Button>
          </form>

          {/* Teacher list */}
          {teachers.length > 0 ? (
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
                  {teachers.map((t) => (
                    <tr key={t.id} className="border-b">
                      <td className="px-3 py-2">{t.name}</td>
                      <td className="px-3 py-2">{t.classId || "-"}</td>
                      <td className="px-3 py-2">{t.districtId || "-"}</td>
                      <td className="px-3 py-2">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(t.id)}
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
            <p className="text-sm text-gray-500">No teachers defined yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
