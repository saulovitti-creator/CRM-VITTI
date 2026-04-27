import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { ContactFormDialog } from "./ContactFormDialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Loader2, Building, Mail, Phone, MapPin, UserPlus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { TagBadge } from "./TagBadge";

export function ContactsList() {
  const [search, setSearch] = useState("");
  const { data: contacts, isLoading } = trpc.contacts.list.useQuery({ search: search || undefined });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar contatos..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <ContactFormDialog />
      </div>

      <div className="bg-card rounded-xl border overflow-hidden">
        {isLoading ? (
          <div className="p-12 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : contacts?.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-4">
              <UserPlus className="w-6 h-6 text-muted-foreground" />
            </div>
            <h3 className="text-sm font-medium text-foreground mb-1">Nenhum contato encontrado</h3>
            <p className="text-sm text-muted-foreground mb-4">Comece adicionando seu primeiro contato ao CRM.</p>
            <ContactFormDialog />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b">
                <TableHead className="text-label">Nome / Empresa</TableHead>
                <TableHead className="text-label">Contato</TableHead>
                <TableHead className="text-label">Tags</TableHead>
                <TableHead className="text-label">Segmento / Cidade</TableHead>
                <TableHead className="text-label text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contacts?.map((contact) => (
                <TableRow key={contact.id} className="group transition-colors">
                  <TableCell>
                    <div className="font-medium text-sm text-foreground">{contact.name}</div>
                    {contact.company && (
                      <div className="flex items-center text-xs text-muted-foreground mt-1">
                        <Building className="w-3 h-3 mr-1.5 shrink-0" />
                        {contact.company}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {contact.email && (
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Mail className="w-3 h-3 mr-1.5 shrink-0" />
                        {contact.email}
                      </div>
                    )}
                    {contact.phone && (
                      <div className="flex items-center text-sm text-muted-foreground mt-1">
                        <Phone className="w-3 h-3 mr-1.5 shrink-0" />
                        {contact.phone}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {contact.tags?.map((t: any) => (
                        <TagBadge key={t.id} tag={t} />
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-foreground">{contact.segment || "-"}</div>
                    {contact.city && (
                      <div className="flex items-center text-xs text-muted-foreground mt-1">
                        <MapPin className="w-3 h-3 mr-1.5 shrink-0" />
                        {contact.city}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <ContactFormDialog 
                      contact={contact} 
                      trigger={
                        <button className="text-primary hover:text-primary/80 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                          Editar
                        </button>
                      } 
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
