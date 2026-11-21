'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Organization } from '@/lib/data/interfaces';
import { organizationSchema } from '@/utils/validation';
import { countries } from '@/lib/constants/countries';
import { useWorkspace } from '@/hooks/useWorkspace';
import { industries } from '@/lib/constants/industries';
import { REGISTRATION_SECTORS, type RegistrationSectorCode } from '@/lib/registration/options';

type OrganizationFormData = z.infer<typeof organizationSchema>;

interface OrganizationFormProps {
  initialData: Organization;
  onSubmit: (data: OrganizationFormData, logo?: string) => Promise<void>;
  isSubmitting?: boolean;
}

export default function OrganizationForm({ initialData, onSubmit, isSubmitting }: OrganizationFormProps) {
  const isPractice = useWorkspace()?.type === "paramedical";
  const [logo, setLogo] = useState<string | undefined>(initialData.logo);

  const { register, handleSubmit, watch, formState: { errors } } = useForm<OrganizationFormData>({
    resolver: zodResolver(organizationSchema),
    defaultValues: {
      name: initialData.name || '',
      industry: initialData.industry || '',
      customIndustry: initialData.customIndustry || '',
      country: initialData.country || '',
      address: initialData.address || '',
      city: initialData.city || '',
      zipCode: initialData.postalCode || initialData.zipCode || '',
      email: initialData.email || '',
      phone: initialData.phone || '',
      website: initialData.website || '',
      taxId: initialData.taxId || '',
      currency: initialData.currency || 'EUR',
      legalForm: initialData.legalForm || '',
      siret: initialData.siret || '',
      vatNumber: initialData.vatNumber || '',
      vatExempt: initialData.vatExempt ?? false,
      iban: initialData.iban || '',
      bic: initialData.bic || '',
      paymentTerms: initialData.paymentTerms || '',
    }
  });

  const selectedIndustry = watch('industry');

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogo(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const submitForm = async (data: OrganizationFormData) => {
    await onSubmit(data, logo);
  };

  return (
    <form data-guide-form="organisation" onSubmit={handleSubmit(submitForm)} className="space-y-8 max-w-4xl bg-white p-6 rounded-lg shadow border border-gray-200">
      
      {/* Logo */}
      <div>
        <label className="block text-sm font-medium text-gray-700">Logo de votre activité (facultatif)</label>
        <div className="mt-1 flex items-center space-x-4">
          <div className="flex-shrink-0 h-16 w-16 bg-gray-100 rounded-md flex items-center justify-center overflow-hidden border border-gray-300">
            {logo ? (
              <img src={logo} alt="Logo" className="h-full w-full object-contain" />
            ) : (
              <span className="text-gray-400 text-xs">Aucun logo</span>
            )}
          </div>
          <button
            type="button"
            className="px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
            onClick={() => document.getElementById('logo-upload')?.click()}
          >
            Changer le logo
          </button>
          <input
            id="logo-upload"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleLogoUpload}
          />
        </div>
      </div>

      {/* Informations Générales */}
      <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">Nom de l'activité *</label>
          <input
            type="text"
            id="name"
            {...register('name')}
            className="text-gray-900 mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
          {errors.name && <p role="alert" className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
        </div>

        {!isPractice && <div>
          <label htmlFor="industry" className="block text-sm font-medium text-gray-700">Secteur d'activité</label>
          <select
            id="industry"
            {...register('industry')}
            className="text-gray-900 mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white"
          >
            <option value="">Sélectionner un secteur...</option>
            {initialData.industry && !industries.includes(initialData.industry) && (
              // Valeur posée à l'inscription (code du secteur) : affichée avec son libellé.
              <option value={initialData.industry}>
                {initialData.industry in REGISTRATION_SECTORS ? REGISTRATION_SECTORS[initialData.industry as RegistrationSectorCode].label : initialData.industry}
              </option>
            )}
            {industries.map(ind => (
              <option key={ind} value={ind}>{ind}</option>
            ))}
          </select>
          {errors.industry && <p role="alert" className="mt-1 text-sm text-red-600">{errors.industry.message}</p>}
        </div>}

        {selectedIndustry === 'Autre' && (
          <div className="sm:col-span-2">
            <label htmlFor="customIndustry" className="block text-sm font-medium text-gray-700">Précisez le secteur</label>
            <input
              type="text"
              id="customIndustry"
              {...register('customIndustry')}
              className="text-gray-900 mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
        )}
      </div>

      {/* Contact & Localisation */}
      <div className="border-t border-gray-200 pt-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Coordonnées</h3>
        <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email générique</label>
            <input
              type="email"
              id="email"
              {...register('email')}
              className="text-gray-900 mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
            {errors.email && <p role="alert" className="mt-1 text-sm text-red-600">{errors.email.message}</p>}
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700">Téléphone</label>
            <input
              type="text"
              id="phone"
              {...register('phone')}
              className="text-gray-900 mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="address" className="block text-sm font-medium text-gray-700">Adresse</label>
            <input
              type="text"
              id="address"
              {...register('address')}
              className="text-gray-900 mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="zipCode" className="block text-sm font-medium text-gray-700">Code postal</label>
            <input
              type="text"
              id="zipCode"
              {...register('zipCode')}
              className="text-gray-900 mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="city" className="block text-sm font-medium text-gray-700">Ville</label>
            <input
              type="text"
              id="city"
              {...register('city')}
              className="text-gray-900 mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="country" className="block text-sm font-medium text-gray-700">Pays</label>
            <select
              id="country"
              {...register('country')}
              className="text-gray-900 mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white"
            >
              <option value="">Sélectionner un pays...</option>
              {countries.map(c => (
                <option key={c.code} value={c.code}>{c.name}</option>
              ))}
            </select>
            {errors.country && <p role="alert" className="mt-1 text-sm text-red-600">{errors.country.message}</p>}
          </div>


        </div>
      </div>

      {/* Mentions obligatoires des factures et devis (S-02) */}
      <div className="border-t border-gray-200 pt-6">
        <h3 className="text-lg font-medium text-gray-900">Informations légales et bancaires</h3>
        <p className="mt-1 mb-4 text-sm text-gray-500">Reprises sur vos devis, vos factures et vos relances de paiement.</p>
        <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
          <div>
            <label htmlFor="legalForm" className="block text-sm font-medium text-gray-700">Forme juridique</label>
            <select
              id="legalForm"
              {...register('legalForm')}
              className="text-gray-900 mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white"
            >
              <option value="">Sélectionner…</option>
              <option value="Entrepreneur individuel (micro-entreprise)">Entrepreneur individuel (micro-entreprise)</option>
              <option value="Entrepreneur individuel">Entrepreneur individuel</option>
              <option value="EURL">EURL</option>
              <option value="SARL">SARL</option>
              <option value="SASU">SASU</option>
              <option value="SAS">SAS</option>
              <option value="SA">SA</option>
              <option value="SCI">SCI</option>
              <option value="Association">Association</option>
              <option value="Profession libérale (BNC)">Profession libérale (BNC)</option>
            </select>
          </div>
          <div>
            <label htmlFor="siret" className="block text-sm font-medium text-gray-700">SIRET</label>
            <input
              type="text"
              id="siret"
              {...register('siret')}
              placeholder="123 456 789 00012"
              className="text-gray-900 mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
            {errors.siret && <p className="mt-1 text-sm text-red-600">{errors.siret.message}</p>}
          </div>
          <div>
            <label htmlFor="vatNumber" className="block text-sm font-medium text-gray-700">N° de TVA intracommunautaire</label>
            <input
              type="text"
              id="vatNumber"
              {...register('vatNumber')}
              placeholder="FR12345678901"
              className="text-gray-900 mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
            {errors.vatNumber && <p className="mt-1 text-sm text-red-600">{errors.vatNumber.message}</p>}
          </div>
          <div className="flex items-start gap-3 sm:col-span-2">
            <input type="checkbox" id="vatExempt" {...register('vatExempt')} className="mt-1 h-4 w-4 rounded border-gray-300 text-indigo-600" />
            <label htmlFor="vatExempt" className="text-sm text-gray-700">
              Je ne facture pas la TVA (franchise en base) : la mention « TVA non applicable, article 293 B du CGI » figurera sur mes factures.
            </label>
          </div>
          <div>
            <label htmlFor="iban" className="block text-sm font-medium text-gray-700">IBAN</label>
            <input
              type="text"
              id="iban"
              {...register('iban')}
              placeholder="FR76 3000 6000 0112 3456 7890 189"
              className="text-gray-900 mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
            {errors.iban && <p className="mt-1 text-sm text-red-600">{errors.iban.message}</p>}
          </div>
          <div>
            <label htmlFor="bic" className="block text-sm font-medium text-gray-700">BIC</label>
            <input
              type="text"
              id="bic"
              {...register('bic')}
              placeholder="AGRIFRPP"
              className="text-gray-900 mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
            {errors.bic && <p className="mt-1 text-sm text-red-600">{errors.bic.message}</p>}
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="paymentTerms" className="block text-sm font-medium text-gray-700">Conditions de paiement</label>
            <textarea
              id="paymentTerms"
              rows={2}
              {...register('paymentTerms')}
              placeholder="Paiement à 30 jours à réception de facture, par virement."
              className="text-gray-900 mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
        </div>
      </div>

      {/* Informations Légales */}
      <div className="border-t border-gray-200 pt-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Documents de facturation</h3>
        <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
          <div>
            <label htmlFor="currency" className="block text-sm font-medium text-gray-700">Devise par défaut</label>
            <select
              id="currency"
              {...register('currency')}
              className="text-gray-900 mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white"
            >
              <option value="EUR">EUR (€)</option>
              <option value="USD">USD ($)</option>
              <option value="CAD">CAD ($)</option>
              <option value="CHF">CHF (Fr)</option>
              <option value="MAD">MAD (DH)</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t border-gray-200">
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          {isSubmitting ? 'Enregistrement...' : 'Enregistrer les coordonnées'}
        </button>
      </div>
    </form>
  );
}
