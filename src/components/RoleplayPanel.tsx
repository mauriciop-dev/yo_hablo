import React, { useState } from 'react';
import { UserProfile } from '../types';
import { Compass, Sparkles, ArrowRight, Coffee, Building, Plane, Briefcase, ShoppingCart } from 'lucide-react';

interface RoleplayPanelProps {
  profile: UserProfile;
  onSelectScenario: (scenario: { title: string; prompt: string; description: string }) => void;
}

interface Scenario {
  id: string;
  icon: any;
  title: Record<string, string>;
  description: Record<string, string>;
  initialPrompt: Record<string, string>;
  difficulty: string;
}

const SCENARIOS: Scenario[] = [
  {
    id: 'cafe',
    icon: Coffee,
    title: {
      German: 'Im Café (En la cafetería)',
      English: 'At the Cafe',
      French: 'Au Café',
    },
    description: {
      German: 'Bestelle ein Getränk und Gebäck auf Deutsch mit dem Kellner.',
      English: 'Order a drink and pastry in English with the barista.',
      French: 'Commandez une boisson et une viennoiserie en français.',
    },
    initialPrompt: {
      German: 'Guten Tag! Willkommen im Café Sonne. Was darf ich Ihnen heute bringen?',
      English: 'Hello! Welcome to Cafe Sun. What can I get for you today?',
      French: 'Bonjour ! Bienvenue au Café Soleil. Que puis-je vous apporter aujourd hui ?',
    },
    difficulty: 'A1 - A2',
  },
  {
    id: 'hotel',
    icon: Building,
    title: {
      German: 'Im Hotel (Check-in im Hotel)',
      English: 'Hotel Check-in',
      French: 'Enregistrement à l hôtel',
    },
    description: {
      German: 'Du kommst im Hotel an und möchtest dein Zimmer beziehen und nach dem WLAN fragen.',
      English: 'You arrive at the hotel, check in, and ask about breakfast and Wi-Fi.',
      French: 'Vous arrivez à l hôtel, faites le check-in et demandez les informations.',
    },
    difficulty: 'A2 - B1',
  },
  {
    id: 'airport',
    icon: Plane,
    title: {
      German: 'Am Flughafen (En el aeropuerto)',
      English: 'At the Airport',
      French: 'À l aéroport',
    },
    description: {
      German: 'Frage am Schalter nach deinem Flug, Gepäck und dem Abflug-Gate.',
      English: 'Ask at the counter about your flight, luggage, and departure gate.',
      French: 'Demandez au comptoir concernant votre vol, vos bagages et la porte d embarquement.',
    },
    difficulty: 'A2 - B1',
  },
  {
    id: 'interview',
    icon: Briefcase,
    title: {
      German: 'Vorstellungsgespräch (Entrevista de trabajo)',
      English: 'Job Interview',
      French: 'Entretien d embauche',
    },
    description: {
      German: 'Stelle dich vor und beantworte professionelle Fragen für eine neue Stelle.',
      English: 'Introduce yourself and answer professional interview questions.',
      French: 'Présentez-vous et répondez aux questions professionnelles.',
    },
    difficulty: 'B1 - B2',
  },
  {
    id: 'shopping',
    icon: ShoppingCart,
    title: {
      German: 'Im Supermarkt (En el supermercado)',
      English: 'At the Supermarket',
      French: 'Au Supermarché',
    },
    description: {
      German: 'Frage den Verkäufer, wo man frisches Obst und Milch findet.',
      English: 'Ask the clerk where to find fresh fruit and milk.',
      French: 'Demandez au vendeur où trouver des fruits frais et du lait.',
    },
    difficulty: 'A1 - A2',
  },
];

export default function RoleplayPanel({ profile, onSelectScenario }: RoleplayPanelProps) {
  const lang = ['German', 'English', 'French'].includes(profile.targetLanguage) ? profile.targetLanguage : 'German';

  return (
    <div className="flex-1 p-6 max-w-5xl mx-auto w-full overflow-y-auto space-y-6">
      <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-3xl p-8 text-white shadow-lg relative overflow-hidden">
        <div className="absolute right-0 bottom-0 opacity-10 translate-x-10 translate-y-10">
          <Compass className="w-64 h-64" />
        </div>
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center space-x-2 bg-emerald-500/30 backdrop-blur-md px-3 py-1 rounded-full text-xs font-medium text-emerald-100 mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Escenarios de Rol Interactivos (Roleplay)</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Practica situaciones del mundo real</h2>
          <p className="mt-2 text-emerald-100 text-sm sm:text-base leading-relaxed">
            Elige una situación cotidiana o profesional. Aura adoptará el rol correspondiente en {profile.targetLanguage} para conversar contigo de forma natural.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SCENARIOS.map((scenario) => {
          const Icon = scenario.icon;
          const titleText = scenario.title[lang] || scenario.title['German'];
          const descText = scenario.description[lang] || scenario.description['German'];
          const promptText = scenario.initialPrompt[lang] || scenario.initialPrompt['German'];

          return (
            <div
              key={scenario.id}
              onClick={() => onSelectScenario({ title: titleText, prompt: promptText, description: descText })}
              className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs hover:shadow-md hover:border-emerald-300 transition-all cursor-pointer flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 group-hover:scale-110 group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-xs">
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className="text-[11px] font-semibold bg-stone-100 text-stone-600 px-2.5 py-1 rounded-full border border-stone-200">
                    {scenario.difficulty}
                  </span>
                </div>
                <h3 className="font-semibold text-stone-800 text-base mb-1 group-hover:text-emerald-700 transition-colors">
                  {titleText}
                </h3>
                <p className="text-xs text-stone-500 leading-relaxed">
                  {descText}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-stone-100 flex items-center justify-between text-xs font-medium text-emerald-600 group-hover:text-emerald-700">
                <span>Iniciar simulación</span>
                <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
