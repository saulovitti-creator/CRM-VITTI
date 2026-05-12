import { useEffect, useMemo, useState } from "react";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export interface ContactAutocompleteOption {
  id: number;
  name: string;
  company: string | null;
  phone: string | null;
  email: string | null;
}

interface ContactAutocompleteProps {
  value: string;
  onValueChange: (value: string) => void;
  initialContact?: ContactAutocompleteOption | null;
  onContactSelected?: (contact: ContactAutocompleteOption | null) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function ContactAutocomplete({
  value,
  onValueChange,
  initialContact,
  onContactSelected,
  placeholder = "Selecione o contato...",
  disabled,
}: ContactAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedContact, setSelectedContact] = useState<ContactAutocompleteOption | null>(initialContact ?? null);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 300);

    return () => clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    if (!value) {
      setSelectedContact(null);
      return;
    }

    if (initialContact && value === initialContact.id.toString()) {
      setSelectedContact(initialContact);
    }
  }, [value, initialContact]);

  const shouldSearch = open && debouncedSearch.length >= 2 && !disabled;

  const searchQuery = trpc.contacts.search.useQuery(
    { query: debouncedSearch, limit: 20 },
    {
      enabled: shouldSearch,
      staleTime: 30_000,
      retry: 1,
    }
  );

  const results = useMemo(() => searchQuery.data ?? [], [searchQuery.data]);

  const handleSelect = (contact: ContactAutocompleteOption) => {
    setSelectedContact(contact);
    onValueChange(contact.id.toString());
    onContactSelected?.(contact);
    setSearch("");
    setOpen(false);
  };

  const label = selectedContact
    ? `${selectedContact.name}${selectedContact.company ? ` (${selectedContact.company})` : ""}`
    : placeholder;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "mt-1 w-full justify-between border-border bg-muted/50 hover:bg-muted/50",
            !selectedContact && "text-muted-foreground"
          )}
        >
          <span className="truncate">{label}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            value={search}
            onValueChange={setSearch}
            placeholder="Buscar por nome, empresa, telefone ou e-mail..."
          />
          <CommandList className="max-h-[250px] overflow-y-auto">
            {searchQuery.isError && (
              <div className="px-3 py-2 text-sm text-red-500">
                Erro ao buscar contatos. Tente novamente.
              </div>
            )}
            {!searchQuery.isError && debouncedSearch.length < 2 && (
              <div className="px-3 py-2 text-sm text-muted-foreground">
                Digite pelo menos 2 caracteres para buscar.
              </div>
            )}
            {searchQuery.isFetching && shouldSearch && (
              <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Buscando...
              </div>
            )}
            {!searchQuery.isFetching && shouldSearch && (
              <>
                <CommandEmpty>Nenhum contato encontrado.</CommandEmpty>
                <CommandGroup>
                  {results.map((contact) => (
                    <CommandItem
                      key={contact.id}
                      value={`${contact.id}`}
                      onSelect={() => handleSelect(contact)}
                      className="flex items-start justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="truncate font-medium">
                          {contact.name}
                          {contact.company ? ` (${contact.company})` : ""}
                        </div>
                        <div className="truncate text-xs text-muted-foreground">
                          {[contact.phone, contact.email].filter(Boolean).join(" - ") || "Sem telefone/e-mail"}
                        </div>
                      </div>
                      {selectedContact?.id === contact.id && (
                        <Check className="h-4 w-4 shrink-0 text-primary" />
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
