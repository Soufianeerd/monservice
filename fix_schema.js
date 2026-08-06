const fs = require('fs');
let code = fs.readFileSync('src/lib/db/schema.ts', 'utf8');

const indexes = {
  clients: ["index('clients_organization_id_idx').on(t.organizationId)"],
  contacts: ["index('contacts_organization_id_idx').on(t.organizationId)", "index('contacts_client_id_idx').on(t.clientId)"],
  deals: ["index('deals_organization_id_idx').on(t.organizationId)", "index('deals_client_id_idx').on(t.clientId)"],
  products: ["index('products_organization_id_idx').on(t.organizationId)"],
  invoices: ["index('invoices_organization_id_idx').on(t.organizationId)", "index('invoices_client_id_idx').on(t.clientId)", "uniqueIndex('invoices_org_number_unique').on(t.organizationId, t.number)"],
  invoiceLines: ["index('invoice_lines_invoice_id_idx').on(t.invoiceId)"],
  tasks: ["index('tasks_organization_id_idx').on(t.organizationId)"],
  messages: ["index('messages_sender_id_idx').on(t.senderId)", "index('messages_receiver_id_idx').on(t.receiverId)", "index('messages_request_id_idx').on(t.requestId)"],
  requests: ["index('requests_client_id_idx').on(t.clientId)"],
  users: ["index('users_organization_id_idx').on(t.organizationId)"],
  messageTemplates: ["index('message_templates_organization_id_idx').on(t.organizationId)"]
};

for (const [table, idxs] of Object.entries(indexes)) {
  const tableName = table.replace(/([A-Z])/g, "_$1").toLowerCase();
  const tableRegex = new RegExp(`export const ${table} = sqliteTable\\('${tableName}', \\{([\\s\\S]*?)\\}\\);`);
  if (!tableRegex.test(code)) {
    console.log("Could not find table", table, "with regex", tableRegex);
  }
  code = code.replace(tableRegex, `export const ${table} = sqliteTable('${tableName}', {$1}, (t) => [
  ${idxs.join(',\n  ')}
]);`);
}

// Now remove the bottom exports
code = code.replace(/\/\/ -{75}\n\/\/ Index\n\/\/ -{75}\n[\s\S]*$/, '');

fs.writeFileSync('src/lib/db/schema.ts', code);
