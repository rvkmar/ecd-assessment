import React from "react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// Reusable placeholder table
function PlaceholderTable({ columns }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border border-gray-200 text-sm">
        <thead className="bg-gray-100">
          <tr>
            {columns.map((col) => (
              <th
                key={col}
                className="px-4 py-2 text-left font-medium text-gray-700 border-b"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            {columns.map((col) => (
              <td key={col} className="px-4 py-2 border-b">
                Sample {col}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export default function AdminPage() {
  const navigate = useNavigate();

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Admin Dashboard</h1>

      <Tabs defaultValue="competencies" className="w-full">
        <TabsList className="mb-4 flex flex-wrap gap-2">
          <TabsTrigger value="competencies">Competencies</TabsTrigger>
          <TabsTrigger value="evidence">Evidence</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Competencies */}
        <TabsContent value="competencies">
          <Card>
            <CardHeader>
              <CardTitle>Competency Models</CardTitle>
            </CardHeader>
            <CardContent>
              <Button className="mb-4">+ Add Competency Model</Button>
              <PlaceholderTable
                columns={["ID", "Name", "Version", "Status", "Actions"]}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Evidence */}
        <TabsContent value="evidence">
          <Card>
            <CardHeader>
              <CardTitle>Evidence Models</CardTitle>
            </CardHeader>
            <CardContent>
              <Button className="mb-4">+ Add Evidence Model</Button>
              <PlaceholderTable
                columns={[
                  "ID",
                  "Name",
                  "Type",
                  "Linked Competency",
                  "Actions",
                ]}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tasks */}
        <TabsContent value="tasks">
          <Card>
            <CardHeader>
              <CardTitle>Task Models</CardTitle>
            </CardHeader>
            <CardContent>
              <Button className="mb-4">+ Add Task Model</Button>
              <PlaceholderTable
                columns={[
                  "ID",
                  "Name",
                  "Linked Evidence",
                  "Difficulty",
                  "Status",
                  "Actions",
                ]}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sessions */}
        <TabsContent value="sessions">
          <Card>
            <CardHeader>
              <CardTitle>Sessions</CardTitle>
            </CardHeader>
            <CardContent>
              <Button className="mb-4">+ Create Session</Button>
              <PlaceholderTable
                columns={[
                  "Session ID",
                  "Teacher",
                  "Students",
                  "Status",
                  "Actions",
                ]}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Users */}
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 mb-4">
                <Button onClick={() => navigate("/students")}>
                  Manage Students
                </Button>
                <Button onClick={() => navigate("/teachers")}>
                  Manage Teachers
                </Button>
              </div>
              {/* Optional summary table */}
              <PlaceholderTable
                columns={[
                  "User ID",
                  "Name",
                  "Role",
                  "District/Class",
                  "Actions",
                ]}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings */}
        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>System Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <PlaceholderTable columns={["Setting", "Value", "Actions"]} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
