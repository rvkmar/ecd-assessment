// src/components/taskModels/TaskModelDetails.jsx
import React, { useEffect, useState } from "react";
import Card from "../ui/Card";
import Modal from "../ui/Modal";

export default function TaskModelDetails({ taskModel, onClose }) {
  const [evidenceModels, setEvidenceModels] = useState([]);
  const [questions, setQuestions] = useState([]);

  useEffect(() => {
    fetch("/api/evidenceModels")
      .then((r) => r.json())
      .then((data) => setEvidenceModels(data || []));

    fetch("/api/questions")
      .then((r) => r.json())
      .then((data) => setQuestions(data || []));
  }, []);

  if (!taskModel) return null;

  const getEvidenceModel = (id) => evidenceModels.find((m) => m.id === id);

  const getEvidenceDescription = (id) => {
    for (const em of evidenceModels) {
      const ev = (em.evidences || []).find((e) => e.id === id);
      if (ev) return ev.description || ev.id;
    }
    return id;
  };

  const getObservationDescription = (id) => {
    for (const em of evidenceModels) {
      const obs = (em.observations || []).find((o) => o.id === id);
      if (obs) return obs.description || obs.id;
    }
    return id;
  };

  const getQuestionText = (id) => {
    const q = questions.find((qq) => qq.id === id);
    return q ? (q.stem || q.text || q.id) : id;
  };

  // Group expectedObservations by evidenceModel
  const groupedEO = {};
  for (const emId of taskModel.evidenceModelIds || []) {
    groupedEO[emId] = [];
  }
  for (const eo of taskModel.expectedObservations || []) {
    for (const em of evidenceModels) {
      const hasObs = (em.observations || []).some((o) => o.id === eo.observationId);
      const hasEv = (em.evidences || []).some((e) => e.id === eo.evidenceId);
      if (hasObs || hasEv) {
        if (!groupedEO[em.id]) groupedEO[em.id] = [];
        groupedEO[em.id].push(eo);
      }
    }
  }

  return (
    <Modal
      isOpen={!!taskModel}
      onClose={onClose}
      title={`Task Model: ${taskModel.name}`}
      message=""
    >
      <Card>
        <p>
          <strong>Description:</strong> {taskModel.description || "-"}
        </p>
        <p>
          <strong>Difficulty:</strong> {taskModel.difficulty || "-"}
        </p>

        <p>
          <strong>Actions:</strong>{" "}
          {taskModel.actions && taskModel.actions.length
            ? taskModel.actions.join(", ")
            : "-"}
        </p>

        <h4 className="mt-3 font-semibold">Expected Observations & Item Mappings</h4>
        {Object.keys(groupedEO).length > 0 ? (
          Object.entries(groupedEO).map(([emId, eoList]) => {
            const em = getEvidenceModel(emId);
            return (
              <div key={emId} className="mb-3">
                <p className="font-medium text-blue-600">
                  Evidence Model: {em ? em.name : emId}
                </p>
                {eoList.length > 0 ? (
                  <ul className="list-disc ml-5">
                    {eoList.map((eo, i) => {
                      const mapping = (taskModel.itemMappings || []).find(
                        (m) =>
                          m.observationId === eo.observationId &&
                          m.evidenceId === eo.evidenceId
                      );
                      return (
                        <li key={i}>
                          Observation:{" "}
                          <span className="italic">
                            {getObservationDescription(eo.observationId)}
                          </span>{" "}
                          (<code>{eo.observationId}</code>), Evidence:{" "}
                          <span className="italic">
                            {getEvidenceDescription(eo.evidenceId)}
                          </span>{" "}
                          (<code>{eo.evidenceId}</code>)
                          {mapping ? (
                            <div className="ml-4 text-sm text-green-700">
                              ↳ Linked Item:{" "}
                              <span className="italic">
                                {getQuestionText(mapping.itemId)}
                              </span>{" "}
                              (<code>{mapping.itemId}</code>)
                            </div>
                          ) : (
                            <div className="ml-4 text-sm text-red-500">
                              ↳ No item mapped
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-500 ml-5">No pairs defined</p>
                )}
              </div>
            );
          })
        ) : (
          <p className="text-sm text-gray-500">None defined</p>
        )}

        <h4 className="mt-3 font-semibold">Sub-Tasks</h4>
        {taskModel.subTaskIds && taskModel.subTaskIds.length > 0 ? (
          <ul className="list-disc ml-5">
            {taskModel.subTaskIds.map((id) => (
              <li key={id}>
                <code>{id}</code>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-500">None</p>
        )}
      </Card>
    </Modal>
  );
}
