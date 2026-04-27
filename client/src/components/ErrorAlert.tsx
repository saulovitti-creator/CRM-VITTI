import React, { useState } from 'react';
import { AlertCircle, X, HelpCircle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export interface ImportError {
  id: string;
  type: 'format' | 'validation' | 'duplicate' | 'unknown';
  title: string;
  message: string;
  suggestion: string;
  details?: string;
  rowNumber?: number;
  field?: string;
}

interface ErrorAlertProps {
  error: ImportError;
  onDismiss: (id: string) => void;
}

const errorTypeConfig: Record<string, { icon: string; color: string; bgColor: string }> = {
  format: {
    icon: '📄',
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/10 border-orange-500/30',
  },
  validation: {
    icon: '⚠️',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10 border-yellow-500/30',
  },
  duplicate: {
    icon: '🔄',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10 border-blue-500/30',
  },
  unknown: {
    icon: '❌',
    color: 'text-red-400',
    bgColor: 'bg-red-500/10 border-red-500/30',
  },
};

export function ErrorAlert({ error, onDismiss }: ErrorAlertProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const config = errorTypeConfig[error.type] || errorTypeConfig.unknown;

  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-lg border ${config.bgColor} animate-in fade-in slide-in-from-top-2 duration-300`}
    >
      {/* Icon */}
      <div className="flex-shrink-0 mt-0.5">
        <span className="text-lg">{config.icon}</span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <h3 className="font-semibold text-white text-sm mb-1">{error.title}</h3>
            <p className="text-gray-300 text-sm mb-2">{error.message}</p>

            {/* Row/Field Info */}
            {(error.rowNumber || error.field) && (
              <div className="text-xs text-gray-400 mb-2 font-mono">
                {error.rowNumber && <span>Linha {error.rowNumber}</span>}
                {error.rowNumber && error.field && <span> • </span>}
                {error.field && <span>Campo: {error.field}</span>}
              </div>
            )}

            {/* Suggestion */}
            <div className="bg-muted/50 rounded p-3 mb-2 border border-border/50">
              <div className="flex items-start gap-2">
                <HelpCircle className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs font-semibold text-primary mb-1">Como resolver:</p>
                  <p className="text-xs text-gray-300 leading-relaxed">{error.suggestion}</p>
                </div>
              </div>
            </div>

            {/* Expandable Details */}
            {error.details && (
              <>
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="text-xs text-blue-400 hover:text-blue-300 transition-colors mb-2"
                >
                  {isExpanded ? '▼ Ocultar' : '▶ Mostrar'} detalhes técnicos
                </button>
                {isExpanded && (
                  <div className="bg-background/80 rounded p-2 mb-2 border border-border/30 font-mono text-xs text-gray-400 overflow-auto max-h-32">
                    {error.details}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Close Button */}
          <button
            onClick={() => onDismiss(error.id)}
            className="flex-shrink-0 text-gray-400 hover:text-white transition-colors p-1 hover:bg-white/10 rounded"
            aria-label="Fechar erro"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

interface ErrorListProps {
  errors: ImportError[];
  onDismiss: (id: string) => void;
}

export function ErrorList({ errors, onDismiss }: ErrorListProps) {
  if (errors.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-3">
        <AlertCircle className="w-5 h-5 text-red-400" />
        <h3 className="font-semibold text-white text-sm">
          {errors.length} erro{errors.length !== 1 ? 's' : ''} encontrado{errors.length !== 1 ? 's' : ''}
        </h3>
      </div>
      {errors.map((error) => (
        <ErrorAlert key={error.id} error={error} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

/**
 * Error message generator with suggestions
 */
export function generateErrorMessage(
  type: string,
  details?: any
): Omit<ImportError, 'id'> {
  const errorMap: Record<string, Omit<ImportError, 'id'>> = {
    INVALID_FORMAT: {
      type: 'format',
      title: 'Formato de arquivo inválido',
      message: 'O arquivo selecionado não é um XLSX válido.',
      suggestion:
        'Certifique-se de que o arquivo tem extensão .xlsx ou .xls e não está corrompido. Tente salvar novamente no Excel.',
      details: 'Erro ao ler arquivo: formato não reconhecido',
    },
    MISSING_REQUIRED_FIELD: {
      type: 'validation',
      title: 'Campo obrigatório ausente',
      message: `O campo "${details?.field || 'desconhecido'}" é obrigatório.`,
      suggestion: `Adicione o campo "${details?.field || 'desconhecido'}" em todas as linhas. Verifique se a coluna existe e tem dados.`,
      rowNumber: details?.row,
      field: details?.field,
      details: `Campo obrigatório não encontrado: ${details?.field}`,
    },
    INVALID_EMAIL: {
      type: 'validation',
      title: 'Email inválido',
      message: `O email "${details?.value || ''}" não é válido.`,
      suggestion:
        'Verifique o formato do email. Deve estar no formato: nome@dominio.com',
      rowNumber: details?.row,
      field: 'email',
      details: `Email inválido: ${details?.value}`,
    },
    INVALID_PHONE: {
      type: 'validation',
      title: 'Telefone inválido',
      message: `O telefone "${details?.value || ''}" não é válido.`,
      suggestion:
        'Use apenas números, parênteses e hífens. Exemplo: (11) 98765-4321 ou 11987654321',
      rowNumber: details?.row,
      field: 'phone',
      details: `Telefone inválido: ${details?.value}`,
    },
    INVALID_CATEGORY: {
      type: 'validation',
      title: 'Segmento inválido',
      message: `O segmento "${details?.value || ''}" não existe.`,
      suggestion:
        'Use um dos segmentos válidos: Clínica, Bar, Restaurante ou Empresa',
      rowNumber: details?.row,
      field: 'segment',
      details: `Segmento inválido: ${details?.value}. Válidos: Clínica, Bar, Restaurante, Empresa`,
    },
    DUPLICATE_PHONE: {
      type: 'duplicate',
      title: 'Telefone duplicado',
      message: `O telefone "${details?.phone || ''}" já existe no banco de dados.`,
      suggestion:
        'Verifique se este prospect já foi importado. Se for um prospect diferente, use um telefone diferente ou corrija o número.',
      rowNumber: details?.row,
      field: 'phone',
      details: `Telefone duplicado: ${details?.phone}`,
    },
    DUPLICATE_EMAIL: {
      type: 'duplicate',
      title: 'Email duplicado',
      message: `O email "${details?.email || ''}" já existe no banco de dados.`,
      suggestion:
        'Verifique se este prospect já foi importado. Se for um prospect diferente, use um email diferente.',
      rowNumber: details?.row,
      field: 'email',
      details: `Email duplicado: ${details?.email}`,
    },
    EMPTY_FILE: {
      type: 'format',
      title: 'Arquivo vazio',
      message: 'O arquivo XLSX não contém dados.',
      suggestion:
        'Certifique-se de que o arquivo tem pelo menos uma linha de dados (além do cabeçalho).',
      details: 'Arquivo sem linhas de dados',
    },
    MISSING_HEADER: {
      type: 'format',
      title: 'Cabeçalho inválido',
      message: 'O arquivo não tem as colunas obrigatórias.',
      suggestion:
        'Verifique se o arquivo tem as colunas: Empresa, Telefone, Segmento. Use o template fornecido como referência.',
      details: 'Colunas obrigatórias não encontradas',
    },
    UNKNOWN_ERROR: {
      type: 'unknown',
      title: 'Erro ao processar arquivo',
      message: details?.message || 'Ocorreu um erro desconhecido durante o processamento.',
      suggestion:
        'Tente novamente. Se o problema persistir, verifique se o arquivo está corrompido ou tente com um arquivo diferente.',
      details: details?.message,
    },
  };

  return (
    errorMap[type] || {
      type: 'unknown',
      title: 'Erro desconhecido',
      message: 'Ocorreu um erro ao processar o arquivo.',
      suggestion: 'Tente novamente ou entre em contato com o suporte.',
    }
  );
}
