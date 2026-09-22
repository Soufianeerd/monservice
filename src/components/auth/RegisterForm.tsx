'use client';

import { useState, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  UserIcon,
  BriefcaseIcon,
  StethoscopeIcon,
  LaptopIcon,
  HammerIcon,
  MoreHorizontalIcon,
  ArrowLeftIcon,
  Loader2,
  CheckCircle2,
  Search,
} from 'lucide-react';
import { ProfileType } from '@/lib/data/interfaces';
import { passwordSchema } from '@/lib/validation/schemas';
import { toast } from 'react-hot-toast';
import { registerAction } from '@/app/actions/auth';
import PasswordField from './PasswordField';
import {
  PARAMEDICAL_PROFESSION_CODES,
  PARAMEDICAL_PROFESSIONS,
  ParamedicalProfessionCode,
  ParamedicalProfession,
} from '@/lib/workspaces/paramedical/professions';
import {
  FIELD_SERVICE_PROFESSION_CODES,
  FIELD_SERVICE_PROFESSIONS,
  FieldServiceProfessionCode,
  FieldServiceProfession,
} from '@/lib/workspaces/field-service/professions';
import {
  FIELD_SERVICE_BUSINESS_FAMILY_CODES,
  FIELD_SERVICE_BUSINESS_FAMILIES,
  FieldServiceBusinessFamilyCode,
} from '@/lib/workspaces/field-service/families';
import {
  REGISTRATION_SECTOR_CODES,
  REGISTRATION_SECTORS,
  RegistrationSectorCode,
} from '@/lib/registration/options';

type SelectedProfession = ParamedicalProfessionCode | FieldServiceProfessionCode | '';

