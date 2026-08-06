'use client';
import { useState, useEffect } from 'react';

export default function CookieConsent() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (!localStorage.getItem('cookie-consent')) setShow(true);
  }, []);

  const accept = () => {
    localStorage.setItem('cookie-consent', 'accepted');
    setShow(false);
  };

  if (!show) return null;
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-900 text-white p-4 text-center z-50">
      <p className="mb-2">Nous utilisons des cookies pour améliorer votre expérience.</p>
      <button onClick={accept} className="bg-blue-600 px-4 py-2 rounded">Accepter</button>
    </div>
  );
}
