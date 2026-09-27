import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import type { Invoice, Organization } from '@/lib/data/interfaces';
import { legalService } from '@/lib/services/legal.service';
import { calculateDocumentTotals } from '@/lib/services/billing-calculator';

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 9, fontFamily: 'Helvetica', color: '#1f2937' },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16, borderBottomWidth: 1, borderBottomColor: '#e5e7eb', pb: 12 },
  companyTitle: { fontSize: 16, fontWeight: 'bold', color: '#111827' },
  docTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e40af', textAlign: 'right' },
  docSubtitle: { fontSize: 9, color: '#4b5563', textAlign: 'right', marginTop: 2 },
  sectionBlock: { marginBottom: 12 },
  partyBlock: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  partyCard: { width: '48%', backgroundColor: '#f9fafb', padding: 8, borderRadius: 4, borderWidth: 1, borderColor: '#e5e7eb' },
  partyHeading: { fontSize: 8, fontWeight: 'bold', textTransform: 'uppercase', color: '#6b7280', marginBottom: 4 },
  partyName: { fontSize: 11, fontWeight: 'bold', color: '#111827' },
  partyText: { fontSize: 9, color: '#4b5563', marginTop: 1 },
  sectionHeader: { backgroundColor: '#e0e7ff', padding: 6, marginVertical: 4, borderRadius: 2, flexDirection: 'row', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 10, fontWeight: 'bold', color: '#1e3a8a' },
  table: { marginVertical: 6 },
  tableHeader: { backgroundColor: '#f3f4f6', flexDirection: 'row', padding: 6, borderBottomWidth: 1, borderBottomColor: '#d1d5db', fontWeight: 'bold', fontSize: 8, color: '#374151' },
  tableRow: { flexDirection: 'row', padding: 5, borderBottomWidth: 0.5, borderBottomColor: '#e5e7eb' },
  colDesc: { flex: 4 },
  colQty: { flex: 1.2, textAlign: 'right' },
  colPrice: { flex: 1.5, textAlign: 'right' },
  colDisc: { flex: 1, textAlign: 'right' },
  colTax: { flex: 1, textAlign: 'right' },
  colTotal: { flex: 1.5, textAlign: 'right' },
  totalsContainer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, borderTopWidth: 1, borderTopColor: '#e5e7eb', paddingTop: 8 },
  taxSummaryTable: { width: '48%' },
  grandTotals: { width: '45%' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
  totalLabel: { fontSize: 9, color: '#4b5563' },
  totalVal: { fontSize: 9, color: '#111827', fontWeight: 'bold' },
  ttcRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, borderTopWidth: 1, borderTopColor: '#1e40af', marginTop: 4 },
  depositBox: { marginTop: 10, padding: 8, backgroundColor: '#eff6ff', borderRadius: 4, borderWidth: 1, borderColor: '#bfdbfe' },
  signatureSection: { marginTop: 16, borderTopWidth: 1, borderTopColor: '#e5e7eb', paddingTop: 8 },
  signatureImage: { width: 180, height: 70, marginTop: 4, borderWidth: 0.5, borderColor: '#d1d5db', borderRadius: 2 },
  footer: { marginTop: 24, fontSize: 7, color: '#9ca3af', textAlign: 'center', borderTopWidth: 0.5, borderTopColor: '#e5e7eb', paddingTop: 8 },
});

const UNIT_LABELS: Record<string, string> = {
  unit: 'u',
  hour: 'h',
  day: 'j',
  meter: 'm',
  linear_meter: 'ml',
  square_meter: 'm²',
  cubic_meter: 'm³',
  kilogram: 'kg',
  liter: 'L',
  package: 'forfait',
  fixed_price: 'ens.',
};

import type { ClientQuoteDTO } from '@/lib/data/dto/client-billing.dto';

export interface QuotePDFProps {
  quote: Invoice | ClientQuoteDTO;
  organization: Organization;
  client: {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    zipCode?: string;
    country?: string;
  };
  site?: {
    name?: string;
    address?: string;
    city?: string;
    zipCode?: string;
  };
}

