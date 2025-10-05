import React, { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import QuestionDashboard from "./QuestionDashboard";
import QuestionList from "./QuestionList";
import QuestionEditor from "./QuestionEditor";

/**
 * QuestionBankTabs
 * Unified module combining Dashboard, List, and Editor in one tabbed interface.
 * 
 * - Teachers/Admins can:
 *   - View statistics in Dashboard
 *   - Manage (view, filter, delete) all questions
 *   - Add/Edit questions with full ECD metadata
 */
export default function QuestionBankTabs() {
  const [tab, setTab] = useState("dashboard");
  const [editing, setEditing] = useState(null);
  const notify = (msg) => alert(msg);

  return (
    <div className="p-6">
      <Tabs value={tab} onValueChange={setTab} className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Question Bank</h2>

          <TabsList className="flex bg-gray-100 p-1 rounded-lg space-x-2">
            <TabsTrigger
              value="dashboard"
              className={`px-4 py-1.5 rounded ${
                tab === "dashboard"
                  ? "bg-blue-600 text-white"
                  : "hover:bg-blue-50"
              }`}
            >
              Dashboard
            </TabsTrigger>
            <TabsTrigger
              value="list"
              className={`px-4 py-1.5 rounded ${
                tab === "list" ? "bg-blue-600 text-white" : "hover:bg-blue-50"
              }`}
            >
              All Questions
            </TabsTrigger>
            <TabsTrigger
              value="editor"
              className={`px-4 py-1.5 rounded ${
                tab === "editor" ? "bg-blue-600 text-white" : "hover:bg-blue-50"
              }`}
            >
              Add / Edit
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="mt-4">
          <QuestionDashboard />
        </TabsContent>

        {/* List Tab */}
        <TabsContent value="list" className="mt-4">
          {!editing && (
            <QuestionList
              notify={notify}
              onEdit={(q) => {
                setEditing(q);
                setTab("editor");
              }}
            />
          )}
        </TabsContent>

        {/* Editor Tab */}
        <TabsContent value="editor" className="mt-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold">
              {editing ? "Edit Question" : "Add New Question"}
            </h3>
            <Button
              onClick={() => {
                setEditing(null);
                setTab("list");
              }}
              variant="outline"
            >
              ← Back to List
            </Button>
          </div>
          <QuestionEditor
            notify={notify}
            question={editing}
            onCancel={() => {
              setEditing(null);
              setTab("list");
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
