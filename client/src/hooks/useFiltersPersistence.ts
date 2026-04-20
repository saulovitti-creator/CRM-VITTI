import { useState, useEffect } from "react";

interface Filters {
  searchTerm: string;
  selectedCategory: string | null;
  selectedStatus: string | null;
  siteStatus: 'all' | 'with_site' | 'without_site';
  selectedCity: string | null;
}

const STORAGE_KEY_PREFIX = "crm-filters-";

export function useFiltersPersistence(type: "CRM" | "Site") {
  const storageKey = `${STORAGE_KEY_PREFIX}${type}`;

  // Carregar filtros salvos do localStorage
  const loadFilters = (): Filters => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        return { selectedCity: null, ...JSON.parse(saved) };
      }
    } catch (error) {
      console.error("Erro ao carregar filtros do localStorage:", error);
    }
    return {
      searchTerm: "",
      selectedCategory: null,
      selectedStatus: null,
      siteStatus: 'all',
      selectedCity: null,
    };
  };

  const [filters, setFiltersState] = useState<Filters>(loadFilters);

  // Salvar filtros no localStorage sempre que mudarem
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(filters));
    } catch (error) {
      console.error("Erro ao salvar filtros no localStorage:", error);
    }
  }, [filters, storageKey]);

  // Recarregar filtros quando o tipo mudar
  useEffect(() => {
    setFiltersState(loadFilters());
  }, [type]);

  const setSearchTerm = (value: string) => {
    setFiltersState((prev) => ({ ...prev, searchTerm: value }));
  };

  const setSelectedCategory = (value: string | null) => {
    setFiltersState((prev) => ({ ...prev, selectedCategory: value }));
  };

  const setSelectedStatus = (value: string | null) => {
    setFiltersState((prev) => ({ ...prev, selectedStatus: value }));
  };

  const setSiteStatus = (value: 'all' | 'with_site' | 'without_site') => {
    setFiltersState((prev) => ({ ...prev, siteStatus: value }));
  };

  const setSelectedCity = (value: string | null) => {
    setFiltersState((prev) => ({ ...prev, selectedCity: value }));
  };

  const clearFilters = () => {
    setFiltersState({
      searchTerm: "",
      selectedCategory: null,
      selectedStatus: null,
      siteStatus: 'all',
      selectedCity: null,
    });
  };

  return {
    searchTerm: filters.searchTerm,
    selectedCategory: filters.selectedCategory,
    selectedStatus: filters.selectedStatus,
    siteStatus: filters.siteStatus,
    selectedCity: filters.selectedCity,
    setSearchTerm,
    setSelectedCategory,
    setSelectedStatus,
    setSiteStatus,
    setSelectedCity,
    clearFilters,
  };
}
