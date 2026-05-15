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
          "Valor Estimado": "15.000,00",
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
          "Estágio Inicial": "",
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
        { "Campo": "Nome", "Obrigatório": "Sim *", "Descrição": "Nome do contato. Obrigatório se 'Empresa' estiver vazio. Espaços extras serão removidos automaticamente." },
        { "Campo": "Empresa", "Obrigatório": "Sim *", "Descrição": "Nome da empresa. Obrigatório se 'Nome' estiver vazio." },
        { "Campo": "Telefone", "Obrigatório": "Sim *", "Descrição": "Telefone do contato. Pode usar máscara: (14) 99999-9999, 14 99999-9999 ou apenas 14999999999. O sistema salvará apenas os números. Obrigatório se 'Email' estiver vazio." },
        { "Campo": "Email", "Obrigatório": "Sim *", "Descrição": "Email do contato. Será convertido para letras minúsculas automaticamente. Obrigatório se 'Telefone' estiver vazio." },
        { "Campo": "Segmento", "Obrigatório": "Não", "Descrição": "Segmento de atuação (ex: Saúde, Tecnologia, Alimentação)." },
        { "Campo": "Cidade", "Obrigatório": "Não", "Descrição": "Cidade do contato." },
        { "Campo": "Nome da Oportunidade", "Obrigatório": "Não", "Descrição": "Nome do negócio. Se vazio, o sistema gera automaticamente no formato 'Venda - [Empresa]'. Se Empresa também estiver vazia, usa 'Venda - [Nome]'." },
        { "Campo": "Pipeline", "Obrigatório": "Sim **", "Descrição": "Nome do pipeline no CRM. Aceita espaços extras e diferença de maiúsculas/minúsculas. O pipeline deve existir no CRM — não será criado automaticamente." },
        { "Campo": "Estágio Inicial", "Obrigatório": "Não", "Descrição": "Nome do estágio dentro do pipeline informado. Aceita espaços extras e diferença de maiúsculas/minúsculas. Se vazio, será usado o primeiro estágio ativo. Não será criado automaticamente." },
        { "Campo": "Valor Estimado", "Obrigatório": "Não", "Descrição": "Opcional. Valor em reais (R$). Aceita: 1500, 1.500, 1500,00, 1.500,00, R$ 1.500,00. Limite máximo: R$ 99.999.999,99 — valores acima serão rejeitados. NÃO aceita: formato internacional (1,500.00), valores negativos ou texto." },
        { "Campo": "Origem", "Obrigatório": "Não", "Descrição": "Origem do contato/negócio (ex: Site, Indicação, Prospecção Ativa)." },
        { "Campo": "Tags", "Obrigatório": "Não", "Descrição": "Aceita apenas UMA tag por linha. Informe o nome exato de uma tag já cadastrada no CRM. Se a tag informada não existir, o registro será importado sem ela (com alerta). Tags NÃO são criadas automaticamente pela importação." },
        { "Campo": "Observações", "Obrigatório": "Não", "Descrição": "Notas ou observações sobre a oportunidade." },
        { "Campo": "", "Obrigatório": "", "Descrição": "" },
        { "Campo": "REGRAS GERAIS", "Obrigatório": "", "Descrição": "" },
        { "Campo": "* Obrigatório condicional", "Obrigatório": "", "Descrição": "É preciso ter pelo menos Nome ou Empresa, e pelo menos Telefone ou Email." },
        { "Campo": "** Obrigatório no modo Oportunidades", "Obrigatório": "", "Descrição": "Pipeline só é obrigatório se você escolher importar Contatos + Oportunidades." },
        { "Campo": "Modo 'Apenas Contatos'", "Obrigatório": "", "Descrição": "Preencha apenas as colunas de Nome a Cidade. As demais serão ignoradas." },
        { "Campo": "Modo 'Contatos + Oportunidades'", "Obrigatório": "", "Descrição": "Preencha todas as colunas. Pipeline é obrigatório neste modo." },
        { "Campo": "", "Obrigatório": "", "Descrição": "" },
        { "Campo": "NORMALIZAÇÃO AUTOMÁTICA", "Obrigatório": "", "Descrição": "" },
        { "Campo": "Telefone", "Obrigatório": "", "Descrição": "Parênteses, hífens e espaços serão removidos. Apenas os dígitos serão salvos." },
        { "Campo": "Email", "Obrigatório": "", "Descrição": "Será convertido para letras minúsculas. Espaços serão removidos." },
        { "Campo": "Valor Estimado", "Obrigatório": "", "Descrição": "Prefixo R$ será removido. Ponto de milhar será tratado corretamente. O valor será salvo como número decimal. Máximo: R$ 99.999.999,99." },
        { "Campo": "Pipeline / Estágio / Tags", "Obrigatório": "", "Descrição": "Espaços extras serão removidos. Comparação será feita ignorando maiúsculas/minúsculas." },
        { "Campo": "Textos em geral", "Obrigatório": "", "Descrição": "Espaços no início/fim e espaços duplicados no meio serão removidos automaticamente." },
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

      // ── Download 100% Client-Side (Base64 Data URI) ──
      // Essa abordagem previne que o navegador ignore o nome do arquivo usando a URL UUID do Blob
      const base64Data = XLSX.write(wb, { bookType: "xlsx", type: "base64" });
      const mimeType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      const dataUri = `data:${mimeType};base64,${base64Data}`;
      
      const link = document.createElement("a");
      link.href = dataUri;
      link.download = "template_importacao_crm_vitti.xlsx";
      
      // Alguns navegadores exigem que o elemento esteja visível no DOM
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      
      // Limpeza segura sem timeout, pois Data URI não precisa de revokeObjectURL
      document.body.removeChild(link);

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
