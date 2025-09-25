import React from "react";
import CompetencyOverview from "../../CompetencyOverview";


export default function GraphView({ competencies, links, activeModelId }) {
return (
<CompetencyOverview
competencies={competencies.filter((c) => !activeModelId || c.modelId === activeModelId)}
links={links}
/>
);
}