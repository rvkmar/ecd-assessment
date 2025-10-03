// src/components/ui/DashboardLayout.jsx
import React from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function DashboardLayout({ title, tabs }) {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">{title}</h1>

      <Tabs defaultValue={tabs[0]?.id} className="w-full">
        <TabsList className="mb-4 flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <TabsTrigger key={tab.id} value={tab.id}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {tabs.map((tab) => (
          <TabsContent key={tab.id} value={tab.id}>
            <Card>
              <CardHeader>
                <CardTitle>{tab.label}</CardTitle>
              </CardHeader>
              <CardContent>{tab.content}</CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
