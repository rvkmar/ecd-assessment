// src/components/ui/DashboardLayout.jsx
import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { can } from "@/config/rolePermissions";

export default function DashboardLayout({ title, tabs }) {
  const role = localStorage.getItem("role");

  // Filter tabs based on what the role can view
  const visibleTabs = tabs?.filter((tab) => {
    // tab.entity (add this in tab definitions)
    if (!tab.entity) return true;
    return can(role, "view", tab.entity);
  });

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">{title}</h1>

      <Tabs defaultValue={visibleTabs[0]?.id} className="w-full">
        <TabsList className="mb-4 flex flex-wrap gap-2">
          {visibleTabs.map((tab) => (
            <TabsTrigger key={tab.id} value={tab.id}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {visibleTabs.map((tab) => (
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
