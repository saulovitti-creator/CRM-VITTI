import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

export function DownloadTemplateButton() {
  const handleDownloadTemplate = () => {
    try {
      // ── Dados de exemplo ──
      const templateData = [
        {
          // Bloco A — Contato
          "Nome": "Dr. João Silva",
          "Empresa": "Clínica São Lucas",
          "Telefone": "14 99876-5432",
          "Email": "joao@clinicasaolucas.com",
          "Segmento": "Saúde",
          "Cidade": "Bauru",
          // Bloco B — Oportunidade
          "Nome da Oportunidade": "Venda CRM - Clínica São Lucas",
          "Pipeline": "Pipeline Principal",
          "Estágio Inicial": "",
          "Valor Estimado": "15000",
          "Origem": "Indicação",
          "Tags": "Quente",
          "Observações": "Cliente indicado pelo parceiro X",
        },
        {
          "Nome": "Maria Santos",
          "Empresa": "Restaurante XYZ",
          "Telefone": "11 98765-4321",
          "Email": "maria@restaurantexyz.com",
          "Segmento": "Alimentação",
          "Cidade": "São Paulo",
          "Nome da Oportunidade": "",
          "Pipeline": "Pipeline Principal",
          "Estágio Inicial": "Entrar em contato",
          "Valor Estimado": "8500",
          "Origem": "Site",
          "Tags": "",
          "Observações": "",
        },
        {
          "Nome": "Carlos Oliveira",
          "Empresa": "Tech Solutions",
          "Telefone": "21 97654-3210",
          "Email": "",
          "Segmento": "Tecnologia",
          "Cidade": "Rio de Janeiro",
          "Nome da Oportunidade": "Consultoria TI - Tech Solutions",
          "Pipeline": "Pipeline Principal",
          "Estágio Inicial": "",
          "Valor Estimado": "",
          "Origem": "Prospecção Ativa",
          "Tags": "B2B",
          "Observações": "Primeiro contato via LinkedIn",
        },
      ];

      // ── Criar worksheet ──
      const ws = XLSX.utils.json_to_sheet(templateData);

      // ── Largura das colunas ──
      ws["!cols"] = [
        { wch: 22 }, // Nome
        { wch: 25 }, // Empresa
        { wch: 18 }, // Telefone
        { wch: 28 }, // Email
        { wch: 15 }, // Segmento
        { wch: 15 }, // Cidade
        { wch: 35 }, // Nome da Oportunidade
        { wch: 22 }, // Pipeline
        { wch: 22 }, // Estágio Inicial
        { wch: 15 }, // Valor Estimado
        { wch: 18 }, // Origem
        { wch: 15 }, // Tags
        { wch: 35 }, // Observações
      ];

      // ── Instruções ──
      const instructionsData = [
        { "Campo": "Nome", "Obrigatório": "Sim *", "Descrição": "Nome do contato. Obrigatório se 'Empresa' estiver vazio." },
        { "Campo": "Empresa", "Obrigatório": "Sim *", "Descrição": "Nome da empresa. Obrigatório se 'Nome' estiver vazio." },
        { "Campo": "Telefone", "Obrigatório": "Sim *", "Descrição": "Telefone do contato. Aceita formatos como (14) 99999-9999 ou 14999999999. Obrigatório se 'Email' estiver vazio." },
        { "Campo": "Email", "Obrigatório": "Sim *", "Descrição": "Email do contato. Aceita maiúsculas e minúsculas. Obrigatório se 'Telefone' estiver vazio." },
        { "Campo": "Segmento", "Obrigatório": "Não", "Descrição": "Segmento de atuação (ex: Saúde, Tecnologia, Alimentação)." },
        { "Campo": "Cidade", "Obrigatório": "Não", "Descrição": "Cidade do contato." },
        { "Campo": "Nome da Oportunidade", "Obrigatório": "Não", "Descrição": "Nome do negócio. Se vazio, será gerado como 'Venda - [Empresa]'." },
        { "Campo": "Pipeline", "Obrigatório": "Sim **", "Descrição": "Nome exato do pipeline no CRM. Obrigatório no modo Contatos + Oportunidades." },
        { "Campo": "Estágio Inicial", "Obrigatório": "Não", "Descrição": "Nome exato do estágio. Se vazio, usa o primeiro estágio ativo do pipeline." },
        { "Campo": "Valor Estimado", "Obrigatório": "Não", "Descrição": "Valor numérico. Aceita formatos como 1500, 1500,00, 1.500,00 ou R$ 1.500,00. NÃO use formato internacional (1,500.00)." },
        { "Campo": "Origem", "Obrigatório": "Não", "Descrição": "Origem do contato/negócio (ex: Site, Indicação, Prospecção Ativa)." },
        { "Campo": "Tags", "Obrigatório": "Não", "Descrição": "Nome de UMA ÚNICA tag existente no CRM. Se não existir, não será aplicada." },
        { "Campo": "Observações", "Obrigatório": "Não", "Descrição": "Notas ou observações sobre a oportunidade." },
        { "Campo": "", "Obrigatório": "", "Descrição": "" },
        { "Campo": "REGRAS", "Obrigatório": "", "Descrição": "" },
        { "Campo": "* Obrigatório condicional", "Obrigatório": "", "Descrição": "É preciso ter pelo menos Nome ou Empresa, e pelo menos Telefone ou Email." },
        { "Campo": "** Obrigatório no modo Oportunidades", "Obrigatório": "", "Descrição": "Pipeline só é obrigatório se você escolher importar Contatos + Oportunidades." },
        { "Campo": "Modo 'Apenas Contatos'", "Obrigatório": "", "Descrição": "Preencha apenas as colunas de Nome a Cidade. As demais serão ignoradas." },
        { "Campo": "Modo 'Contatos + Oportunidades'", "Obrigatório": "", "Descrição": "Preencha todas as colunas. Pipeline é obrigatório neste modo." },
      ];

      const wsInstructions = XLSX.utils.json_to_sheet(instructionsData);
      wsInstructions["!cols"] = [
        { wch: 35 },
        { wch: 15 },
        { wch: 70 },
      ];

      // ── Montar workbook ──
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Dados");
      XLSX.utils.book_append_sheet(wb, wsInstructions, "Instruções");

      // ── Download ──
      XLSX.writeFile(wb, "template_importacao_crm_vitti.xlsx");
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
      title="Baixar template XLSX para importação"
    >
      <Download className="w-4 h-4 mr-2" />
      Baixar Template
    </Button>
  );
}
