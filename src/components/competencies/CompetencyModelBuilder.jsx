import React, { useState, useMemo } from "react";
import Card from "../Card";
import Modal from "../Modal";
import CompetencyLinker from "../CompetencyLinker";
import { useCompetencyStore, nowISO } from "./useCompetencyStore";
import ModelForm from "./ModelForm";
import CompetencyForm from "./CompetencyForm";
import TreeView from "./CompetencyViews/TreeView";
import TableView from "./CompetencyViews/TableView";
import ListView from "./CompetencyViews/ListView";
import GraphView from "./CompetencyViews/GraphView";

export default function CompetencyModelBuilder({ notify }) {
  const { models, competencies, links, saveAll, loading } = useCompetencyStore(notify);
  const [activeModelId, setActiveModelId] = useState(null);
  const [viewMode, setViewMode] = useState("graph");

  const [modelForm, setModelForm] = useState({ id: null, name: "", description: "" });
  const [compForm, setCompForm] = useState({ id: null, name: "", description: "", parentId: "", modelId: "" });

  const [modal, setModal] = useState({ open: false, id: null, type: "" });

  const activeModel = useMemo(
    () => models.find((m) => m.id === activeModelId) || null,
    [models, activeModelId]
  );

  if (loading) {
    return <div className="p-4 text-gray-500">Loading competency models...</div>;
  }

  // --- Save model ---
  const saveModel = () => {
    console.log("[CompetencyModelBuilder] saveModel called", modelForm);

    if (!modelForm.name.trim()) return notify("Enter model name");
    const isEdit = !!modelForm.id;
    const newModel = {
      ...modelForm,
      id: modelForm.id || `m${Date.now()}`,
      createdAt: modelForm.createdAt || nowISO(),
      updatedAt: nowISO(),
    };

    const updatedModels = isEdit
      ? models.map((m) => (m.id === newModel.id ? newModel : m))
      : [newModel, ...models];

    if (!isEdit) setActiveModelId(newModel.id);
    setModelForm({ id: null, name: "", description: "" });

    console.log("[CompetencyModelBuilder] Updated models", updatedModels);
    saveAll(updatedModels, competencies, links);
    notify(isEdit ? "Model updated" : "Model added");
  };

  // --- Save competency ---
  const saveCompetency = () => {
    console.log("[CompetencyModelBuilder] saveCompetency called", compForm);

    if (!compForm.name.trim()) return notify("Enter competency name");
    const isEdit = !!compForm.id;
    const newComp = {
      ...compForm,
      id: compForm.id || `c${Date.now()}`,
      modelId: compForm.modelId || activeModelId,
      createdAt: compForm.createdAt || nowISO(),
      updatedAt: nowISO(),
    };

    let updatedCompetencies = [...competencies];
    if (isEdit) {
      updatedCompetencies = updatedCompetencies.map((c) =>
        c.id === newComp.id ? { ...c, ...newComp } : c
      );
    } else {
      updatedCompetencies.unshift(newComp);
    }

    setCompForm({ id: null, name: "", description: "", parentId: "", modelId: "" });

    console.log("[CompetencyModelBuilder] Updated competencies", updatedCompetencies);
    saveAll(models, updatedCompetencies, links);
    notify(isEdit ? "Competency updated" : "Competency added");
  };

  // --- Remove model or competency ---
  const removeItem = () => {
    console.log("[CompetencyModelBuilder] removeItem called", modal);

    if (modal.type === "model") {
      const removedModelId = modal.id;
      const removedCompetencyIds = competencies
        .filter(c => c.modelId === removedModelId)
        .map(c => c.id);

      const remainingModels = models.filter(m => m.id !== removedModelId);
      const remainingCompetencies = competencies.filter(c => c.modelId !== removedModelId);
      const remainingLinks = links.filter(
        l => !removedCompetencyIds.includes(l.sourceId) && !removedCompetencyIds.includes(l.destId)
      );

      const newActiveId = remainingModels.length ? remainingModels[0].id : null;
      setActiveModelId(newActiveId);

      console.log("[CompetencyModelBuilder] Remaining models", remainingModels);
      saveAll(remainingModels, remainingCompetencies, remainingLinks);
      notify("Model removed");
    }

    if (modal.type === "competency") {
      const idsToRemove = [modal.id];
      const remainingCompetencies = competencies.filter(
        (c) => !idsToRemove.includes(c.id)
      );
      const remainingLinks = links.filter(
        (l) => !idsToRemove.includes(l.sourceId) && !idsToRemove.includes(l.destId)
      );

      console.log("[CompetencyModelBuilder] Remaining competencies", remainingCompetencies);
      saveAll(models, remainingCompetencies, remainingLinks);
      notify("Competency removed");
    }

    setModal({ open: false, id: null, type: "" });
  };

  // --- Sync ---
  const syncNow = () => {
    console.log("[CompetencyModelBuilder] Manual sync called");
    saveAll(models, competencies, links);
    notify("✅ Sync pushed to server (local state unchanged)");
  };

  // --- Render views ---
  const renderView = () => {
    console.log("[CompetencyModelBuilder] renderView", { viewMode, activeModelId, modelsCount: models.length, competenciesCount: competencies.length });

    if (viewMode === "graph")
      return <GraphView competencies={competencies} links={links} activeModelId={activeModelId} />;
    if (viewMode === "tree")
      return <TreeView competencies={competencies} activeModelId={activeModelId} onEdit={setCompForm} />;
    if (viewMode === "table")
      return <TableView competencies={competencies} models={models} onEdit={setCompForm} />;
    if (viewMode === "list")
      return <ListView competencies={competencies} onEdit={setCompForm} />;
    return null;
  };

  return (
    <Card title="Competency Models">
      <div className="flex justify-between mb-3">
        <h3>Models</h3>
        <div>
          <button onClick={syncNow}>🔃</button>
          <select value={viewMode} onChange={(e) => setViewMode(e.target.value)}>
            <option value="graph">Graph</option>
            <option value="tree">Tree</option>
            <option value="table">Table</option>
            <option value="list">List</option>
          </select>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div>
          <ModelForm form={modelForm} setForm={setModelForm} onSave={saveModel} />

          {/* ✅ Model List Panel with competency count badges */}
          <div className="mb-4 mt-4">
            <h4 className="font-medium mb-2">Existing Models</h4>
            <ul className="space-y-1 text-sm">
              {models.map((m) => (
                <li key={m.id} className={`flex items-center gap-2 p-2 rounded ${m.id === activeModelId ? 'bg-green-50' : ''}`}>
                  <button className="flex-1 text-left" onClick={() => setActiveModelId(m.id)}>
                    {m.name}
                    <span className="ml-2 text-xs bg-gray-200 px-2 py-0.5 rounded">
                      {competencies.filter((c) => c.modelId === m.id).length}
                    </span>
                  </button>
                  <button onClick={() => setModelForm({ id: m.id, name: m.name, description: m.description })} className="px-2 py-0.5 bg-yellow-500 text-white rounded text-xs">Edit</button>
                  <button onClick={() => setModal({ open: true, id: m.id, type: 'model' })} className="px-2 py-0.5 bg-red-500 text-white rounded text-xs">Remove</button>
                </li>
              ))}
              {models.length === 0 && <li className="text-gray-500">No models yet</li>}
            </ul>
          </div>

          <div className="mb-4 mt-4">
            <h4 className="font-medium mb-2">Add / Edit Competency</h4>
          <CompetencyForm
            form={compForm}
            setForm={setCompForm}
            models={models}
            competencies={competencies}
            activeModelId={activeModelId}
            onSave={saveCompetency}
            />
          </div>
        </div>

        <div className="md:col-span-2">
          {renderView()}
          <CompetencyLinker
            competencies={competencies}
            onLinksChange={(l) => {
              console.log("[CompetencyLinker] onLinksChange fired", l);
              saveAll(models, competencies, l);
            }}
            notify={notify}
          />
        </div>
      </div>

      <Modal
        isOpen={modal.open}
        onClose={() => setModal({ open: false, id: null, type: "" })}
        onConfirm={removeItem}
        title="Confirm Delete"
        message="Remove selected item and its children?"
      />
    </Card>
  );
}
