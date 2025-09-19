import React, { useState } from "react";

import { loadDB, saveDB, exportDB, importDB, clearDB } from "./utils/db";
import Modal from "./components/Modal";
import ItemBank from "./components/ItemBank";
import CompetencyModelBuilder from "./components/CompetencyModelBuilder";
import EvidenceModelBuilder from "./components/EvidenceModelBuilder";
import TasksManager from "./components/TasksManager";
import StudentSession from "./components/StudentSession";
import AnalyticsPanel from "./components/AnalyticsPanel";
import Toast from "./components/Toast";

export default function App() {
  const [role, setRole] = useState("teacher");
  const [activeTask, setActiveTask] = useState(null);
  const [refreshFlag, setRefreshFlag] = useState(false);
  const [toast, setToast] = useState("");
  const [tab, setTab] = useState("items");

  // 🆕 for handling Import error modal
  const [importError, setImportError] = useState("");

  const tasks = loadDB().tasks;
  const refresh = () => setRefreshFlag(!refreshFlag);
  const notify = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2000);
  };

    // Wrapper around importDB to catch validation errors
  const handleImport = (e) => {
    importDB(
      e,
      refresh,
      (msg) => {
        if (msg.startsWith("❌")) {
          setImportError(msg); // show modal if invalid
        } else {
          notify(msg); // show toast if success
        }
      }
    );
    e.target.value = null; // reset
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-blue-600">Assessment</h1>
        <h3 className="text-lg font-semibold">v0.5.2</h3>
        <p className="italic text-gray-600">A prototype by Ravikumar Rajabhather, Lecturer, DIET Chennai</p>
        <div className="flex items-center gap-2">
          <select
            className="border p-2 rounded"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <option value="teacher">Teacher</option>
            <option value="student">Student</option>
          </select>
          {role === "teacher" && (
            <>
              <button
                onClick={exportDB}
                className="px-3 py-1 bg-purple-500 text-white rounded"
              >
                Export
              </button>

              {/* <label className="px-3 py-1 bg-gray-500 text-white rounded cursor-pointer">
                Import
                <input
                  type="file"
                  accept="application/json"
                  className="hidden"
                  // onChange={(e) => {
                  //   importDB(e, refresh, notify);
                  //   e.target.value = null;
                  // }}
                  onChange={handleImport}
                />
              </label> */}
            </>
          )}
        </div>
      </div>

      {/* Teacher Tabs */}
      {role === "teacher" && (
        <div className="bg-white rounded-xl shadow p-4">
          <div className="flex gap-4 border-b mb-4">
            <button
              className={`pb-2 ${
                tab === "items"
                  ? "border-b-2 border-blue-500 font-semibold"
                  : "text-gray-500"
              }`}
              onClick={() => setTab("items")}
            >
              Item Bank
            </button>
            <button
              className={`pb-2 ${
                tab === "competency"
                  ? "border-b-2 border-blue-500 font-semibold"
                  : "text-gray-500"
              }`}
             onClick={() => setTab("competency")}>
              Competency Models
            </button>
            <button
              className={`pb-2 ${
                tab === "models"
                  ? "border-b-2 border-blue-500 font-semibold"
                  : "text-gray-500"
              }`}
              onClick={() => setTab("models")}
            >
              Evidence Models
            </button>
            <button
              className={`pb-2 ${
                tab === "tasks"
                  ? "border-b-2 border-blue-500 font-semibold"
                  : "text-gray-500"
              }`}
              onClick={() => setTab("tasks")}
            >
              Task Models
            </button>
            <button
              className={`pb-2 ${
                tab === "analytics"
                  ? "border-b-2 border-blue-500 font-semibold"
                  : "text-gray-500"
              }`}
              onClick={() => setTab("analytics")}
            >
              Analytics
            </button>
          </div>

          {tab === "items" && <ItemBank notify={notify} />}
          {tab === "competency" && <CompetencyModelBuilder notify={notify} />}
          {tab === "models" && <EvidenceModelBuilder notify={notify} />}
          {tab === "tasks" && <TasksManager notify={notify} />}
          {tab === "analytics" && <AnalyticsPanel refreshFlag={refreshFlag} />}
        </div>
      )}

      {/* Student View */}
      {role === "student" && !activeTask && (
        <div className="bg-white rounded-xl shadow p-4">
          <h3 className="font-semibold mb-2">Available Tasks</h3>
          {tasks.length === 0 ? (
            <p>No tasks available</p>
          ) : (
            <ul className="space-y-2">
              {tasks.map((t) => (
                <li key={t.id} className="flex justify-between items-center">
                  <span>{t.title}</span>
                  <button
                    onClick={() => setActiveTask(t)}
                    className="px-2 py-1 bg-blue-500 text-white rounded"
                  >
                    Start
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {role === "student" && activeTask && (
        <StudentSession
          task={activeTask}
          onFinish={() => {
            setActiveTask(null);
            refresh();
          }}
        />
      )}

      {/* 🆕 Import Error Modal */}
      <Modal
        isOpen={!!importError}
        title="Import Error"
        message={importError}
        onClose={() => setImportError("")}
        onConfirm={() => setImportError("")}
      />

      <Toast message={toast} />
    </div>
  );
}
