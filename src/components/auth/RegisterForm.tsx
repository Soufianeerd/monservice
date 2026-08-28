'use client';

import { useState } from 'react';
import { useAuth } from './AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { UserIcon, BriefcaseIcon, StethoscopeIcon, LaptopIcon, HammerIcon, MoreHorizontalIcon, ArrowLeftIcon, Loader2, CheckCircle2 } from 'lucide-react';
import { ProfileType } from '@/lib/data/interfaces';
import { passwordSchema } from '@/lib/validation/schemas';
import { toast } from 'react-hot-toast';
import { registerAction } from '@/app/actions/auth';
import PasswordField from './PasswordField';
import { PARAMEDICAL_PROFESSION_CODES, PARAMEDICAL_PROFESSIONS, ParamedicalProfessionCode, ParamedicalProfession } from '@/lib/workspaces/paramedical/professions';
import { REGISTRATION_SECTORS, RegistrationSectorCode } from '@/lib/registration/options';

export default function RegisterForm() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    profileType: '' as ProfileType | '',
    sector: '' as RegistrationSectorCode | '',
    profession: '' as ParamedicalProfessionCode | '',
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

      if (formData.password !== formData.confirmPassword) {
        toast.error('Les mots de passe ne correspondent pas.');
        return;
      }

      const passwordCheck = passwordSchema.safeParse(formData.password);
      if (!passwordCheck.success) {
        toast.error(passwordCheck.error.issues[0].message);
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!formData.profileType) {
        toast.error('Veuillez choisir un profil.');
        return;
      }
      if (formData.profileType === 'client') {
        setFormData(prev => ({ ...prev, orgName: '', sector: '', profession: '' }));
        setStep(4); // Skip sector step for clients
      } else {
        setStep(3);
      }
    } else if (step === 3) {
      if (!formData.sector || !formData.orgName) {
        toast.error('Veuillez renseigner votre secteur et le nom de votre entreprise.');
        return;
      }
      if (formData.sector === 'health' && !formData.profession) {
        toast.error('Veuillez sélectionner votre profession.');
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
    
    const result = await registerAction({
      name: formData.name,
      email: formData.email,
      password: formData.password,
      orgName: formData.profileType === 'professional' ? formData.orgName : undefined,
      profileType: formData.profileType as ProfileType,
      sector: formData.profileType === 'professional' ? formData.sector : undefined,
      profession: formData.profileType === 'professional' && formData.sector === 'health' ? formData.profession : undefined,
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
    }
  };

  const sectors = [
    { id: 'health' as RegistrationSectorCode, name: REGISTRATION_SECTORS.health.label, icon: <StethoscopeIcon className="w-5 h-5" /> },
    { id: 'freelance' as RegistrationSectorCode, name: REGISTRATION_SECTORS.freelance.label, icon: <LaptopIcon className="w-5 h-5" /> },
    { id: 'artisan' as RegistrationSectorCode, name: REGISTRATION_SECTORS.artisan.label, icon: <HammerIcon className="w-5 h-5" /> },
    { id: 'other' as RegistrationSectorCode, name: REGISTRATION_SECTORS.other.label, icon: <MoreHorizontalIcon className="w-5 h-5" /> },
  ];

  const stepsLabels = ["Compte", "Profil", "Activité", "Terminé"];

  return (
    <div className="w-full">
      {/* Stepper textuel horizontal */}
      <div className="mb-10 mt-2">
        <div className="flex items-center justify-between text-xs sm:text-sm font-medium">
          {stepsLabels.map((label, index) => {
            const stepNumber = index + 1;
            const isActive = step === stepNumber;
            const isCompleted = step > stepNumber;
            
            return (
              <div key={label} className={`flex items-center ${isActive ? 'text-primary-600 font-bold' : isCompleted ? 'text-gray-900' : 'text-gray-400'}`}>
                <span className="hidden sm:inline mr-1">{stepNumber}.</span>
                <span>{label}</span>
                {index < stepsLabels.length - 1 && (
                  <span className="mx-2 text-gray-300">›</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
        {/* STEP 1: Basic Info */}
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5 transition-colors group-focus-within:text-primary-600">Votre nom complet *</label>
              <div className="relative group">
                <input
                  type="text"
                  name="name"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="block w-full appearance-none rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-gray-900 placeholder-gray-400 shadow-sm transition-all focus:border-primary-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary-500/10 sm:text-sm"
                  placeholder="Jean Dupont"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5 transition-colors group-focus-within:text-primary-600">Adresse email *</label>
              <div className="relative group">
                <input
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="block w-full appearance-none rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-gray-900 placeholder-gray-400 shadow-sm transition-all focus:border-primary-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary-500/10 sm:text-sm"
                  placeholder="jean@exemple.com"
                />
              </div>
            </div>
            <div>
              <PasswordField
                id="password"
                name="password"
                label="Mot de passe *"
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Votre mot de passe"
              />
            </div>
            <div>
              <PasswordField
                id="confirmPassword"
                name="confirmPassword"
                label="Confirmez le mot de passe *"
                required
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                placeholder="Répétez votre mot de passe"
              />
              <div className="mt-3 text-xs text-gray-500 space-y-1">
                <p className="font-medium text-gray-700 mb-1">Règles du mot de passe :</p>
                <ul className="list-disc pl-4 space-y-0.5">
                  <li>Minimum 8 caractères</li>
                  <li>Une majuscule et une minuscule</li>
                  <li>Un chiffre (0-9)</li>
                  <li>Un symbole (!@#$%^&*)</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Profile Type */}
        {step === 2 && (
          <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, profileType: 'client' })}
                className={`relative flex flex-col items-center p-6 border-2 rounded-xl focus:outline-none transition-all ${
                  formData.profileType === 'client' ? 'border-primary-600 bg-primary-50 shadow-sm shadow-primary-100' : 'border-gray-200 hover:border-primary-300 bg-white'
                }`}
              >
                <div className={`w-12 h-12 rounded-full mb-3 flex items-center justify-center ${formData.profileType === 'client' ? 'bg-primary-100 text-primary-600' : 'bg-gray-50 text-gray-400'}`}>
                  <UserIcon className="w-6 h-6" />
                </div>
                <span className={`block text-sm font-bold ${formData.profileType === 'client' ? 'text-primary-900' : 'text-gray-900'}`}>Je suis un particulier</span>
                <span className="block mt-2 text-xs text-gray-500 text-center">Je cherche un professionnel pour réaliser un projet</span>
              </button>

              <button
                type="button"
                onClick={() => setFormData({ ...formData, profileType: 'professional' })}
                className={`relative flex flex-col items-center p-6 border-2 rounded-xl focus:outline-none transition-all ${
                  formData.profileType === 'professional' ? 'border-primary-600 bg-primary-50 shadow-sm shadow-primary-100' : 'border-gray-200 hover:border-primary-300 bg-white'
                }`}
              >
                <div className={`w-12 h-12 rounded-full mb-3 flex items-center justify-center ${formData.profileType === 'professional' ? 'bg-primary-100 text-primary-600' : 'bg-gray-50 text-gray-400'}`}>
                  <BriefcaseIcon className="w-6 h-6" />
                </div>
                <span className={`block text-sm font-bold ${formData.profileType === 'professional' ? 'text-primary-900' : 'text-gray-900'}`}>Je suis un professionnel</span>
                <span className="block mt-2 text-xs text-gray-500 text-center">Je propose mes services et souhaite gérer mon activité</span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Sector (Professional only) */}
        {step === 3 && formData.profileType === 'professional' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom de votre entreprise *</label>
              <input
                type="text"
                name="orgName"
                required
                value={formData.orgName}
                onChange={(e) => setFormData({ ...formData, orgName: e.target.value })}
                className="block w-full appearance-none rounded-xl border border-gray-200 px-4 py-3 text-gray-900 placeholder-gray-400 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-primary-500 sm:text-sm transition-colors"
                placeholder="Ex: Entreprise Dupont"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Secteur d&apos;activité *</label>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {sectors.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, sector: s.id, profession: s.id === 'health' ? formData.profession : '' })}
                    className={`flex items-center p-4 border-2 rounded-xl focus:outline-none transition-all ${
                      formData.sector === s.id ? 'border-primary-600 bg-primary-50' : 'border-gray-200 hover:border-primary-200 bg-white'
                    }`}
                  >
                    <div className={`mr-3 p-2 rounded-lg ${formData.sector === s.id ? 'bg-white text-primary-600 shadow-sm' : 'bg-gray-50 text-gray-500'}`}>
                      {s.icon}
                    </div>
                    <span className={`text-sm font-semibold ${formData.sector === s.id ? 'text-primary-900' : 'text-gray-700'}`}>
                      {s.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {formData.sector === 'health' && (
              <div className="mt-6 animate-in fade-in slide-in-from-top-2 duration-300">
                <label className="block text-sm font-medium text-gray-700 mb-3">Votre profession paramédicale *</label>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {PARAMEDICAL_PROFESSION_CODES.map((code) => {
                    const prof: ParamedicalProfession = PARAMEDICAL_PROFESSIONS[code];
                    return (
                      <button
                        key={code}
                        type="button"
                        onClick={() => setFormData({ ...formData, profession: code })}
                        className={`flex items-center p-3 border-2 rounded-xl focus:outline-none transition-all text-left ${
                          formData.profession === code ? 'border-primary-600 bg-primary-50' : 'border-gray-200 hover:border-primary-200 bg-white'
                        }`}
                      >
                        <span className={`text-sm font-semibold ${formData.profession === code ? 'text-primary-900' : 'text-gray-700'}`}>
                          {prof.shortLabel || prof.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 4: Review */}
        {step === 4 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="bg-gray-50 p-6 rounded-xl border border-gray-100 shadow-inner">
              <h4 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-wider">Récapitulatif</h4>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between border-b border-gray-200 pb-2">
                  <span className="text-gray-500">Nom</span>
                  <span className="font-medium text-gray-900">{formData.name}</span>
                </div>
                <div className="flex justify-between border-b border-gray-200 pb-2">
                  <span className="text-gray-500">Email</span>
                  <span className="font-medium text-gray-900">{formData.email}</span>
                </div>
                <div className="flex justify-between border-b border-gray-200 pb-2">
                  <span className="text-gray-500">Profil</span>
                  <span className="font-medium text-gray-900">{formData.profileType === 'client' ? 'Particulier' : 'Professionnel'}</span>
                </div>
                {formData.profileType === 'professional' && (
                  <>
                    <div className="flex justify-between border-b border-gray-200 pb-2">
                      <span className="text-gray-500">Entreprise</span>
                      <span className="font-medium text-gray-900">{formData.orgName}</span>
                    </div>
                    <div className="flex justify-between border-b border-gray-200 pb-2">
                      <span className="text-gray-500">Secteur</span>
                      <span className="font-medium text-gray-900">{sectors.find(s => s.id === formData.sector)?.name}</span>
                    </div>
                    {formData.sector === 'health' && formData.profession !== '' && (
                      <div className="flex justify-between border-b border-gray-200 pb-2">
                        <span className="text-gray-500">Profession</span>
                        <span className="font-medium text-gray-900">
                          {PARAMEDICAL_PROFESSIONS[formData.profession].label}
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            <label className="flex items-start gap-3 cursor-pointer group">
              <div className="flex items-center h-5 mt-0.5">
                <input
                  type="checkbox"
                  checked={formData.acceptedTerms}
                  onChange={(e) => setFormData({ ...formData, acceptedTerms: e.target.checked })}
                  className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500 transition-all cursor-pointer"
                />
              </div>
              <div className="text-sm text-gray-600">
                J&apos;accepte les <Link href="/conditions" className="text-primary-600 font-medium hover:underline">conditions générales d&apos;utilisation</Link> et la <Link href="/confidentialite" className="text-primary-600 font-medium hover:underline">politique de confidentialité</Link>.
              </div>
            </label>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="pt-4 flex flex-col sm:flex-row gap-3">
          {step > 1 && (
            <button
              type="button"
              onClick={handleBack}
              className="order-2 sm:order-1 w-full sm:w-auto inline-flex justify-center items-center px-6 py-3 border border-gray-200 shadow-sm text-sm font-bold rounded-xl text-gray-700 bg-white hover:bg-gray-50 focus:outline-none transition-colors"
            >
              <ArrowLeftIcon className="w-4 h-4 mr-2" /> Retour
            </button>
          )}
          
          <button
            type="button"
            onClick={step < 4 ? handleNext : handleSubmit}
            disabled={isSubmitting || (step === 4 && !formData.acceptedTerms)}
            className="order-1 sm:order-2 flex-1 inline-flex justify-center items-center px-6 py-3 border border-transparent text-sm font-bold rounded-xl shadow-sm shadow-primary-200 text-white bg-primary-600 hover:bg-primary-700 focus:outline-none transition-all disabled:opacity-50"
          >
            {isSubmitting ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Création...</>
            ) : step < 4 ? (
              'Continuer'
            ) : (
              'Valider mon inscription'
            )}
          </button>
        </div>
      </form>

      <div className="mt-8 text-center text-sm">
        <span className="text-gray-600">Déjà un compte ?</span>{' '}
        <Link href="/login" className="font-semibold text-primary-600 hover:text-primary-500 transition-colors">
          Se connecter
        </Link>
      </div>
    </div>
  );
}
