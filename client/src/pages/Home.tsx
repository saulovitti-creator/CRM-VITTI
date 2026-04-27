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
      <div className="flex flex-col h-full space-y-5">
        
        {/* Top Header / Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-page-title">
              CRM Vitti <span className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full ml-2">Live V2</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Gerencie seus contatos e funil de vendas</p>
          </div>

          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setTagManagementOpen(true)}
            >
              <Tags className="w-4 h-4 mr-2" />
              Gerenciar Tags
            </Button>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setCustomFieldsModalOpen(true)}
            >
              <Settings2 className="w-4 h-4 mr-2" />
              Campos Personalizados
            </Button>
          </div>
        </div>

        {/* View Toggle (Tabs) — Linear-style underline tabs */}
        <div className="flex border-b border-border">
          <button
            onClick={() => setActiveTab("contacts")}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors relative
              ${activeTab === "contacts" 
                ? "text-foreground" 
                : "text-muted-foreground hover:text-foreground"
              }`}
          >
            <Users className="w-4 h-4" />
            Contatos
            {activeTab === "contacts" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
            )}
          </button>
          <button
            onClick={() => setActiveTab("opportunities")}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors relative
              ${activeTab === "opportunities" 
                ? "text-foreground" 
                : "text-muted-foreground hover:text-foreground"
              }`}
          >
            <Briefcase className="w-4 h-4" />
            Negócios (Funil)
            {activeTab === "opportunities" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
            )}
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
