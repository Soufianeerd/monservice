import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image, Font } from '@react-pdf/renderer';
import { Invoice, Client, Organization } from '@/lib/data/interfaces';

// Register fonts if needed, but we'll use default fonts for simplicity

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: 'Helvetica', color: '#333' },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 40 },
  logoSection: { width: '50%' },
  logo: { width: 120, height: 60, objectFit: 'contain' },
  orgName: { fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  orgDetails: { fontSize: 9, color: '#666', lineHeight: 1.4 },
  docInfo: { width: '40%', textAlign: 'right' },
  docTitle: { fontSize: 24, fontWeight: 'bold', color: '#111827', marginBottom: 8, textTransform: 'uppercase' },
  docDetailRow: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 4 },
  docDetailLabel: { color: '#666', marginRight: 8, fontWeight: 'bold' },
  docDetailValue: { fontWeight: 'bold', minWidth: 80 },
  clientSection: { marginTop: 20, marginBottom: 40, padding: 15, backgroundColor: '#f9fafb', borderRadius: 4 },
  clientLabel: { fontSize: 9, color: '#666', marginBottom: 4, fontWeight: 'bold', textTransform: 'uppercase' },
  clientName: { fontSize: 12, fontWeight: 'bold', marginBottom: 4, color: '#111827' },
  clientDetails: { fontSize: 10, lineHeight: 1.4 },
  table: { width: '100%', marginBottom: 30 },
  tableHeader: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e5e7eb', paddingBottom: 8, marginBottom: 8 },
  th: { fontSize: 9, fontWeight: 'bold', color: '#6b7280', textTransform: 'uppercase' },
  tr: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  td: { fontSize: 10, color: '#374151' },
  col1: { width: '40%' },
  col2: { width: '15%', textAlign: 'center' },
  col3: { width: '15%', textAlign: 'right' },
  col4: { width: '15%', textAlign: 'right' },
  col5: { width: '15%', textAlign: 'right' },
  totalsSection: { width: '40%', alignSelf: 'flex-end', marginTop: 20 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  totalLabel: { color: '#6b7280' },
  totalValue: { fontWeight: 'bold', color: '#111827' },
  grandTotalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#e5e7eb', marginTop: 4 },
  grandTotalLabel: { fontSize: 12, fontWeight: 'bold' },
  grandTotalValue: { fontSize: 12, fontWeight: 'bold' },
  footer: { position: 'absolute', bottom: 40, left: 40, right: 40, borderTopWidth: 1, borderTopColor: '#e5e7eb', pt: 10, textAlign: 'center' },
  footerText: { fontSize: 8, color: '#9ca3af', lineHeight: 1.5 }
});

interface DocumentPDFProps {
  invoice: Invoice;
  client: Client;
  organization: Organization;
}

export default function DocumentPDF({ invoice, client, organization }: DocumentPDFProps) {
  const isQuote = invoice.type === 'quote';
  
  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: organization.currency || 'EUR' }).format(amount);
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoSection}>
            {organization.logo ? (
              <Image style={styles.logo} src={organization.logo} />
            ) : (
              <Text style={styles.orgName}>{organization.name}</Text>
            )}
            <Text style={styles.orgDetails}>{organization.address || ''}</Text>
            <Text style={styles.orgDetails}>
              {organization.zipCode || ''} {organization.city || ''} {organization.country ? `- ${organization.country}` : ''}
            </Text>
            <Text style={styles.orgDetails}>{organization.email || ''}</Text>
            <Text style={styles.orgDetails}>{organization.phone || ''}</Text>
          </View>
          <View style={styles.docInfo}>
            <Text style={styles.docTitle}>{isQuote ? 'Devis' : 'Facture'}</Text>
            <View style={styles.docDetailRow}>
              <Text style={styles.docDetailLabel}>N° :</Text>
              <Text style={styles.docDetailValue}>{invoice.number}</Text>
            </View>
            <View style={styles.docDetailRow}>
              <Text style={styles.docDetailLabel}>Date :</Text>
              <Text style={styles.docDetailValue}>{formatDate(invoice.date)}</Text>
            </View>
            {invoice.dueDate && (
              <View style={styles.docDetailRow}>
                <Text style={styles.docDetailLabel}>Échéance :</Text>
                <Text style={styles.docDetailValue}>{formatDate(invoice.dueDate)}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Client Details */}
        <View style={styles.clientSection}>
          <Text style={styles.clientLabel}>Facturé à :</Text>
          <Text style={styles.clientName}>{client.name}</Text>
          {client.address && <Text style={styles.clientDetails}>{client.address}</Text>}
          {client.phone && <Text style={styles.clientDetails}>{client.phone}</Text>}
          {client.email && <Text style={styles.clientDetails}>{client.email}</Text>}
        </View>

        {/* Items Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.th, styles.col1]}>Description</Text>
            <Text style={[styles.th, styles.col2]}>Qté</Text>
            <Text style={[styles.th, styles.col3]}>Prix U.</Text>
            <Text style={[styles.th, styles.col4]}>TVA</Text>
            <Text style={[styles.th, styles.col5]}>Total HT</Text>
          </View>
          
          {invoice.lines.map((line, i) => {
            const lineTotal = line.quantity * line.unitPrice * (1 - (line.discount || 0) / 100);
            return (
              <View key={i} style={styles.tr}>
                <Text style={[styles.td, styles.col1]}>{line.description}</Text>
                <Text style={[styles.td, styles.col2]}>{line.quantity}</Text>
                <Text style={[styles.td, styles.col3]}>{formatCurrency(line.unitPrice)}</Text>
                <Text style={[styles.td, styles.col4]}>{line.taxRate}%</Text>
                <Text style={[styles.td, styles.col5]}>{formatCurrency(lineTotal)}</Text>
              </View>
            );
          })}
        </View>

        {/* Totals */}
        <View style={styles.totalsSection}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total HT</Text>
            <Text style={styles.totalValue}>{formatCurrency(invoice.totalHT)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>TVA</Text>
            <Text style={styles.totalValue}>{formatCurrency(invoice.taxAmount)}</Text>
          </View>
          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>Total TTC</Text>
            <Text style={styles.grandTotalValue}>{formatCurrency(invoice.totalTTC)}</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {organization.name} {organization.taxId ? `- N° TVA / SIRET: ${organization.taxId}` : ''}
          </Text>
          <Text style={styles.footerText}>
            En cas de retard de paiement, une pénalité égale à 3 fois le taux d'intérêt légal sera appliquée. 
            Indemnité forfaitaire pour frais de recouvrement : 40€.
          </Text>
        </View>
        
      </Page>
    </Document>
  );
}
