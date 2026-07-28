import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { Invoice, Organization } from '@/lib/data/interfaces';

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: 'Helvetica' },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  title: { fontSize: 18, fontWeight: 'bold' },
  section: { marginBottom: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  table: { marginVertical: 10 },
  tableHeader: { backgroundColor: '#f3f4f6', flexDirection: 'row', padding: 8, fontWeight: 'bold' },
  tableRow: { flexDirection: 'row', padding: 8, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  col1: { flex: 3 },
  col2: { flex: 2, textAlign: 'right' },
  col3: { flex: 2, textAlign: 'right' },
  col4: { flex: 2, textAlign: 'right' },
  total: { marginTop: 20, borderTopWidth: 1, borderTopColor: '#000', paddingTop: 10 },
  totalRow: { flexDirection: 'row', justifyContent: 'flex-end', paddingVertical: 2 },
  footer: { marginTop: 40, fontSize: 8, color: '#6b7280', textAlign: 'center' },
});

interface InvoicePDFProps {
  invoice: Invoice;
  organization: Organization;
  client: { name: string; email?: string; address?: string };
}

export function InvoicePDF({ invoice, organization, client }: InvoicePDFProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>{organization.name}</Text>
            {organization.address && <Text>{organization.address}</Text>}
            <Text>{organization.city || ''} {organization.zipCode || ''}</Text>
            {organization.country && <Text>{organization.country}</Text>}
            {organization.email && <Text>{organization.email}</Text>}
            {organization.phone && <Text>{organization.phone}</Text>}
          </View>
          <View style={{ textAlign: 'right' }}>
            <Text style={styles.title}>Facture</Text>
            <Text>N° {invoice.number}</Text>
            <Text>Date : {new Date(invoice.date).toLocaleDateString('fr-FR')}</Text>
            {invoice.dueDate && <Text>Échéance : {new Date(invoice.dueDate).toLocaleDateString('fr-FR')}</Text>}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={{ fontWeight: 'bold' }}>Client</Text>
          <Text>{client.name}</Text>
          {client.email && <Text>{client.email}</Text>}
          {client.address && <Text>{client.address}</Text>}
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.col1}>Description</Text>
            <Text style={styles.col2}>Qté</Text>
            <Text style={styles.col3}>Prix unitaire</Text>
            <Text style={styles.col4}>Total HT</Text>
          </View>
          {invoice.lines.map((line, index) => (
            <View key={index} style={styles.tableRow}>
              <Text style={styles.col1}>{line.description}</Text>
              <Text style={styles.col2}>{line.quantity}</Text>
              <Text style={styles.col3}>{line.unitPrice.toFixed(2)} €</Text>
              <Text style={styles.col4}>{(line.quantity * line.unitPrice).toFixed(2)} €</Text>
            </View>
          ))}
        </View>

        <View style={styles.total}>
          <View style={styles.totalRow}>
            <Text style={{ fontWeight: 'bold' }}>Total HT : {invoice.totalHT.toFixed(2)} €</Text>
          </View>
          <View style={styles.totalRow}>
            <Text>TVA : {invoice.taxAmount.toFixed(2)} €</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={{ fontSize: 14, fontWeight: 'bold' }}>
              Total TTC : {invoice.totalTTC.toFixed(2)} €
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text>{organization.legalNotice || 'Mentions légales non définies'}</Text>
          <Text>{organization.paymentTerms || 'Paiement à 30 jours'}</Text>
          <Text>{organization.bankDetails || 'Coordonnées bancaires non définies'}</Text>
          <Text style={{ marginTop: 5 }}>Merci de votre confiance.</Text>
        </View>
      </Page>
    </Document>
  );
}
