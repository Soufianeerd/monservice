'use client';

import React, { useState } from 'react';
import { Mail, Phone, Copy, MessageCircle, FileText, CheckSquare, Calendar, Clock, Check } from 'lucide-react';
import Link from 'next/link';
import { Client, Contact } from '@/lib/data/interfaces';

interface QuickActionsProps {
  entityType: 'client' | 'contact';
  entity: Client | Contact;
}

export default function QuickActions({ entityType, entity }: QuickActionsProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  
  const hasPhone = !!entity.phone;
  const hasEmail = !!entity.email;

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handlePhoneAction = () => {
    if (hasPhone) {
      window.location.href = `tel:${entity.phone}`;
    }
  };

  const handleEmailAction = () => {
    if (hasEmail) {
      window.location.href = `mailto:${entity.email}`;
    }
  };

  const handleWhatsAppAction = () => {
    if (hasPhone && entity.phone) {
      const cleanPhone = entity.phone.replace(/[^0-9+]/g, '');
      window.open(`https://wa.me/${cleanPhone}`, '_blank');
    }
  };

  const handleToast = (message: string) => {
    // In a real app we'd use a toast library like sonner or react-hot-toast
    alert(message);
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6 flex flex-wrap gap-2">
      
      {/* Communication */}
      <button 
        onClick={handleEmailAction}
        disabled={!hasEmail}
        className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
        title="Envoyer un email"
      >
        <Mail className="h-4 w-4 mr-1.5 text-gray-500" />
        Email
      </button>

      <div className="relative group">
        <button 
          onClick={handlePhoneAction}
          disabled={!hasPhone}
          className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
          title="Appeler"
        >
          <Phone className="h-4 w-4 mr-1.5 text-gray-500" />
          Appeler
        </button>
      </div>

      <button 
        onClick={handleWhatsAppAction}
        disabled={!hasPhone}
        className="inline-flex items-center px-3 py-1.5 border border-green-200 shadow-sm text-sm font-medium rounded-md text-green-700 bg-green-50 hover:bg-green-100 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
        title="Ouvrir dans WhatsApp"
      >
        <MessageCircle className="h-4 w-4 mr-1.5 text-green-600" />
        WhatsApp
      </button>

      <button 
        onClick={() => {
          if (hasEmail && entity.email) handleCopy(entity.email, 'email');
          else if (hasPhone && entity.phone) handleCopy(entity.phone, 'phone');
        }}
        disabled={!hasEmail && !hasPhone}
        className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
        title="Copier les coordonnées"
      >
        {copiedField ? <Check className="h-4 w-4 mr-1.5 text-green-500" /> : <Copy className="h-4 w-4 mr-1.5 text-gray-500" />}
        {copiedField ? 'Copié !' : 'Copier info'}
      </button>

      <div className="h-6 border-l border-gray-300 mx-1 self-center hidden sm:block"></div>

      {/* Actions CRM */}
      <button 
        onClick={() => handleToast('Fonctionnalité Notes à venir')}
        className="inline-flex items-center px-3 py-1.5 border border-transparent shadow-sm text-sm font-medium rounded-md text-indigo-700 bg-indigo-50 hover:bg-indigo-100 focus:outline-none"
      >
        <FileText className="h-4 w-4 mr-1.5 text-indigo-500" />
        Note
      </button>

      <Link 
        href={`/tasks/new?entityType=${entityType}&entityId=${entity.id}`}
        className="inline-flex items-center px-3 py-1.5 border border-transparent shadow-sm text-sm font-medium rounded-md text-indigo-700 bg-indigo-50 hover:bg-indigo-100 focus:outline-none"
      >
        <CheckSquare className="h-4 w-4 mr-1.5 text-indigo-500" />
        Tâche
      </Link>

      <button 
        onClick={() => handleToast('Fonctionnalité Calendrier à venir')}
        className="inline-flex items-center px-3 py-1.5 border border-transparent shadow-sm text-sm font-medium rounded-md text-indigo-700 bg-indigo-50 hover:bg-indigo-100 focus:outline-none"
      >
        <Calendar className="h-4 w-4 mr-1.5 text-indigo-500" />
        Rendez-vous
      </button>

      <button 
        onClick={() => handleToast('Fonctionnalité Historique à venir')}
        className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none ml-auto"
      >
        <Clock className="h-4 w-4 mr-1.5 text-gray-500" />
        Historique
      </button>

    </div>
  );
}