export async function QuotePDF({ quote, organization, client, site }: QuotePDFProps) {
  const mentions = await legalService.getQuoteMentions(
    organization.country || 'FR',
    'fr'
  );

  // Re-calculate pure totals to ensure exact multi-VAT grouping
  const totals = calculateDocumentTotals(
    (quote.lines || []).map((l) => ({
      description: l.description,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      discountRate: l.discountRate || 0,
      taxRate: l.taxRate,
      isSelected: true,
    }))
  );

  const sections = quote.sections || [];
  const lines = quote.lines || [];

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.companyTitle}>{organization.name}</Text>
            {organization.address && <Text style={styles.partyText}>{organization.address}</Text>}
            <Text style={styles.partyText}>
              {[organization.zipCode, organization.city].filter(Boolean).join(' ')}
            </Text>
            {organization.country && <Text style={styles.partyText}>{organization.country}</Text>}
            {organization.email && <Text style={styles.partyText}>Email : {organization.email}</Text>}
            {organization.phone && <Text style={styles.partyText}>Tél : {organization.phone}</Text>}
            {organization.taxId && <Text style={styles.partyText}>N° TVA : {organization.taxId}</Text>}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.docTitle}>DEVIS</Text>
            <Text style={styles.docSubtitle}>N° {quote.number}</Text>
            <Text style={styles.docSubtitle}>
              Date : {new Date(quote.createdAt || quote.date).toLocaleDateString('fr-FR')}
            </Text>
            {quote.validUntil && (
              <Text style={styles.docSubtitle}>
                Valable jusqu'au : {new Date(quote.validUntil).toLocaleDateString('fr-FR')}
              </Text>
            )}
            {quote.revisionNumber && quote.revisionNumber > 1 && (
              <Text style={styles.docSubtitle}>Révision N° {quote.revisionNumber}</Text>
            )}
          </View>
        </View>

        {/* Project Title */}
        {quote.title && (
          <View style={{ marginBottom: 10 }}>
            <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#1e40af' }}>
              Projet : {quote.title}
            </Text>
          </View>
        )}

        {/* Parties */}
        <View style={styles.partyBlock}>
          <View style={styles.partyCard}>
            <Text style={styles.partyHeading}>Client</Text>
            <Text style={styles.partyName}>{client.name}</Text>
            {client.address && <Text style={styles.partyText}>{client.address}</Text>}
            <Text style={styles.partyText}>
              {[client.zipCode, client.city].filter(Boolean).join(' ')}
            </Text>
            {client.email && <Text style={styles.partyText}>{client.email}</Text>}
            {client.phone && <Text style={styles.partyText}>{client.phone}</Text>}
          </View>

          {site ? (
            <View style={styles.partyCard}>
              <Text style={styles.partyHeading}>Lieu d'intervention / Chantier</Text>
              <Text style={styles.partyName}>{site.name || 'Site'}</Text>
              {site.address && <Text style={styles.partyText}>{site.address}</Text>}
              <Text style={styles.partyText}>
                {[site.zipCode, site.city].filter(Boolean).join(' ')}
              </Text>
            </View>
          ) : (
            <View style={styles.partyCard}>
              <Text style={styles.partyHeading}>Conditions</Text>
              <Text style={styles.partyText}>Délai de validité : 30 jours</Text>
              <Text style={styles.partyText}>Règlement selon échéancier convenu</Text>
            </View>
          )}
        </View>

        {/* Lines Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.colDesc}>Désignation</Text>
            <Text style={styles.colQty}>Qté / Unité</Text>
            <Text style={styles.colPrice}>P.U. HT</Text>
            <Text style={styles.colDisc}>Rem.</Text>
            <Text style={styles.colTax}>TVA</Text>
            <Text style={styles.colTotal}>Total HT</Text>
          </View>

          {/* Group by section if present */}
          {sections.length > 0 ? (
            sections
              .filter((s) => s.isSelected)
              .map((section) => {
                const sectionLines = lines.filter((l) => l.sectionId === section.id);
                const sectionKindLabel =
                  section.kind === 'lot' ? 'Lot' : section.kind === 'tranche' ? 'Tranche' : 'Section';

                return (
                  <View key={section.id}>
                    <View style={styles.sectionHeader}>
                      <Text style={styles.sectionTitle}>
                        {sectionKindLabel} : {section.title}
                      </Text>
                      {section.isOptional && (
                        <Text style={{ fontSize: 8, color: '#4338ca' }}>(Option retenue)</Text>
                      )}
                    </View>
                    {sectionLines.map((line, idx) => {
                      const discount = line.discountRate || 0;
                      const gross = line.quantity * line.unitPrice;
                      const net = gross * (1 - discount / 100);
                      const unitStr = UNIT_LABELS[line.unitCode || 'unit'] || line.unitCode || 'u';

                      return (
                        <View key={idx} style={styles.tableRow}>
                          <Text style={styles.colDesc}>{line.description}</Text>
                          <Text style={styles.colQty}>
                            {line.quantity} {unitStr}
                          </Text>
                          <Text style={styles.colPrice}>{line.unitPrice.toFixed(2)} €</Text>
                          <Text style={styles.colDisc}>
                            {discount > 0 ? `${discount}%` : '-'}
                          </Text>
                          <Text style={styles.colTax}>{line.taxRate}%</Text>
                          <Text style={styles.colTotal}>{net.toFixed(2)} €</Text>
                        </View>
                      );
                    })}
                  </View>
                );
              })
          ) : (
            lines.map((line, idx) => {
              const discount = line.discountRate || 0;
              const gross = line.quantity * line.unitPrice;
              const net = gross * (1 - discount / 100);
              const unitStr = UNIT_LABELS[line.unitCode || 'unit'] || line.unitCode || 'u';

              return (
                <View key={idx} style={styles.tableRow}>
                  <Text style={styles.colDesc}>{line.description}</Text>
                  <Text style={styles.colQty}>
                    {line.quantity} {unitStr}
                  </Text>
                  <Text style={styles.colPrice}>{line.unitPrice.toFixed(2)} €</Text>
                  <Text style={styles.colDisc}>{discount > 0 ? `${discount}%` : '-'}</Text>
                  <Text style={styles.colTax}>{line.taxRate}%</Text>
                  <Text style={styles.colTotal}>{net.toFixed(2)} €</Text>
                </View>
              );
            })
          )}
        </View>

        {/* Totals & VAT Breakdown */}
        <View style={styles.totalsContainer}>
          {/* Multi-TVA summary */}
          <View style={styles.taxSummaryTable}>
            <Text style={{ fontSize: 8, fontWeight: 'bold', color: '#6b7280', marginBottom: 4 }}>
              VENTILATION DE LA TVA
            </Text>
            <View style={[styles.tableHeader, { backgroundColor: '#f9fafb' }]}>
              <Text style={{ flex: 1 }}>Taux</Text>
              <Text style={{ flex: 1.5, textAlign: 'right' }}>Base HT</Text>
              <Text style={{ flex: 1.5, textAlign: 'right' }}>Montant TVA</Text>
            </View>
            {totals.taxGroups.map((group, gIdx) => (
              <View key={gIdx} style={styles.tableRow}>
                <Text style={{ flex: 1 }}>{group.rate}%</Text>
                <Text style={{ flex: 1.5, textAlign: 'right' }}>{group.baseHT.toFixed(2)} €</Text>
                <Text style={{ flex: 1.5, textAlign: 'right' }}>{group.taxAmount.toFixed(2)} €</Text>
              </View>
            ))}
          </View>

          {/* Grand totals */}
          <View style={styles.grandTotals}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total brut HT :</Text>
              <Text style={styles.totalVal}>{totals.grossHT.toFixed(2)} €</Text>
            </View>
            {totals.discountAmount > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Remises globales :</Text>
                <Text style={[styles.totalVal, { color: '#b91c1c' }]}>
                  -{totals.discountAmount.toFixed(2)} €
                </Text>
              </View>
            )}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total net HT :</Text>
              <Text style={styles.totalVal}>{totals.totalHT.toFixed(2)} €</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total TVA :</Text>
              <Text style={styles.totalVal}>{totals.taxAmount.toFixed(2)} €</Text>
            </View>
            <View style={styles.ttcRow}>
              <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#1e40af' }}>
                TOTAL TTC :
              </Text>
              <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#1e40af' }}>
                {totals.totalTTC.toFixed(2)} €
              </Text>
            </View>

            {/* Deposit Box */}
            {quote.depositMode && quote.depositMode !== 'none' && (quote.depositAmount || 0) > 0 && (
              <View style={styles.depositBox}>
                <Text style={{ fontSize: 8, fontWeight: 'bold', color: '#1e40af' }}>
                  ACOMPTE EXIGÉ À LA SIGNATURE :
                </Text>
                <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#1e40af', marginTop: 2 }}>
                  {(Number(quote.depositAmount) || 0).toFixed(2)} € TTC
                  {quote.depositMode === 'percentage' ? ` (${quote.depositRate}%)` : ''}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Signature Box */}
        {quote.signature ? (
          <View style={styles.signatureSection}>
            <Text style={{ fontWeight: 'bold', color: '#065f46' }}>
              ✓ Bon pour accord et commande - Devis signé électroniquement
            </Text>
            <Text style={{ fontSize: 8, color: '#4b5563', marginTop: 2 }}>
              Signé le {new Date(quote.acceptedAt || quote.updatedAt || quote.createdAt).toLocaleString('fr-FR')}
            </Text>
            <Image src={quote.signature} style={styles.signatureImage} />
          </View>
        ) : (
          <View style={styles.signatureSection}>
            <Text style={{ fontSize: 8, color: '#6b7280' }}>
              Cadre réservé à la signature du client précédée de la mention manuscrite « Bon pour accord » :
            </Text>
            <View style={{ height: 40, borderWidth: 0.5, borderColor: '#d1d5db', marginTop: 4, borderRadius: 2 }} />
          </View>
        )}

        {/* Footer legal notices */}
        <View style={styles.footer}>
          <Text>{mentions.validity}</Text>
          <Text>{mentions.acceptance}</Text>
          <Text style={{ marginTop: 2 }}>
            {organization.name} - SIREN / N° TVA : {organization.taxId || 'N/A'} - Devis N° {quote.number}
          </Text>
        </View>
      </Page>
    </Document>
  );
}