export default function RegisterForm() {
  const [step, setStep] = useState(1);
  const [professionSearch, setProfessionSearch] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    profileType: '' as ProfileType | '',
    sector: '' as RegistrationSectorCode | '',
    profession: '' as SelectedProfession,
    orgName: '',
    acceptedTerms: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { signIn } = useAuth();
  const router = useRouter();

  // Filtrage et regroupement des professions Field Service par Business Family
  const groupedFieldServiceProfessions = useMemo(() => {
    const query = professionSearch.trim().toLowerCase();
    const result: { familyCode: FieldServiceBusinessFamilyCode; familyLabel: string; professions: FieldServiceProfession[] }[] = [];

    for (const familyCode of FIELD_SERVICE_BUSINESS_FAMILY_CODES) {
      const family = FIELD_SERVICE_BUSINESS_FAMILIES[familyCode];
      const matching = FIELD_SERVICE_PROFESSION_CODES
        .map((code) => FIELD_SERVICE_PROFESSIONS[code])
        .filter((prof) => prof.family === familyCode)
        .filter((prof) => {
          if (!query) return true;
          return (
            prof.label.toLowerCase().includes(query) ||
            (prof.shortLabel && prof.shortLabel.toLowerCase().includes(query)) ||
            prof.description.toLowerCase().includes(query) ||
            family.label.toLowerCase().includes(query)
          );
        });

      if (matching.length > 0) {
        result.push({
          familyCode,
          familyLabel: family.label,
          professions: matching,
        });
      }
    }

    return result;
  }, [professionSearch]);

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
      if (formData.sector === 'field_services' && !formData.profession) {
        toast.error('Veuillez sélectionner votre métier.');
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

    const isProfessionSector = formData.sector === 'health' || formData.sector === 'field_services';
    const result = await registerAction({
      name: formData.name,
      email: formData.email,
      password: formData.password,
      orgName: formData.profileType === 'professional' ? formData.orgName : undefined,
      profileType: formData.profileType as ProfileType,
      sector: formData.profileType === 'professional' ? formData.sector : undefined,
      profession:
        formData.profileType === 'professional' && isProfessionSector
          ? formData.profession || undefined
          : undefined,
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

  const sectorIcons: Record<RegistrationSectorCode, React.ReactNode> = {
    health: <StethoscopeIcon className="w-5 h-5" />,
    field_services: <HammerIcon className="w-5 h-5" />,
    freelance: <LaptopIcon className="w-5 h-5" />,
    other: <MoreHorizontalIcon className="w-5 h-5" />,
  };

  const sectors = REGISTRATION_SECTOR_CODES.map((code) => ({
    id: code,
    name: REGISTRATION_SECTORS[code].label,
    icon: sectorIcons[code],
  }));

  const stepsLabels = ['Compte', 'Profil', 'Activité', 'Terminé'];

  // Obtention du label affiché de la profession
  const getSelectedProfessionLabel = (): string => {
    if (!formData.profession) return '';
    if (formData.sector === 'health' && formData.profession in PARAMEDICAL_PROFESSIONS) {
      return PARAMEDICAL_PROFESSIONS[formData.profession as ParamedicalProfessionCode].label;
    }
    if (formData.sector === 'field_services' && formData.profession in FIELD_SERVICE_PROFESSIONS) {
      return FIELD_SERVICE_PROFESSIONS[formData.profession as FieldServiceProfessionCode].label;
    }
    return formData.profession;
  };

  return (
    <div className="w-full max-w-2xl bg-white p-8 sm:p-10 rounded-2xl shadow-xl shadow-gray-100 border border-gray-100 transition-all">
      <div className="mb-8">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight text-center">Créer un compte</h2>
        <p className="text-sm text-gray-500 text-center mt-2">
          Rejoignez la plateforme et pilotez votre activité en toute simplicité
        </p>
      </div>

      {/* Stepper Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between relative">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 bg-gray-100 w-full z-0" />
          <div
            className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 bg-primary-600 transition-all duration-300 z-0"
            style={{ width: `${((step - 1) / (stepsLabels.length - 1)) * 100}%` }}
          />
          {stepsLabels.map((label, idx) => {
            const stepNum = idx + 1;
            const isCompleted = step > stepNum;
            const isCurrent = step === stepNum;
            return (
              <div key={label} className="relative z-10 flex flex-col items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    isCompleted
                      ? 'bg-primary-600 text-white'
                      : isCurrent
                      ? 'bg-primary-600 text-white ring-4 ring-primary-100'
                      : 'bg-white border-2 border-gray-200 text-gray-400'
                  }`}
                >
                  {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : stepNum}
                </div>
                <span
                  className={`text-xs mt-2 font-medium hidden sm:block ${
                    isCurrent ? 'text-primary-600 font-bold' : 'text-gray-400'
                  }`}
                >
                  {label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* STEP 1: Account info */}
        {step === 1 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom complet *</label>
              <input
                type="text"
                name="name"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="block w-full appearance-none rounded-xl border border-gray-200 px-4 py-3 text-gray-900 placeholder-gray-400 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-primary-500 sm:text-sm transition-colors"
                placeholder="Jean Dupont"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Adresse email *</label>
              <input
                type="email"
                name="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="block w-full appearance-none rounded-xl border border-gray-200 px-4 py-3 text-gray-900 placeholder-gray-400 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-primary-500 sm:text-sm transition-colors"
                placeholder="jean.dupont@exemple.fr"
              />
            </div>

            <PasswordField
              label="Mot de passe *"
              name="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="8 caractères min, 1 maj, 1 min, 1 chiffre, 1 spécial"
              helperText="Min. 8 caractères dont 1 majuscule, 1 minuscule, 1 chiffre et 1 symbole."
            />

            <PasswordField
              label="Confirmer le mot de passe *"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              placeholder="Confirmez votre mot de passe"
            />
          </div>
        )}

        {/* STEP 2: Profile Selection */}
        {step === 2 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <label className="block text-sm font-medium text-gray-700 text-center mb-4">
              Sélectionnez votre type de profil *
            </label>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setFormData((prev) => ({ ...prev, profileType: 'client', orgName: '', sector: '', profession: '' }))}
                className={`relative flex flex-col items-center p-6 border-2 rounded-xl focus:outline-none transition-all ${
                  formData.profileType === 'client' ? 'border-primary-600 bg-primary-50 shadow-sm shadow-primary-100' : 'border-gray-200 hover:border-primary-300 bg-white'
                }`}
              >
                <div className={`w-12 h-12 rounded-full mb-3 flex items-center justify-center ${formData.profileType === 'client' ? 'bg-primary-100 text-primary-600' : 'bg-gray-50 text-gray-400'}`}>
                  <UserIcon className="w-6 h-6" />
                </div>
                <span className={`block text-sm font-bold ${formData.profileType === 'client' ? 'text-primary-900' : 'text-gray-900'}`}>Je suis un particulier</span>
                <span className="block mt-2 text-xs text-gray-500 text-center">Je recherche des professionnels et souhaite suivre mes demandes</span>
              </button>

              <button
                type="button"
                onClick={() => setFormData((prev) => ({ ...prev, profileType: 'professional' }))}
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

        {/* STEP 3: Sector & Profession (Professional only) */}
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
                    onClick={() =>
                      setFormData({
                        ...formData,
                        sector: s.id,
                        profession: '',
                      })
                    }
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

            {/* Sub-selector for Health professions */}
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

            {/* Sub-selector for Field Services / BTP & Technical professions */}
            {formData.sector === 'field_services' && (
              <div className="mt-6 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <label className="block text-sm font-medium text-gray-700">Votre métier / activité technique *</label>
                  <div className="relative w-full sm:w-64">
                    <input
                      type="text"
                      value={professionSearch}
                      onChange={(e) => setProfessionSearch(e.target.value)}
                      placeholder="Rechercher un métier..."
                      className="w-full text-xs rounded-lg border border-gray-200 pl-8 pr-3 py-1.5 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    />
                    <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                <div className="max-h-72 overflow-y-auto space-y-4 pr-1 border border-gray-100 rounded-xl p-3 bg-gray-50/50">
                  {groupedFieldServiceProfessions.length === 0 ? (
                    <div className="text-center py-6 text-sm text-gray-400">
                      Aucun métier ne correspond à votre recherche.
                    </div>
                  ) : (
                    groupedFieldServiceProfessions.map((group) => (
                      <div key={group.familyCode} className="space-y-2">
                        <div className="text-xs font-bold text-gray-500 uppercase tracking-wider px-1">
                          {group.familyLabel}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                          {group.professions.map((prof) => (
                            <button
                              key={prof.code}
                              type="button"
                              onClick={() => setFormData({ ...formData, profession: prof.code })}
                              className={`flex flex-col p-2.5 border-2 rounded-xl focus:outline-none transition-all text-left ${
                                formData.profession === prof.code
                                  ? 'border-primary-600 bg-primary-50 shadow-sm'
                                  : 'border-gray-200 hover:border-primary-200 bg-white'
                              }`}
                            >
                              <span
                                className={`text-xs font-semibold ${
                                  formData.profession === prof.code ? 'text-primary-900' : 'text-gray-900'
                                }`}
                              >
                                {prof.shortLabel || prof.label}
                              </span>
                              <span className="text-[10px] text-gray-500 line-clamp-1 mt-0.5">
                                {prof.description}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
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
                    {formData.profession !== '' && (
                      <div className="flex justify-between border-b border-gray-200 pb-2">
                        <span className="text-gray-500">Profession / Métier</span>
                        <span className="font-medium text-gray-900">
                          {getSelectedProfessionLabel()}
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
