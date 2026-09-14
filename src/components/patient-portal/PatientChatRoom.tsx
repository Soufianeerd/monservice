'use client';

import { useState } from 'react';
import {
  sendPatientPortalMessageAction,
  markPatientMessagesAsReadAction,
} from '@/app/actions/patient-messaging.actions';
import type { PatientPortalMessageDTO } from '@/lib/patient-messaging/types';
import { Send, Loader2, User, Stethoscope } from 'lucide-react';

export default function PatientChatRoom({
  patientId,
  practitioners,
  initialMessages,
  currentUserId,
}: {
  patientId: string;
  practitioners: Array<{ id: string; fullName: string }>;
  initialMessages: PatientPortalMessageDTO[];
  currentUserId: string;
}) {
  const [messages, setMessages] = useState<PatientPortalMessageDTO[]>(initialMessages);
  const [selectedPractitionerId, setSelectedPractitionerId] = useState<string>(
    practitioners[0]?.id || '',
  );
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed || !selectedPractitionerId) return;

    try {
      setSending(true);
      setError(null);
      const sent = await sendPatientPortalMessageAction(patientId, selectedPractitionerId, trimmed);
      setMessages((prev) => [...prev, sent]);
      setContent('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur lors de l’envoi du message';
      setError(msg);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm flex flex-col h-[600px]">
      {/* Top bar */}
      <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Stethoscope className="w-5 h-5 text-teal-600" />
          <span className="text-sm font-bold text-slate-800">Destinataire :</span>
        </div>

        <select
          value={selectedPractitionerId}
          onChange={(e) => setSelectedPractitionerId(e.target.value)}
          className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-800 focus:ring-2 focus:ring-teal-500"
        >
          {practitioners.map((p) => (
            <option key={p.id} value={p.id}>
              {p.fullName}
            </option>
          ))}
        </select>
      </div>

      {/* Messages Thread */}
      <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4 bg-slate-50/30">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8">
            <p className="text-sm font-medium text-slate-600">Aucun message pour le moment</p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">
              Posez une question administrative ou relative à vos soins à votre praticien. En cas d'urgence vitale, composez le 15.
            </p>
          </div>
        ) : (
          messages.map((m) => {
            const isMe = m.senderId === currentUserId;
            return (
              <div
                key={m.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mb-1 px-1">
                  <span>{m.senderName || (isMe ? 'Moi' : 'Praticien')}</span>
                  <span>•</span>
                  <span>
                    {new Intl.DateTimeFormat('fr-FR', {
                      timeStyle: 'short',
                      dateStyle: 'short',
                    }).format(new Date(m.createdAt))}
                  </span>
                </div>

                <div
                  className={`max-w-[80%] sm:max-w-[70%] rounded-2xl px-4 py-2.5 text-sm ${
                    isMe
                      ? 'bg-teal-600 text-white rounded-br-none'
                      : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none shadow-sm'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.content}</p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Message Input Form */}
      <form onSubmit={handleSend} className="p-3 bg-white border-t border-slate-200 space-y-2">
        {error && <p className="text-xs text-rose-600 px-2">{error}</p>}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Écrivez votre message..."
            disabled={sending || practitioners.length === 0}
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
          />
          <button
            type="submit"
            disabled={sending || !content.trim() || practitioners.length === 0}
            className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-xl font-semibold text-sm transition-colors flex items-center gap-1.5 shadow-sm"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Envoyer
          </button>
        </div>
      </form>
    </div>
  );
}
