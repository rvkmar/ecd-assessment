import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { PolicyBuilder } from "./PolicyBuilder";

export function PolicyManager() {
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showBuilder, setShowBuilder] = useState(false);
  const [editPolicy, setEditPolicy] = useState(null);
  const role = localStorage.getItem("role");

  useEffect(() => {
    fetchPolicies();
  }, []);

  async function fetchPolicies() {
    setLoading(true);
    try {
      const res = await fetch("/api/policies");
      const data = await res.json();
      setPolicies(data);
    } catch (err) {
      console.error("Error fetching policies:", err);
    } finally {
      setLoading(false);
    }
  }

  async function deletePolicy(id) {
    if (!window.confirm("Are you sure you want to delete this policy?")) return;
    try {
      await fetch(`/api/policies/${id}`, { method: "DELETE" });
      fetchPolicies();
    } catch (err) {
      console.error("Error deleting policy:", err);
    }
  }

  function handleEdit(policy) {
    setEditPolicy(policy);
    setShowBuilder(true);
  }

  function handleCreate() {
    setEditPolicy(null);
    setShowBuilder(true);
  }

  function handleSaved() {
    setShowBuilder(false);
    fetchPolicies();
  }

  return (
    <Card className="p-4">
      <CardHeader className="flex justify-between items-center">
        <CardTitle>Policies</CardTitle>
        {role === "admin" && (
          <Button onClick={handleCreate}>+ New Policy</Button>
          )}
      </CardHeader>

      <CardContent>
        {loading ? (
          <p>Loading policies...</p>
        ) : policies.length === 0 ? (
          <p>No policies created yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {policies.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{p.name}</TableCell>
                  <TableCell>{p.type}</TableCell>
                  <TableCell>{p.description || "-"}</TableCell>
                  <TableCell>
                    {p.updatedAt ? new Date(p.updatedAt).toLocaleDateString() : "-"}
                  </TableCell>
                  <TableCell className="space-x-2">
                      {role === "admin" ? (
                        <>
                      <Button size="sm" onClick={() => handleEdit(p)}>
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deletePolicy(p.id)}
                      >
                        Delete
                          </Button>
                        </>
                      ) : (
                        <span className="text-gray-400 text-sm">Read-only</span>
                      )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {showBuilder && (
        role === "admin" && (
          <PolicyBuilder
            policy={editPolicy}
            onCancel={() => setShowBuilder(false)}
            onSaved={handleSaved}
          />
        )
      )}
    </Card>
  );
}
