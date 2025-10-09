import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { PolicyBuilder } from "./PolicyBuilder";
import Modal from "@/components/ui/Modal";
import toast from "react-hot-toast";

export function PolicyManager() {
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showBuilder, setShowBuilder] = useState(false);
  const [editPolicy, setEditPolicy] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  const role = localStorage.getItem("role") || "admin"; // fallback if not set

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
      toast.error("Failed to load policies.");
    } finally {
      setLoading(false);
    }
  }

  async function deletePolicy(id) {
    try {
      await fetch(`/api/policies/${id}`, { method: "DELETE" });
      fetchPolicies();
      toast.success("Policy deleted successfully!");
    } catch (err) {
      console.error("Error deleting policy:", err);
      toast.error("Failed to delete policy.");
    }
  }

  function confirmDelete(id) {
    setPendingDeleteId(id);
    setConfirmOpen(true);
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
                        onClick={() => confirmDelete(p.id)}
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

      {/* 🔹 Custom confirmation modal instead of browser confirm */}
      <Modal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => {
          deletePolicy(pendingDeleteId);
          setConfirmOpen(false);
        }}
        title="Delete Policy"
        message="Are you sure you want to delete this policy? This action cannot be undone."
        confirmClass="bg-red-500 hover:bg-red-600 text-white"
      />      
    </Card>
  );
}
