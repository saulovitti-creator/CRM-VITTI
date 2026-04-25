import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

interface CreateColumnFormProps {
  columnId?: number | null;
  onSuccess: () => void;
  onCancel: () => void;
}

const PRESET_COLORS = [
  '#3B82F6', // Blue
  '#06B6D4', // Cyan
  '#10B981', // Green
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#6366F1', // Indigo
];

export default function CreateColumnForm({ columnId, onSuccess, onCancel }: CreateColumnFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    color: '#3B82F6',
    description: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: columnData } = trpc.columns.list.useQuery(undefined, {
    select: (columns) => columns.find((c) => c.id === columnId),
  });

  const createMutation = trpc.columns.create.useMutation({
    onSuccess: () => {
      toast.success('Coluna criada com sucesso!');
      onSuccess();
    },
    onError: (error) => {
      toast.error(error.message || 'Erro ao criar coluna');
    },
  });

  const updateMutation = trpc.columns.update.useMutation({
    onSuccess: () => {
      toast.success('Coluna atualizada com sucesso!');
      onSuccess();
    },
    onError: (error) => {
      toast.error(error.message || 'Erro ao atualizar coluna');
    },
  });

  useEffect(() => {
    if (columnData) {
      setFormData({
        name: columnData.name,
        color: columnData.color || '#3B82F6',
        description: '',
      });
    }
  }, [columnData]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Nome é obrigatório';
    } else if (formData.name.length < 2) {
      newErrors.name = 'Nome deve ter pelo menos 2 caracteres';
    } else if (formData.name.length > 50) {
      newErrors.name = 'Nome não pode exceder 50 caracteres';
    }

    if (!formData.color.match(/^#[0-9A-F]{6}$/i)) {
      newErrors.color = 'Cor inválida';
    }

    if (formData.description.length > 200) {
      newErrors.description = 'Descrição não pode exceder 200 caracteres';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    if (columnId) {
      updateMutation.mutate({
        id: columnId,
        name: formData.name,
        color: formData.color,
        description: formData.description || undefined,
      });
    } else {
      createMutation.mutate({
        name: formData.name,
        color: formData.color,
        description: formData.description || undefined,
      });
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent className="max-w-md bg-slate-950 border-slate-800">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-cyan-400">
            {columnId ? 'Editar Coluna' : 'Nova Coluna'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name Field */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Nome *</label>
            <Input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Qualificado"
              className="bg-slate-900 border-slate-700 text-white placeholder-slate-500"
              disabled={isLoading}
            />
            {errors.name && <p className="text-red-400 text-sm mt-1">{errors.name}</p>}
          </div>

          {/* Color Picker */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Cor *</label>
            <div className="space-y-2">
              {/* Preset Colors */}
              <div className="flex gap-2 flex-wrap">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setFormData({ ...formData, color })}
                    className={`w-10 h-10 rounded-lg border-2 transition-all ${
                      formData.color === color ? 'border-white' : 'border-slate-600'
                    }`}
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>

              {/* Custom Color Input */}
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  placeholder="#000000"
                  className="bg-slate-900 border-slate-700 text-white placeholder-slate-500 font-mono"
                  disabled={isLoading}
                />
                <input
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-12 h-10 rounded cursor-pointer"
                  disabled={isLoading}
                />
              </div>

              {errors.color && <p className="text-red-400 text-sm">{errors.color}</p>}
            </div>

            {/* Color Preview */}
            <div className="mt-3 p-4 rounded-lg border border-slate-700 flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-lg border border-slate-600"
                style={{ backgroundColor: formData.color }}
              />
              <div>
                <p className="text-xs text-slate-400">Preview da cor</p>
                <p className="text-sm font-mono text-white">{formData.color}</p>
              </div>
            </div>
          </div>

          {/* Description Field */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Descrição (opcional)
            </label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Ex: Leads que passaram na qualificação inicial"
              className="bg-slate-900 border-slate-700 text-white placeholder-slate-500 resize-none"
              rows={3}
              disabled={isLoading}
            />
            <p className="text-xs text-slate-500 mt-1">
              {formData.description.length}/200 caracteres
            </p>
            {errors.description && (
              <p className="text-red-400 text-sm mt-1">{errors.description}</p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              onClick={onCancel}
              variant="outline"
              className="flex-1 border-slate-700 text-slate-300 hover:bg-slate-900"
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-cyan-600 hover:bg-cyan-700 text-white"
              disabled={isLoading}
            >
              {isLoading ? 'Salvando...' : columnId ? 'Atualizar' : 'Criar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
