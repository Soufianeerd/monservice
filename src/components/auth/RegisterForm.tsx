'use client';

import { useState } from 'react';
import { useAuth } from './AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { UserIcon, BriefcaseIcon, StethoscopeIcon, LaptopIcon, HammerIcon, MoreHorizontalIcon, ArrowLeftIcon } from 'lucide-react';
import { ProfileType } from '@/lib/data/interfaces';

import { toast } from 'react-hot-toast';
import { registerAction } from '@/app/actions/auth';

export default function RegisterForm() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    profileType: '' as ProfileType | '',
    sector: '',
    orgName: '',
    acceptedTerms: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { signIn } = useAuth();
  const router = useRouter();

  const handleNext = () => {
    if (step === 1) {
      if (!formData.name || !formData.email || !formData.password || !formData.confirmPassword) {
        toast.error('Veuillez remplir tous les champs obligatoires.');
        return;
      }
      if (formData.password.length < 8) {
        toast.error('Le mot de passe doit contenir au moins 8 caractères.');
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        toast.error('Les mots de passe ne correspondent pas.');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!formData.profileType) {
        toast.error('Veuillez choisir un profil.');
        return;
      }
      if (formData.profileType === 'client') {
        setStep(4); // Skip sector step for clients
      } else {
        setStep(3);
      }
    } else if (step === 3) {
      if (!formData.sector || !formData.orgName) {
        toast.error('Veuillez renseigner votre secteur et le nom de votre entreprise.');
        return;
      }
      setStep(4);
    }
  };

  const handleBack = () => {
    if (step === 4 && formData.profileType === 'client') {
      setStep(2);
    } else if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.acceptedTerms) {
      toast.error('Vous devez accepter les conditions générales.');
      return;
    }

    setIsSubmitting(true);

    // L'inscription est entièrement pilotée côté serveur : création du compte
    // Supabase Auth + du profil applicatif dans une seule action, pour éviter
    // qu'un compte d'authentification existe sans profil.
    const result = await registerAction({
      name: formData.name,
      email: formData.email,
      password: formData.password,
      orgName: formData.profileType === 'professional' ? formData.orgName : undefined,
      profileType: formData.profileType as ProfileType,
      sector: formData.profileType === 'professional' ? formData.sector : undefined,
    });

    if (!result.success) {
      setIsSubmitting(false);
      toast.error(result.error || 'Erreur lors de la création du compte.');
      return;
    }

    if (result.requiresEmailConfirmation) {
      setIsSubmitting(false);
      toast.success('Compte créé. Vérifiez votre boîte mail pour confirmer votre adresse.');
      router.push('/login');
      return;
    }

    const { error } = await signIn(formData.email, formData.password);
    setIsSubmitting(false);

    if (error) {
      toast.error('Compte créé, mais erreur lors de la connexion automatique.');
      router.push('/login');
    } else {
      toast.success('Compte créé avec succès !');
      router.push(formData.profileType === 'client' ? '/client/dashboard' : '/dashboard');
      router.refresh();
    }
  };

  const sectors = [
    { id: 'health', name: 'Santé & Bien-être', icon: <StethoscopeIcon className="w-6 h-6" /> },
    { id: 'freelance', name: 'Consultant & Freelance', icon: <LaptopIcon className="w-6 h-6" /> },
    { id: 'artisan', name: 'Artisan & Bâtiment', icon: <HammerIcon className="w-6 h-6" /> },
    { id: 'other', name: 'Autre', icon: <MoreHorizontalIcon className="w-6 h-6" /> },
  ];

  return (
    <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 w-full max-w-xl mx-auto">
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-2">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className={`h-2 flex-1 mx-1 rounded-full ${s <= step ? 'bg-indigo-600' : 'bg-gray-200'}`} />
          ))}
        </div>
        <p className="text-center text-sm font-medium text-gray-500">Étape {step} sur 4</p>
      </div>

      <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
        {/* STEP 1: Basic Info */}
        {step === 1 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Vos informations personnelles</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700">Votre nom complet *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Adresse email *</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Mot de passe *</label>
              <input
                type="password"
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Confirmer le mot de passe *</label>
              <input
                type="password"
                required
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
          </div>
        )}

        {/* STEP 2: Profile Type */}
        {step === 2 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Quel est votre profil ?</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, profileType: 'client' })}
                className={`relative flex flex-col items-center p-6 border rounded-lg focus:outline-none transition-all ${
                  formData.profileType === 'client' ? 'border-indigo-600 bg-indigo-50 ring-2 ring-indigo-600' : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <UserIcon className={`w-12 h-12 mb-3 ${formData.profileType === 'client' ? 'text-indigo-600' : 'text-gray-400'}`} />
                <span className={`block text-sm font-medium ${formData.profileType === 'client' ? 'text-indigo-900' : 'text-gray-900'}`}>Je suis un particulier</span>
                <span className="block mt-1 text-xs text-gray-500 text-center">Je cherche un professionnel pour un projet</span>
              </button>

              <button
                type="button"
                onClick={() => setFormData({ ...formData, profileType: 'professional' })}
                className={`relative flex flex-col items-center p-6 border rounded-lg focus:outline-none transition-all ${
                  formData.profileType === 'professional' ? 'border-indigo-600 bg-indigo-50 ring-2 ring-indigo-600' : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <BriefcaseIcon className={`w-12 h-12 mb-3 ${formData.profileType === 'professional' ? 'text-indigo-600' : 'text-gray-400'}`} />
                <span className={`block text-sm font-medium ${formData.profileType === 'professional' ? 'text-indigo-900' : 'text-gray-900'}`}>Je suis un professionnel</span>
                <span className="block mt-1 text-xs text-gray-500 text-center">Je propose mes services</span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Sector (Professional only) */}
        {step === 3 && formData.profileType === 'professional' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Informations professionnelles</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Nom de votre entreprise *</label>
              <input
                type="text"
                required
                value={formData.orgName}
                onChange={(e) => setFormData({ ...formData, orgName: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Secteur d&apos;activité *</label>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {sectors.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, sector: s.id })}
                    className={`flex items-center p-4 border rounded-lg focus:outline-none transition-all ${
                      formData.sector === s.id ? 'border-indigo-600 bg-indigo-50 ring-1 ring-indigo-600' : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <div className={`mr-3 ${formData.sector === s.id ? 'text-indigo-600' : 'text-gray-400'}`}>
                      {s.icon}
                    </div>
                    <span className={`text-sm font-medium ${formData.sector === s.id ? 'text-indigo-900' : 'text-gray-900'}`}>
                      {s.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: Review */}
        {step === 4 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Récapitulatif</h3>
            
            <div className="bg-gray-50 p-4 rounded-lg space-y-2 text-sm text-gray-900">
              <p><span className="font-medium text-gray-700">Nom :</span> {formData.name}</p>
              <p><span className="font-medium text-gray-700">Email :</span> {formData.email}</p>
              <p><span className="font-medium text-gray-700">Profil :</span> {formData.profileType === 'client' ? 'Particulier' : 'Professionnel'}</p>
              {formData.profileType === 'professional' && (
                <>
                  <p><span className="font-medium text-gray-700">Entreprise :</span> {formData.orgName}</p>
                  <p><span className="font-medium text-gray-700">Secteur :</span> {sectors.find(s => s.id === formData.sector)?.name}</p>
                </>
              )}
            </div>

            <div className="flex items-start mt-4">
              <div className="flex items-center h-5">
                <input
                  id="terms"
                  type="checkbox"
                  checked={formData.acceptedTerms}
                  onChange={(e) => setFormData({ ...formData, acceptedTerms: e.target.checked })}
                  className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded"
                />
              </div>
              <div className="ml-3 text-sm">
                <label htmlFor="terms" className="font-medium text-gray-700">
                  J&apos;accepte les <Link href="/conditions" className="text-indigo-600 hover:underline">conditions générales d&apos;utilisation</Link> et la <Link href="/confidentialite" className="text-indigo-600 hover:underline">politique de confidentialité</Link>.
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between pt-4 mt-6 border-t border-gray-200">
          {step > 1 ? (
            <button
              type="button"
              onClick={handleBack}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
            >
              <ArrowLeftIcon className="w-4 h-4 mr-2" /> Retour
            </button>
          ) : <div></div>}
          
          {step < 4 ? (
            <button
              type="button"
              onClick={handleNext}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none"
            >
              Suivant
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none disabled:opacity-70"
            >
              {isSubmitting ? 'Création en cours...' : 'Valider mon inscription'}
            </button>
          )}
        </div>
      </form>

      <div className="mt-6 text-center text-sm">
        <span className="text-gray-600">Déjà un compte ?</span>{' '}
        <Link href="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
          Se connecter
        </Link>
      </div>
    </div>
  );
}
