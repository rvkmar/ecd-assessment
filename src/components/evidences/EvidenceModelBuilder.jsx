import React, { useState, useEffect } from "react";
import EvidenceModelForm from "./EvidenceModelForm";
import EvidenceModelList from "./EvidenceModelList";

export default function EvidenceModelBuilder({ notify }) {
  const [models, setModels] = useState([]);
  const [editingModel, setEditingModel] = useState(null);
  const [competencies, setCompetencies] = useState([]);

  useEffect(() => {
    fetch("/api/evidenceModels").then(r => r.json()).then(setModels);
    fetch("/api/competencies").then(r => r.json()).then(setCompetencies);
  }, []);

  return (
    <div>
      <EvidenceModelForm
        editingModel={editingModel}
        setEditingModel={setEditingModel}
        competencies={competencies}
        models={models}
        setModels={setModels}
        notify={notify}
      />
      <EvidenceModelList
        models={models}
        setEditingModel={setEditingModel}
        setModels={setModels}
        notify={notify}
      />
    </div>
  );
}
