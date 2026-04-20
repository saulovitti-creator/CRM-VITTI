import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

export function DownloadTemplateButton() {
  const handleDownloadTemplate = () => {
    try {
      // Criar dados de exemplo
      const templateData = [
        {
          "Empresa *": "Exemplo Clínica 1",
          "Contato": "Dr. João Silva",
          "Telefone *": "11 98765-4321",
          "Email": "joao@clinica.com",
          "Segmento *": "Clínica",
          "Status *": "Entrar em contato",
          "Site": "www.clinica1.com.br",
          "Cidade": "São Paulo",
          "Notas": "Primeira consulta agendada",
        },
        {
          "Empresa *": "Restaurante XYZ",
          "Contato": "Maria Santos",
          "Telefone *": "11 99876-5432",
          "Email": "maria@restaurante.com",
          "Segmento *": "Restaurante",
          "Status *": "Contatado",
          "Site": "www.restaurantexyz.com.br",
          "Cidade": "São Paulo",
          "Notas": "Interesse em promoção",
        },
        {
          "Empresa *": "Bar do Bairro",
          "Contato": "Carlos Oliveira",
          "Telefone *": "11 97654-3210",
          "Email": "carlos@bar.com",
          "Segmento *": "Bar",
          "Status *": "Interessado",
          "Site": "",
          "Cidade": "Rio de Janeiro",
          "Notas": "Aguardando retorno",
        },
      ];

      // Criar workbook
      const ws = XLSX.utils.json_to_sheet(templateData);
      
      // Configurar largura das colunas
      const colWidths = [
        { wch: 25 }, // Empresa
        { wch: 20 }, // Contato
        { wch: 18 }, // Telefone
        { wch: 25 }, // Email
        { wch: 15 }, // Segmento
        { wch: 20 }, // Status
        { wch: 25 }, // Site
        { wch: 15 }, // Cidade
        { wch: 30 }, // Notas
      ];
      ws["!cols"] = colWidths;

      // Adicionar estilos ao header (primeira linha)
      const headerStyle = {
        font: { bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "4F46E5" } },
        alignment: { horizontal: "center", vertical: "center" },
      };

      // Aplicar estilo ao header
      for (let i = 0; i < 9; i++) {
        const cellRef = XLSX.utils.encode_col(i) + "1";
        if (ws[cellRef]) {
          ws[cellRef].s = headerStyle;
        }
      }

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Prospectos");

      // Baixar arquivo
      XLSX.writeFile(wb, "template_prospectos.xlsx");
      toast.success("Template baixado com sucesso!");
    } catch (error) {
      console.error("Erro ao gerar template:", error);
      toast.error("Erro ao gerar template");
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleDownloadTemplate}
      title="Baixar template XLSX para importação de prospectos"
    >
      <Download className="w-4 h-4 mr-2" />
      Baixar Template
    </Button>
  );
}
