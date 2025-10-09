import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"


// SessionForm.jsx
// Props:
// - model: session object (may be partial for new)
// - students: array of students [{id, name}]
// - tasks: array of tasks [{id, taskModelId, questionId, taskModel?: {competencyId, evidenceId}, ...}]
// - onSave(sessionPayload)
// - onCancel()
// - notify(message)

export default function SessionForm({ model = {}, students = [], tasks = [], onSave = () => {}, onCancel = () => {}, notify = () => {} }) {
  const [studentId, setStudentId] = useState(model.studentId || "");
  const [selectedTasks, setSelectedTasks] = useState(model.taskIds || []);
  const [selectionStrategy, setSelectionStrategy] = useState(model.selectionStrategy || "fixed");
  const [policies, setPolicies] = useState([]);
  const [policyId, setPolicyId] = useState(model.nextTaskPolicy?.policyId || "");
  const [busy, setBusy] = useState(false);
  const ACTIVITY_STRATEGIES = [
    {
      group: "Basic Strategy",
      options: [
        {
          value: "fixed",
          label: "Fixed Order (Same for Everyone)",
          description: "Students receive activities in a fixed, pre-set sequence."
        }
      ]
    },
    {
      group: "Adaptive Strategies",
      options: [
        {
          value: "IRT",
          label: "Adaptive by Performance (Smart Difficulty)",
          description: "Each next activity is chosen based on student performance using Item Response Theory."
        },
        {
          value: "BayesianNetwork",
          label: "Skill-based Adaptive (Using Learning Map)",
          description: "Activities adapt based on mastery of linked skills inferred through a Bayesian network model."
        },
        {
          value: "MarkovChain",
          label: "Pattern-based Adaptive (Learning Flow)",
          description: "Next activity predicted from learning patterns using a Markov chain."
        }
      ]
    }
  ];

  // const notify = (msg, type = "info") => {
  //   if (type === "success") toast.success(msg);
  //   else if (type === "error") toast.error(msg);
  //   else toast(msg);
  // };
  
  useEffect(() => {
    setStudentId(model.studentId || "");
    setSelectedTasks(model.taskIds || []);
    setSelectionStrategy(model.selectionStrategy || "fixed");
    setPolicyId(model.nextTaskPolicy?.policyId || "");
  }, [model]);

  // fetch available policies from admin
  useEffect(() => {
    fetch("/api/policies")
      .then((r) => r.json())
      .then((data) => setPolicies(data || []))
      .catch((err) => {
        console.error("Failed to fetch policies", err);
        setPolicies([]);
      });
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
    // clear selected policy if switching
    setPolicyId("");
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!studentId) return notify("Please select a student");
    if (!Array.isArray(selectedTasks) || selectedTasks.length === 0) return notify("Please select at least one activity");

    const payload = {
      id: model.id,
      studentId,
      taskIds: selectedTasks,
      selectionStrategy,
      nextTaskPolicy: policyId ? { policyId } : {},
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

  // 🔑 Enhanced task label: Question + Competency + Evidence + Model
  const getTaskLabel = (t) => {
    const parts = [];
    if (t.questionId) parts.push(`Q: ${t.questionId}`);
    if (t.taskModel?.competencyId) parts.push(`C: ${t.taskModel.competencyId}`);
    if (t.taskModel?.evidenceId) parts.push(`E: ${t.taskModel.evidenceId}`);
    if (t.taskModelId) parts.push(`M: ${t.taskModelId}`);
    return parts.join(" • ") || t.id;
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
                  <input type="checkbox" checked={selectedTasks.includes(t.id)} onChange={() => toggleTask(t.id)} />{" "}
                  <span className="font-medium">{t.questionId || "No Question"}</span>{" "}
                  <span className="text-gray-500 ml-1">
                    [{t.taskModel?.competencyId || "?"} / {t.taskModel?.evidenceId || "?"}]
                  </span>
                  <span className="text-gray-400 ml-1">({t.id})</span>
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
                    <div className="truncate">
                      {getTaskLabel(t)} <span className="text-gray-400">({tid})</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <button type="button" onClick={() => moveTask(idx, "up")} title="Move up" className="px-2 py-0.5 border rounded">↑</button>
                      <button type="button" onClick={() => moveTask(idx, "down")} title="Move down" className="px-2 py-0.5 border rounded">↓</button>
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
        <label className="block font-medium mb-1">Activity Selection Strategy</label>

        <Select value={selectionStrategy} onValueChange={handleStrategyChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select activity selection strategy" />
          </SelectTrigger>
          <SelectContent>
            {ACTIVITY_STRATEGIES.map((group) => (
              <SelectGroup key={group.group}>
                <SelectLabel>{group.group}</SelectLabel>
                {group.options.map((opt) => (
                  <TooltipProvider key={opt.value}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <SelectItem value={opt.value}>{opt.label}</SelectItem>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs text-sm">
                        {opt.description}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectionStrategy !== "fixed" && (
        <div>
          <label className="block font-medium mb-1">Select Assessment Policy</label>

          <Select value={policyId} onValueChange={setPolicyId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a policy defined by Admin" />
            </SelectTrigger>
            <SelectContent>
              {["IRT", "BayesianNetwork", "MarkovChain"].map((strategyType) => {
                const groupPolicies = policies.filter((p) => p.type === strategyType);
                if (groupPolicies.length === 0) return null;
                return (
                  <SelectGroup key={strategyType}>
                    <SelectLabel>
                      {strategyType === "IRT" && "IRT-based Policies"}
                      {strategyType === "BayesianNetwork" && "Bayesian Network Policies"}
                      {strategyType === "MarkovChain" && "Markov Chain Policies"}
                    </SelectLabel>
                    {groupPolicies.map((p) => (
                      <TooltipProvider key={p.id}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <SelectItem value={p.id}>{p.name}</SelectItem>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs text-sm">
                            {p.description || "No description provided by Admin."}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ))}
                  </SelectGroup>
                );
              })}
            </SelectContent>
          </Select>

          <p className="text-xs text-gray-400 mt-1">
            Only Admin can add or modify policies.
          </p>
        </div>
      )}


      <div className="flex space-x-2">
        <button type="submit" disabled={busy} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Save Session</button>
        <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400">Cancel</button>
      </div>
    </form>
  );
}
