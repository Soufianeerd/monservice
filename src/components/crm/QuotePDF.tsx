import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import { Deal, Organization } from '@/lib/data/interfaces';

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: 'Helvetica' },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  title: { fontSize: 18, fontWeight: 'bold' },
  section: { marginBottom: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  total: { marginTop: 20, borderTopWidth: 1, borderTopColor: '#000', paddingTop: 10 },
  totalRow: { flexDirection: 'row', justifyContent: 'flex-end', paddingVertical: 2 },
  footer: { marginTop: 40, fontSize: 8, color: '#6b7280', textAlign: 'center' },
  signatureSection: { marginTop: 40, borderTopWidth: 1, borderTopColor: '#e5e7eb', paddingTop: 10 },
  signatureImage: { width: 200, height: 100, marginTop: 10 },
});

interface QuotePDFProps {
  deal: Deal;
  organization: Organization;
  client: { name: string; email?: string; address?: string };
}

export function QuotePDF({ deal, organization, client }: QuotePDFProps) {
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
            <Text style={styles.title}>Devis</Text>
            <Text>Réf : {deal.name}</Text>
            <Text>Date : {new Date(deal.createdAt).toLocaleDateString('fr-FR')}</Text>
            {deal.expectedCloseDate && <Text>Valable jusqu&apos;au : {new Date(deal.expectedCloseDate).toLocaleDateString('fr-FR')}</Text>}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={{ fontWeight: 'bold' }}>Client</Text>
          <Text>{client.name}</Text>
          {client.email && <Text>{client.email}</Text>}
          {client.address && <Text>{client.address}</Text>}
        </View>

        <View style={styles.section}>
          <Text style={{ fontWeight: 'bold', marginBottom: 4 }}>Description du projet</Text>
          <Text>{deal.description || 'Aucune description'}</Text>
        </View>

        <View style={styles.total}>
          <View style={styles.totalRow}>
            <Text style={{ fontSize: 14, fontWeight: 'bold' }}>
              Montant total estimé : {deal.value.toFixed(2)} €
            </Text>
          </View>
        </View>

        {deal.signature && (
          <View style={styles.signatureSection}>
            <Text style={{ fontWeight: 'bold' }}>Signature du client :</Text>
            <Text>Signé le {new Date(deal.signedAt || '').toLocaleString('fr-FR')}</Text>
            <Image src={deal.signature} style={styles.signatureImage} />
          </View>
        )}

        <View style={styles.footer}>
          <Text>Ce devis est soumis aux conditions générales de vente.</Text>
        </View>
      </Page>
    </Document>
  );
}
