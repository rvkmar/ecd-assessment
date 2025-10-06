import React, { useState } from "react";
import CompetencyForm from "./CompetencyForm";
import CompetencyLinker from "./CompetencyLinker";
import toast from "react-hot-toast";


export default function CompetencyPanel({
  models,
  competencies,
  links,
  activeModelId,
  form,
  setForm,
  saveAll,
  notify,
  onSave,
}) {
  const [mode, setMode] = useState("addUpdate"); // "addUpdate" | "crosslink"

  // const notify = (msg, type = "info") => {
  //   if (type === "success") toast.success(msg);
  //   else if (type === "error") toast.error(msg);
  //   else toast(msg);
  // };
  
  return (
    <div className="mb-4 mt-4 border p-3 rounded bg-gray-50">
      {/* ✅ Mode Selector */}
      <div className="flex items-center gap-3 mb-3">
        <label className="text-sm font-medium text-gray-700">Select:</label>
        <select
          className="border p-2 rounded"
          value={mode}
          onChange={(e) => setMode(e.target.value)}
        >
          <option value="addUpdate">Add / Update </option>
          <option value="crosslink">Crosslink </option>
        </select>
      </div>

      {/* ✅ Conditional Rendering */}
      {mode === "addUpdate" && (
        <CompetencyForm
          form={form}
          setForm={setForm}
          models={models}
          competencies={competencies}
          activeModelId={activeModelId}
          onSave={onSave}
        />
      )}

      {mode === "crosslink" && (
        <CompetencyLinker
          models={models}
          competencies={competencies}
          links={links}
          saveAll={saveAll}
          notify={notify}
        />
      )}
    </div>
  );
}
