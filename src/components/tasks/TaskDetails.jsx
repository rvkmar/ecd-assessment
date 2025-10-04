// src/components/tasks/TaskDetails.jsx
import React, { useState, useEffect } from "react";
import Card from "../ui/Card";
import Modal from "../ui/Modal";

export default function TaskDetails({ task, onClose }) {
  const [taskModel, setTaskModel] = useState(null);
  const [question, setQuestion] = useState(null);
  const [evidenceModels, setEvidenceModels] = useState([]);
  const [questions, setQuestions] = useState([]);

  useEffect(() => {
    if (task?.taskModelId) {
      fetch(`/api/taskModels/${task.taskModelId}`)
        .then((r) => r.json())
        .then((data) => setTaskModel(data));
    }
    if (task?.questionId) {
      fetch(`/api/questions/${task.questionId}`)
        .then((r) => r.json())
        .then((data) => setQuestion(data));
    }
    fetch("/api/evidenceModels")
      .then((r) => r.json())
      .then((data) => setEvidenceModels(data || []));
    fetch("/api/questions")
      .then((r) => r.json())
      .then((data) => setQuestions(data || []));
  }, [task]);

  if (!task) return null;

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

  // Group runtime captures by evidence model
  const groupedRuntime = {};
  for (const em of evidenceModels) {
    groupedRuntime[em.id] = { observations: [], evidences: [] };
  }

  for (const oid of task.generatedObservationIds || []) {
    for (const em of evidenceModels) {
      if ((em.observations || []).some((o) => o.id === oid)) {
        groupedRuntime[em.id].observations.push(oid);
      }
    }
  }

  for (const eid of task.generatedEvidenceIds || []) {
    for (const em of evidenceModels) {
      if ((em.evidences || []).some((e) => e.id === eid)) {
        groupedRuntime[em.id].evidences.push(eid);
      }
    }
  }

  return (
    <Modal
      isOpen={!!task}
      onClose={onClose}
      title={`Task Instance: ${task.id}`}
      message=""
    >
      <Card>
        <p>
          <strong>Activity Template:</strong>{" "}
          {taskModel ? taskModel.name : task.taskModelId}
        </p>
        <p>
          <strong>Question Linked:</strong>{" "}
          {question ? question.stem : task.questionId || "-"}
        </p>

        <p>
          <strong>Created At:</strong> {task.createdAt}
        </p>
        <p>
          <strong>Updated At:</strong> {task.updatedAt}
        </p>

        {taskModel && (
          <>
            <h4 className="mt-3 font-semibold">Activity Template Details</h4>
            <p>
              <strong>Description:</strong> {taskModel.description || "-"}
            </p>
            <p>
              <strong>Difficulty:</strong> {taskModel.difficulty || "-"}
            </p>
            <p>
              <strong>Actions:</strong>{" "}
              {taskModel.actions?.length ? taskModel.actions.join(", ") : "-"}
            </p>
          </>
        )}

        {/* Captured Runtime Evidence */}
        <h4 className="mt-4 font-semibold">Captured During Delivery</h4>
        {Object.entries(groupedRuntime).map(([emId, data]) => {
          const em = getEvidenceModel(emId);
          if (data.observations.length === 0 && data.evidences.length === 0) {
            return null;
          }
          return (
            <div key={emId} className="mb-3">
              <p className="font-medium text-blue-600">
                Evidence Rule: {em ? em.name : emId}
              </p>

              {data.observations.length > 0 ? (
                <div>
                  <p className="font-medium">Indicators:</p>
                  <ul className="list-disc ml-5">
                    {data.observations.map((oid) => {
                      const mapping = (taskModel?.itemMappings || []).find(
                        (m) => m.observationId === oid
                      );
                      return (
                        <li key={oid}>
                          {getObservationDescription(oid)} (<code>{oid}</code>)
                          {mapping ? (
                            <div className="ml-4 text-sm text-green-700">
                              ↳ Captured by Item:{" "}
                              <span className="italic">
                                {getQuestionText(mapping.itemId)}
                              </span>{" "}
                              (<code>{mapping.itemId}</code>)
                            </div>
                          ) : (
                            <div className="ml-4 text-sm text-red-500">
                              ↳ No item mapping found
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : (
                <p className="text-sm text-gray-500 ml-5">
                  No indicators captured
                </p>
              )}

              {data.evidences.length > 0 ? (
                <div>
                  <p className="font-medium">Evidences:</p>
                  <ul className="list-disc ml-5">
                    {data.evidences.map((eid) => {
                      const mapping = (taskModel?.itemMappings || []).find(
                        (m) => m.evidenceId === eid
                      );
                      return (
                        <li key={eid}>
                          {getEvidenceDescription(eid)} (<code>{eid}</code>)
                          {mapping ? (
                            <div className="ml-4 text-sm text-green-700">
                              ↳ Captured by Item:{" "}
                              <span className="italic">
                                {getQuestionText(mapping.itemId)}
                              </span>{" "}
                              (<code>{mapping.itemId}</code>)
                            </div>
                          ) : (
                            <div className="ml-4 text-sm text-red-500">
                              ↳ No item mapping found
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : (
                <p className="text-sm text-gray-500 ml-5">
                  No evidences captured
                </p>
              )}
            </div>
          );
        })}
      </Card>
    </Modal>
  );
}
