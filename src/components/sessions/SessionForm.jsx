import React, { useEffect, useState } from "react";

// SessionForm.jsx
// Props:
// - model: session object (may be partial for new)
// - students: array of students [{id, name}]
// - tasks: array of tasks [{id, taskModelId, questionId, ...}]
// - onSave(sessionPayload)
// - onCancel()
// - notify(message)

export default function SessionForm({ model = {}, students = [], tasks = [], onSave = () => {}, onCancel = () => {}, notify = () => {} }) {
  const [studentId, setStudentId] = useState(model.studentId || "");
  const [selectedTasks, setSelectedTasks] = useState(model.taskIds || []);
  const [selectionStrategy, setSelectionStrategy] = useState(model.selectionStrategy || "fixed");
  const [nextTaskPolicyText, setNextTaskPolicyText] = useState(
    model.nextTaskPolicy ? JSON.stringify(model.nextTaskPolicy, null, 2) : "{}"
  );
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setStudentId(model.studentId || "");
    setSelectedTasks(model.taskIds || []);
    setSelectionStrategy(model.selectionStrategy || "fixed");
    setNextTaskPolicyText(model.nextTaskPolicy ? JSON.stringify(model.nextTaskPolicy, null, 2) : "{}");
  }, [model]);

  const toggleTask = (taskId) => {
    if (selectedTasks.includes(taskId)) {
      setSelectedTasks(selectedTasks.filter((t) => t !== taskId));
    } else {
      setSelectedTasks([...selectedTasks, taskId]);
    }
  };

  const moveTask = (index, dir) => {
    const newList = [...selectedTasks];
    const swapIndex = dir === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= newList.length) return;
    const tmp = newList[swapIndex];
    newList[swapIndex] = newList[index];
    newList[index] = tmp;
    setSelectedTasks(newList);
  };

  const handleStrategyChange = (val) => {
    setSelectionStrategy(val);
    // Pre-fill sensible defaults based on strategy
    if (val === "fixed") {
      setNextTaskPolicyText("{}");
    } else if (val === "IRT") {
      setNextTaskPolicyText(JSON.stringify({ irt: { initialTheta: 0, maxStdErr: 0.5 } }, null, 2));
    } else if (val === "BayesianNetwork") {
      setNextTaskPolicyText(JSON.stringify({ bn: { entropyThreshold: 0.2 } }, null, 2));
    } else if (val === "custom") {
      setNextTaskPolicyText(JSON.stringify({ custom: { rule: "define here" } }, null, 2));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!studentId) return notify("Please select a student");
    if (!Array.isArray(selectedTasks) || selectedTasks.length === 0) return notify("Please select at least one task");

    let nextTaskPolicy = {};
    try {
      nextTaskPolicy = JSON.parse(nextTaskPolicyText || "{}");
    } catch (err) {
      return notify("Next task policy JSON is invalid: " + err.message);
    }

    const payload = {
      id: model.id,
      studentId,
      taskIds: selectedTasks,
      selectionStrategy,
      nextTaskPolicy,
    };

    setBusy(true);
    try {
      onSave(payload);
    } catch (e) {
      console.error(e);
      notify("Failed to save session");
    } finally {
      setBusy(false);
    }
  };

  const getTaskLabel = (t) => {
    const labelParts = [];
    if (t.taskModelId) labelParts.push(t.taskModelId);
    if (t.questionId) labelParts.push(t.questionId);
    return labelParts.join(" • ") || t.id;
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block font-medium">Student</label>
        <select value={studentId} onChange={(e) => setStudentId(e.target.value)} className="border p-2 rounded w-full">
          <option value="">Select student</option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>{s.name || s.id}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block font-medium">Select Tasks (order matters)</label>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Available Tasks</p>
            <div className="max-h-48 overflow-auto border rounded p-2 mt-2 bg-white">
              {tasks.map((t) => (
                <label key={t.id} className="block text-sm">
                  <input type="checkbox" checked={selectedTasks.includes(t.id)} onChange={() => toggleTask(t.id)} />{' '}
                  {getTaskLabel(t)} <span className="text-gray-400">({t.id})</span>
                </label>
              ))}
              {tasks.length === 0 && <p className="text-gray-500 text-sm">No tasks available</p>}
            </div>
          </div>

          <div>
            <p className="text-sm text-gray-600">Selected (ordered)</p>
            <div className="max-h-48 overflow-auto border rounded p-2 mt-2 bg-white">
              {selectedTasks.map((tid, idx) => {
                const t = tasks.find((x) => x.id === tid) || { id: tid };
                return (
                  <div key={tid} className="flex items-center justify-between text-sm py-1">
                    <div className="truncate">{getTaskLabel(t)} <span className="text-gray-400">({tid})</span></div>
                    <div className="flex items-center space-x-1">
                      <button type="button" onClick={() => moveTask(idx, 'up')} title="Move up" className="px-2 py-0.5 border rounded">↑</button>
                      <button type="button" onClick={() => moveTask(idx, 'down')} title="Move down" className="px-2 py-0.5 border rounded">↓</button>
                      <button type="button" onClick={() => toggleTask(tid)} title="Remove" className="px-2 py-0.5 border rounded text-red-600">✕</button>
                    </div>
                  </div>
                );
              })}
              {selectedTasks.length === 0 && <p className="text-gray-500 text-sm">No tasks selected</p>}
            </div>
          </div>
        </div>
      </div>

      <div>
        <label className="block font-medium">Selection Strategy</label>
        <select value={selectionStrategy} onChange={(e) => handleStrategyChange(e.target.value)} className="border p-2 rounded w-full">
          <option value="fixed">Fixed (sequential)</option>
          <option value="IRT">IRT (adaptive)</option>
          <option value="BayesianNetwork">Bayesian Network (adaptive)</option>
          <option value="custom">Custom</option>
        </select>
      </div>

      {(selectionStrategy === "IRT" || selectionStrategy === "BayesianNetwork" || selectionStrategy === "custom") && (
        <div>
          <label className="block font-medium">Next Task Policy (JSON)</label>
          <textarea value={nextTaskPolicyText} onChange={(e) => setNextTaskPolicyText(e.target.value)} rows={6} className="border p-2 rounded w-full font-mono text-sm" />
          <p className="text-xs text-gray-400 mt-1">Provide policy configuration as JSON.</p>
        </div>
      )}

      <div className="flex space-x-2">
        <button type="submit" disabled={busy} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Save Session</button>
        <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400">Cancel</button>
      </div>
    </form>
  );
}