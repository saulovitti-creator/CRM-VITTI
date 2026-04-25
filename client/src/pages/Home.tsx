import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { TagManagementModal } from "@/components/TagManagementModal";
import { CustomFieldsManagementModal } from "@/components/CustomFieldsManagementModal";
import { ContactsList } from "@/components/ContactsList";
import { OpportunityKanban } from "@/components/OpportunityKanban";
import { Users, Briefcase, Settings2, Tags } from "lucide-react";

export default function Home() {
  const [activeTab, setActiveTab] = useState<"contacts" | "opportunities">("opportunities");
  
  const [tagManagementOpen, setTagManagementOpen] = useState(false);
  const [customFieldsModalOpen, setCustomFieldsModalOpen] = useState(false);

  return (
    <DashboardLayout>
      <div className="flex flex-col h-full space-y-6">
        
        {/* Top Header / Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-100 tracking-tight">CRM Vitti</h1>
            <p className="text-sm text-slate-400">Gerencie seus contatos e funil de vendas</p>
          </div>

          <div className="flex items-center gap-2">
            {/* System Settings Buttons */}
            <Button 
              variant="outline" 
              size="sm" 
              className="border-slate-700 text-slate-300 hover:bg-slate-800"
              onClick={() => setTagManagementOpen(true)}
            >
              <Tags className="w-4 h-4 mr-2" />
              Gerenciar Tags
            </Button>
            
            <Button 
              variant="outline" 
              size="sm" 
              className="border-slate-700 text-slate-300 hover:bg-slate-800"
              onClick={() => setCustomFieldsModalOpen(true)}
            >
              <Settings2 className="w-4 h-4 mr-2" />
              Campos Personalizados
            </Button>
          </div>
        </div>

        {/* View Toggle (Tabs) */}
        <div className="flex p-1 bg-slate-900 rounded-lg w-max border border-slate-800">
          <button
            onClick={() => setActiveTab("contacts")}
            className={`flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === "contacts" 
                ? "bg-slate-800 text-slate-100 shadow-sm" 
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Users className="w-4 h-4 mr-2" />
            Contatos
          </button>
          <button
            onClick={() => setActiveTab("opportunities")}
            className={`flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === "opportunities" 
                ? "bg-slate-800 text-slate-100 shadow-sm" 
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Briefcase className="w-4 h-4 mr-2" />
            Negócios (Funil)
          </button>
        </div>

        {/* Main Content Area */}
        <div className="flex-1">
          {activeTab === "contacts" ? (
            <ContactsList />
          ) : (
            <OpportunityKanban />
          )}
        </div>

      </div>

      {/* Global Modals */}
      <TagManagementModal 
        open={tagManagementOpen} 
        onOpenChange={setTagManagementOpen} 
      />
      <CustomFieldsManagementModal 
        open={customFieldsModalOpen} 
        onOpenChange={setCustomFieldsModalOpen} 
      />
    </DashboardLayout>
  );
}
