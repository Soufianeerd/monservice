'use client';

import { useState, useEffect, useMemo, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthContext';
import { useWorkspace } from '@/hooks/useWorkspace';
import Link from 'next/link';
import { Card, CardBody } from '@/components/ui/Card';
import {
  ArrowLeft,
  Plus,
  Trash2,
  FolderPlus,
  Layers,
  Save,
  Send,
  Calculator,
  Building,
  MapPin,
  TrendingUp,
  Percent,
} from 'lucide-react';
import * as clientActions from '@/app/actions/client.actions';
import * as dealActions from '@/app/actions/deal.actions';
import { listFieldServiceSitesAction } from '@/app/actions/field-service-operations.actions';
import { createQuoteAction } from '@/app/actions/quote.actions';
import { calculateDocumentTotals } from '@/lib/services/billing-calculator';
import type { Client, Deal, InvoiceLineType, InvoiceUnitCode } from '@/lib/data/interfaces';

interface SectionDraft {
  id: string;
  kind: 'lot' | 'tranche' | 'section' | 'option' | 'variant';
  title: string;
  description?: string;
  position: number;
  isOptional: boolean;
  isSelected: boolean;
}

interface LineDraft {
  id: string;
  sectionId?: string;
  lineType: InvoiceLineType;
  description: string;
  quantity: number;
  unitCode: InvoiceUnitCode;
  unitCost?: number;
  unitPrice: number;
  discountRate: number;
  taxRate: number;
}

const VAT_PRESETS = [0, 5.5, 10, 20];
const UNIT_OPTIONS: { value: InvoiceUnitCode; label: string }[] = [
  { value: 'unit', label: 'u (Unité)' },
  { value: 'hour', label: 'h (Heure)' },
  { value: 'day', label: 'j (Jour)' },
  { value: 'meter', label: 'm (Mètre)' },
  { value: 'linear_meter', label: 'ml (Mètre linéaire)' },
  { value: 'square_meter', label: 'm² (Mètre carré)' },
  { value: 'cubic_meter', label: 'm³ (Mètre cube)' },
  { value: 'kilogram', label: 'kg (Kilogramme)' },
  { value: 'liter', label: 'L (Litre)' },
  { value: 'package', label: 'forfait (Forfait)' },
  { value: 'fixed_price', label: 'ens. (Ensemble)' },
];

const LINE_TYPE_OPTIONS: { value: InvoiceLineType; label: string }[] = [
  { value: 'service', label: 'Prestation' },
  { value: 'labor', label: 'Main-d’œuvre' },
  { value: 'material', label: 'Fournitures / Matériaux' },
  { value: 'equipment', label: 'Location matériel' },
  { value: 'travel', label: 'Déplacement' },
  { value: 'subcontracting', label: 'Sous-traitance' },
  { value: 'other', label: 'Autre' },
];

export default function NewQuotePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const workspace = useWorkspace();

  const isFieldService = workspace?.type === 'field_service';

  // Zero Re-Entry initial query params
  const paramDealId = searchParams.get('dealId') || '';
  const paramClientId = searchParams.get('clientId') || '';

  // Form Header State
  const [clientId, setClientId] = useState(paramClientId);
  const [siteId, setSiteId] = useState('');
  const [dealId, setDealId] = useState(paramDealId);
  const [title, setTitle] = useState('');
  const [validUntil, setValidUntil] = useState(() =>
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );

  // Deposit State
  const [depositMode, setDepositMode] = useState<'none' | 'percentage' | 'fixed'>('none');
  const [depositRate, setDepositRate] = useState<number>(30);
  const [depositFixedAmount, setDepositFixedAmount] = useState<number>(0);

  // Advanced mode toggle
  const [advancedMode, setAdvancedMode] = useState(isFieldService);

  // Data Selectors
  const [clients, setClients] = useState<Client[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [sites, setSites] = useState<any[]>([]);

  // Sections & Lines State
  const [sections, setSections] = useState<SectionDraft[]>([]);
  const [lines, setLines] = useState<LineDraft[]>([
    {
      id: 'initial-line-1',
      lineType: 'service',
      description: 'Prestation initiale',
      quantity: 1,
      unitCode: 'unit',
      unitPrice: 0,
      discountRate: 0,
      taxRate: 20,
    },
  ]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load clients and deals
  useEffect(() => {
    if (!user?.organizationId) return;

    clientActions.findAllAction(user.organizationId).then((cls) => {
      setClients(cls);
    });

    dealActions.findAllAction(user.organizationId).then((dls) => {
      setDeals(dls);
      if (paramDealId) {
        const found = dls.find((d) => d.id === paramDealId);
        if (found) {
          setTitle(found.name);
          if (found.clientId && !clientId) {
            setClientId(found.clientId);
          }
        }
      }
    });
  }, [user, paramDealId]);

  // Load sites when client changes
  useEffect(() => {
    if (!user?.organizationId || !clientId) {
      setSites([]);
      return;
    }

    listFieldServiceSitesAction({ clientId, isActive: true })
      .then((res) => {
        setSites(res || []);
        if (res && res.length === 1) {
          setSiteId(res[0].id);
        }
      })
      .catch(() => {
        setSites([]);
      });
  }, [user, clientId]);

  // Pure calculations preview
  const totals = useMemo(() => {
    return calculateDocumentTotals(
      lines.map((l) => ({
        description: l.description,
        quantity: Number(l.quantity) || 0,
        unitPrice: Number(l.unitPrice) || 0,
        discountRate: Number(l.discountRate) || 0,
        taxRate: Number(l.taxRate) || 0,
        isSelected: true,
      }))
    );
  }, [lines]);

  const calculatedDepositAmount = useMemo(() => {
    if (depositMode === 'percentage') {
      return Math.round(totals.totalTTC * (depositRate / 100) * 100) / 100;
    }
    if (depositMode === 'fixed') {
      return Math.min(depositFixedAmount, totals.totalTTC);
    }
    return 0;
  }, [depositMode, depositRate, depositFixedAmount, totals.totalTTC]);

  // Section handlers
  const addSection = (kind: SectionDraft['kind']) => {
    const newSection: SectionDraft = {
      id: `sec-${Date.now()}`,
      kind,
      title: kind === 'lot' ? `Lot ${sections.length + 1}` : kind === 'option' ? `Option ${sections.length + 1}` : `Section ${sections.length + 1}`,
      position: sections.length,
      isOptional: kind === 'option' || kind === 'variant',
      isSelected: true,
    };
    setSections([...sections, newSection]);
  };

  const removeSection = (sectionId: string) => {
    setSections(sections.filter((s) => s.id !== sectionId));
    setLines(lines.filter((l) => l.sectionId !== sectionId));
  };

  // Line handlers
  const addLine = (sectionId?: string) => {
    const newLine: LineDraft = {
      id: `line-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      sectionId,
      lineType: 'service',
      description: '',
      quantity: 1,
      unitCode: 'unit',
      unitPrice: 0,
      discountRate: 0,
      taxRate: 20,
    };
    setLines([...lines, newLine]);
  };

  const updateLine = (lineId: string, updates: Partial<LineDraft>) => {
    setLines(lines.map((l) => (l.id === lineId ? { ...l, ...updates } : l)));
  };

  const removeLine = (lineId: string) => {
    if (lines.length <= 1) {
      alert('Un devis doit contenir au moins une ligne.');
      return;
    }
    setLines(lines.filter((l) => l.id !== lineId));
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) {
      setError('Veuillez sélectionner un client.');
      return;
    }
    if (lines.length === 0) {
      setError('Veuillez ajouter au moins une ligne.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = {
        clientId,
        siteId: siteId || undefined,
        dealId: dealId || undefined,
        title: title || undefined,
        validUntil: validUntil || undefined,
        depositMode,
        depositRate: depositMode === 'percentage' ? depositRate : undefined,
        depositFixedAmount: depositMode === 'fixed' ? depositFixedAmount : undefined,
        sections: sections.map((s, idx) => ({
          kind: s.kind,
          title: s.title,
          description: s.description,
          position: idx,
          isOptional: s.isOptional,
          isSelected: s.isSelected,
        })),
        lines: lines.map((l, idx) => ({
          sectionIndex: l.sectionId ? sections.findIndex((s) => s.id === l.sectionId) : undefined,
          lineType: l.lineType,
          description: l.description.trim() || 'Ligne de prestation',
          quantity: Number(l.quantity) || 1,
          unitCode: l.unitCode,
          unitCost: l.unitCost ? Number(l.unitCost) : undefined,
          unitPrice: Number(l.unitPrice) || 0,
          discountRate: Number(l.discountRate) || 0,
          taxRate: Number(l.taxRate) || 20,
          position: idx,
        })),
      };

      const createdQuote = await createQuoteAction(payload);
      router.push(`/facturation/devis/${createdQuote.id}`);
    } catch (err: unknown) {
      console.error('Erreur création devis:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de la création du devis');
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-5xl mx-auto py-6 px-4 sm:px-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-200 pb-4">
        <div>
          <Link
            href="/facturation/devis"
            className="text-sm font-medium text-blue-600 hover:text-blue-800 mb-1 inline-flex items-center"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Retour aux devis
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Nouveau Devis Professionnel</h1>
          <p className="text-sm text-gray-500">
            Chiffrage précis avec métrés, multi-TVA et options
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center space-x-2 text-sm text-gray-700 bg-gray-50 px-3 py-1.5 rounded-md border border-gray-200 cursor-pointer">
            <input
              type="checkbox"
              checked={advancedMode}
              onChange={(e) => setAdvancedMode(e.target.checked)}
              className="rounded text-blue-600 focus:ring-blue-500"
            />
            <span className="font-medium">Mode Avancé BTP / Chantier</span>
          </label>

          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none disabled:opacity-50"
          >
            <Save className="w-4 h-4 mr-2" />
            {loading ? 'Création...' : 'Créer le devis'}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
          {error}
        </div>
      )}

      {/* Main Header Card */}
      <Card>
        <CardBody className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {/* Client Selection */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Client <span className="text-red-500">*</span>
              </label>
              <select
                value={clientId}
                onChange={(e) => {
                  setClientId(e.target.value);
                  setSiteId('');
                }}
                required
                className="w-full rounded-md border border-gray-300 py-2 px-3 text-sm focus:border-blue-500 focus:outline-none"
              >
                <option value="">Sélectionner un client...</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.company ? `(${c.company})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Site / Chantier (Field service & advanced mode) */}
            {advancedMode && (
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Site / Chantier
                </label>
                <select
                  value={siteId}
                  onChange={(e) => setSiteId(e.target.value)}
                  disabled={!clientId || sites.length === 0}
                  className="w-full rounded-md border border-gray-300 py-2 px-3 text-sm focus:border-blue-500 focus:outline-none disabled:bg-gray-100"
                >
                  <option value="">
                    {!clientId
                      ? 'Sélectionnez d’abord un client'
                      : sites.length === 0
                      ? 'Aucun site enregistré'
                      : 'Sélectionner un site...'}
                  </option>
                  {sites.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label || s.name} - {s.city}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Deal / Opportunité */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Deal / Opportunité CRM
              </label>
              <select
                value={dealId}
                onChange={(e) => setDealId(e.target.value)}
                className="w-full rounded-md border border-gray-300 py-2 px-3 text-sm focus:border-blue-500 focus:outline-none"
              >
                <option value="">Aucun deal associé</option>
                {deals.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(d.value)})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-gray-100">
            {/* Project Title */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Titre du projet / Objet du devis
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="ex. Rénovation salle de bain, Installation pompe à chaleur..."
                className="w-full rounded-md border border-gray-300 py-2 px-3 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>

            {/* Valid Until */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Date de fin de validité
              </label>
              <input
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                className="w-full rounded-md border border-gray-300 py-2 px-3 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Sections and Lots Management Toolbar */}
      {advancedMode && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider mr-2">
            Ajouter un groupe :
          </span>
          <button
            type="button"
            onClick={() => addSection('lot')}
            className="inline-flex items-center px-3 py-1.5 border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-md text-xs font-medium"
          >
            <FolderPlus className="w-3.5 h-3.5 mr-1" />
            + Lot de travaux
          </button>
          <button
            type="button"
            onClick={() => addSection('tranche')}
            className="inline-flex items-center px-3 py-1.5 border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-md text-xs font-medium"
          >
            <Layers className="w-3.5 h-3.5 mr-1" />
            + Tranche
          </button>
          <button
            type="button"
            onClick={() => addSection('option')}
            className="inline-flex items-center px-3 py-1.5 border border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-md text-xs font-medium"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            + Option / Variante
          </button>
        </div>
      )}

      {/* Sections & Lines Editor */}
      <div className="space-y-6">
        {sections.length > 0 ? (
          sections.map((section) => {
            const secLines = lines.filter((l) => l.sectionId === section.id);
            return (
              <Card key={section.id} className="border-l-4 border-l-indigo-500 overflow-hidden">
                <div className="bg-indigo-50/60 p-4 border-b border-indigo-100 flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                  <div className="flex items-center space-x-3">
                    <span className="px-2 py-0.5 rounded text-xs font-bold uppercase bg-indigo-200 text-indigo-800">
                      {section.kind}
                    </span>
                    <input
                      type="text"
                      value={section.title}
                      onChange={(e) =>
                        setSections(
                          sections.map((s) =>
                            s.id === section.id ? { ...s, title: e.target.value } : s
                          )
                        )
                      }
                      className="font-semibold text-gray-900 bg-transparent border-b border-dashed border-indigo-400 focus:outline-none focus:border-indigo-600 px-1 py-0.5"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => addLine(section.id)}
                      className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded text-indigo-700 bg-white border border-indigo-300 hover:bg-indigo-50"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      Ajouter une ligne
                    </button>
                    <button
                      type="button"
                      onClick={() => removeSection(section.id)}
                      className="p-1 text-gray-400 hover:text-red-600 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <CardBody className="p-4 space-y-3">
                  {secLines.length === 0 ? (
                    <div className="text-center py-4 text-xs text-gray-400 italic">
                      Aucune ligne dans ce lot. Cliquez sur "Ajouter une ligne".
                    </div>
                  ) : (
                    secLines.map((line) => (
                      <LineRow
                        key={line.id}
                        line={line}
                        advancedMode={advancedMode}
                        onUpdate={(updates) => updateLine(line.id, updates)}
                        onDelete={() => removeLine(line.id)}
                      />
                    ))
                  )}
                </CardBody>
              </Card>
            );
          })
        ) : (
          <Card>
            <CardBody className="p-4 space-y-3">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-semibold text-gray-800 text-sm">Lignes du devis</h3>
                <button
                  type="button"
                  onClick={() => addLine()}
                  className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded text-blue-700 bg-blue-50 hover:bg-blue-100"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Ajouter une ligne
                </button>
              </div>

              {lines.map((line) => (
                <LineRow
                  key={line.id}
                  line={line}
                  advancedMode={advancedMode}
                  onUpdate={(updates) => updateLine(line.id, updates)}
                  onDelete={() => removeLine(line.id)}
                />
              ))}
            </CardBody>
          </Card>
        )}

        {sections.length > 0 && (
          <div className="flex justify-start">
            <button
              type="button"
              onClick={() => addLine()}
              className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded text-gray-700 bg-gray-100 hover:bg-gray-200"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Ajouter une ligne hors lot
            </button>
          </div>
        )}
      </div>

      {/* Deposit Settings & Totals Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-200">
        {/* Deposit Configuration */}
        <Card>
          <CardBody className="p-5 space-y-3">
            <h3 className="font-semibold text-gray-900 text-sm flex items-center">
              <Percent className="w-4 h-4 mr-1.5 text-amber-600" />
              Exigence d'acompte à la commande
            </h3>

            <div className="flex items-center space-x-4 text-sm">
              <label className="flex items-center space-x-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="depositMode"
                  value="none"
                  checked={depositMode === 'none'}
                  onChange={() => setDepositMode('none')}
                  className="text-blue-600"
                />
                <span>Aucun acompte</span>
              </label>

              <label className="flex items-center space-x-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="depositMode"
                  value="percentage"
                  checked={depositMode === 'percentage'}
                  onChange={() => setDepositMode('percentage')}
                  className="text-blue-600"
                />
                <span>Pourcentage</span>
              </label>

              <label className="flex items-center space-x-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="depositMode"
                  value="fixed"
                  checked={depositMode === 'fixed'}
                  onChange={() => setDepositMode('fixed')}
                  className="text-blue-600"
                />
                <span>Montant fixe</span>
              </label>
            </div>

            {depositMode === 'percentage' && (
              <div className="pt-2 flex items-center space-x-3">
                <label className="text-xs text-gray-600">Taux (%) :</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={depositRate}
                  onChange={(e) => setDepositRate(Number(e.target.value) || 0)}
                  className="w-20 rounded border border-gray-300 px-2 py-1 text-sm text-right"
                />
                <span className="text-xs text-gray-500 font-medium">
                  = {calculatedDepositAmount.toFixed(2)} € TTC
                </span>
              </div>
            )}

            {depositMode === 'fixed' && (
              <div className="pt-2 flex items-center space-x-3">
                <label className="text-xs text-gray-600">Montant fixe (€ TTC) :</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={depositFixedAmount}
                  onChange={(e) => setDepositFixedAmount(Number(e.target.value) || 0)}
                  className="w-28 rounded border border-gray-300 px-2 py-1 text-sm text-right"
                />
              </div>
            )}
          </CardBody>
        </Card>

        {/* Totals & VAT Breakdown */}
        <Card>
          <CardBody className="p-5 space-y-3">
            <h3 className="font-semibold text-gray-900 text-sm flex items-center">
              <Calculator className="w-4 h-4 mr-1.5 text-blue-600" />
              Récapitulatif Financier
            </h3>

            {/* Multi-TVA summary table */}
            <div className="bg-gray-50 p-2.5 rounded text-xs space-y-1">
              <p className="font-semibold text-gray-600 mb-1">Ventilation TVA déterministe</p>
              {totals.taxGroups.map((g, idx) => (
                <div key={idx} className="flex justify-between text-gray-600">
                  <span>Base {g.rate}% ({g.baseHT.toFixed(2)} €)</span>
                  <span>{g.taxAmount.toFixed(2)} €</span>
                </div>
              ))}
            </div>

            <div className="space-y-1.5 text-sm pt-2">
              <div className="flex justify-between text-gray-600">
                <span>Total brut HT :</span>
                <span className="font-medium text-gray-900">{totals.grossHT.toFixed(2)} €</span>
              </div>
              {totals.discountAmount > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>Remises :</span>
                  <span className="font-medium">-{totals.discountAmount.toFixed(2)} €</span>
                </div>
              )}
              <div className="flex justify-between text-gray-600">
                <span>Total net HT :</span>
                <span className="font-medium text-gray-900">{totals.totalHT.toFixed(2)} €</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Total TVA :</span>
                <span className="font-medium text-gray-900">{totals.taxAmount.toFixed(2)} €</span>
              </div>
              <div className="flex justify-between text-base font-bold text-gray-900 border-t border-gray-200 pt-2">
                <span>TOTAL TTC :</span>
                <span className="text-blue-600">{totals.totalTTC.toFixed(2)} €</span>
              </div>
              {depositMode !== 'none' && calculatedDepositAmount > 0 && (
                <div className="flex justify-between text-xs font-semibold text-amber-700 bg-amber-50 p-1.5 rounded mt-2">
                  <span>Acompte demandé :</span>
                  <span>{calculatedDepositAmount.toFixed(2)} € TTC</span>
                </div>
              )}
            </div>
          </CardBody>
        </Card>
      </div>
    </form>
  );
}

// Line Row Component (responsive cards on mobile, inline controls on desktop)
function LineRow({
  line,
  advancedMode,
  onUpdate,
  onDelete,
}: {
  line: LineDraft;
  advancedMode: boolean;
  onUpdate: (updates: Partial<LineDraft>) => void;
  onDelete: () => void;
}) {
  const gross = line.quantity * line.unitPrice;
  const net = gross * (1 - (line.discountRate || 0) / 100);
  const cost = typeof line.unitCost === 'number' ? line.quantity * line.unitCost : null;
  const margin = cost !== null ? net - cost : null;

  return (
    <div className="border border-gray-200 rounded-lg p-3 bg-white hover:border-gray-300 space-y-3">
      {/* Top description and type */}
      <div className="flex flex-col sm:flex-row gap-2">
        {advancedMode && (
          <select
            value={line.lineType}
            onChange={(e) => onUpdate({ lineType: e.target.value as InvoiceLineType })}
            className="sm:w-40 rounded border border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-700 bg-gray-50"
          >
            {LINE_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        )}

        <input
          type="text"
          value={line.description}
          onChange={(e) => onUpdate({ description: e.target.value })}
          placeholder="Désignation des travaux ou fournitures..."
          required
          className="flex-1 rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
        />

        <button
          type="button"
          onClick={onDelete}
          className="self-end sm:self-center p-1.5 text-gray-400 hover:text-red-600 rounded"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Numbers row (Métrés, Price, Discount, VAT, Margin) */}
      <div className="grid grid-cols-2 sm:grid-cols-6 lg:grid-cols-7 gap-2 items-center text-xs">
        <div>
          <label className="block text-[10px] text-gray-500 uppercase">Qté</label>
          <input
            type="number"
            step="0.001"
            min="0.001"
            value={line.quantity}
            onChange={(e) => onUpdate({ quantity: Number(e.target.value) || 0 })}
            className="w-full rounded border border-gray-300 px-2 py-1 text-right"
          />
        </div>

        <div>
          <label className="block text-[10px] text-gray-500 uppercase">Unité</label>
          <select
            value={line.unitCode}
            onChange={(e) => onUpdate({ unitCode: e.target.value as InvoiceUnitCode })}
            className="w-full rounded border border-gray-300 px-1 py-1"
          >
            {UNIT_OPTIONS.map((u) => (
              <option key={u.value} value={u.value}>
                {u.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] text-gray-500 uppercase">Prix Vente HT</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={line.unitPrice}
            onChange={(e) => onUpdate({ unitPrice: Number(e.target.value) || 0 })}
            className="w-full rounded border border-gray-300 px-2 py-1 text-right font-medium"
          />
        </div>

        {advancedMode && (
          <div>
            <label className="block text-[10px] text-gray-500 uppercase">Prix Achat HT</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={line.unitCost ?? ''}
              onChange={(e) =>
                onUpdate({
                  unitCost: e.target.value ? Number(e.target.value) : undefined,
                })
              }
              placeholder="optionnel"
              className="w-full rounded border border-gray-300 px-2 py-1 text-right bg-blue-50/30"
            />
          </div>
        )}

        <div>
          <label className="block text-[10px] text-gray-500 uppercase">Remise (%)</label>
          <input
            type="number"
            step="0.1"
            min="0"
            max="100"
            value={line.discountRate}
            onChange={(e) => onUpdate({ discountRate: Number(e.target.value) || 0 })}
            className="w-full rounded border border-gray-300 px-2 py-1 text-right"
          />
        </div>

        <div>
          <label className="block text-[10px] text-gray-500 uppercase">TVA (%)</label>
          <select
            value={line.taxRate}
            onChange={(e) => onUpdate({ taxRate: Number(e.target.value) || 0 })}
            className="w-full rounded border border-gray-300 px-1 py-1"
          >
            {VAT_PRESETS.map((p) => (
              <option key={p} value={p}>
                {p}%
              </option>
            ))}
          </select>
        </div>

        <div className="col-span-2 sm:col-span-1 text-right">
          <span className="block text-[10px] text-gray-500 uppercase">Total Net HT</span>
          <span className="font-semibold text-gray-900 text-sm">{net.toFixed(2)} €</span>
          {advancedMode && margin !== null && (
            <span className="block text-[10px] font-medium text-emerald-600">
              Marge: +{margin.toFixed(2)} €
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
