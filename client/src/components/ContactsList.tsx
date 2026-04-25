import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { ContactFormDialog } from "./ContactFormDialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Loader2, Building, Mail, Phone, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { TagBadge } from "./TagBadge";

export function ContactsList() {
  const [search, setSearch] = useState("");
  const { data: contacts, isLoading } = trpc.contacts.list.useQuery({ search: search || undefined });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="relative w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
          <Input
            placeholder="Buscar contatos..."
            className="pl-9 bg-slate-800 border-slate-700 text-slate-200"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <ContactFormDialog />
      </div>

      <div className="bg-slate-900 rounded-lg border border-slate-800 overflow-hidden">
        {isLoading ? (
          <div className="p-8 flex justify-center text-slate-500">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-slate-800/50">
              <TableRow className="border-slate-800 hover:bg-transparent">
                <TableHead className="text-slate-400">Nome / Empresa</TableHead>
                <TableHead className="text-slate-400">Contato</TableHead>
                <TableHead className="text-slate-400">Tags</TableHead>
                <TableHead className="text-slate-400">Segmento/Cidade</TableHead>
                <TableHead className="text-slate-400 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contacts?.length === 0 ? (
                <TableRow className="border-slate-800 hover:bg-slate-800/50 transition-colors">
                  <TableCell colSpan={5} className="text-center text-slate-500 py-8">
                    Nenhum contato encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                contacts?.map((contact) => (
                  <TableRow key={contact.id} className="border-slate-800 hover:bg-slate-800/50 transition-colors">
                    <TableCell>
                      <div className="font-medium text-slate-200">{contact.name}</div>
                      {contact.company && (
                        <div className="flex items-center text-sm text-slate-500 mt-1">
                          <Building className="w-3 h-3 mr-1" />
                          {contact.company}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {contact.email && (
                        <div className="flex items-center text-sm text-slate-400">
                          <Mail className="w-3 h-3 mr-1" />
                          {contact.email}
                        </div>
                      )}
                      {contact.phone && (
                        <div className="flex items-center text-sm text-slate-400 mt-1">
                          <Phone className="w-3 h-3 mr-1" />
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
                      <div className="text-sm text-slate-300">{contact.segment || "-"}</div>
                      {contact.city && (
                        <div className="flex items-center text-xs text-slate-500 mt-1">
                          <MapPin className="w-3 h-3 mr-1" />
                          {contact.city}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <ContactFormDialog 
                        contact={contact} 
                        trigger={<button className="text-cyan-500 hover:text-cyan-400 text-sm font-medium">Editar</button>} 
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
