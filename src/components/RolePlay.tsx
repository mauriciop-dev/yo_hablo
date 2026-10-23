import React, { useState, useEffect, useRef, useCallback, Component, ReactNode } from 'react';
import { Mic, MicOff, Volume2, VolumeX, MessageSquare, X, ChevronLeft, Play, Pause, StopCircle, Settings, RefreshCw, AlertTriangle } from 'lucide-react';
import { UserProfile } from '../types';
import { supabase } from '../lib/supabase';

class ErrorBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: ReactNode; fallback: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

export interface RolePlayScenario {
  id: string;
  title: string;
  description: string;
  icon: string;
  context: string;
  systemPrompt: string;
  initialMessage: string;
  vocabulary: { word: string; translation: string; example: string }[];
}

function getScenariosForLanguage(targetLanguage: 'German' | 'English' | 'French'): RolePlayScenario[] {
  const isGerman = targetLanguage === 'German';
  const isEnglish = targetLanguage === 'English';
  const isFrench = targetLanguage === 'French';

  const t = {
    cinema: {
      title: isGerman ? 'Im Kino' : isEnglish ? 'At the Cinema' : 'Au Cinéma',
      description: isGerman ? 'Karten kaufen, Plätze wählen, Popcorn bestellen' : isEnglish ? 'Buy tickets, choose seats, order popcorn' : 'Acheter des billets, choisir des places, commander du pop-corn',
      context: isGerman ? 'Du bist an der Kinokasse und möchtest Karten für einen Film kaufen.' : isEnglish ? 'You are at the cinema box office. You want to buy tickets for a movie.' : 'Vous êtes au guichet du cinéma. Vous voulez acheter des billets pour un film.',
      systemPrompt: isGerman
        ? `Du bist ein freundlicher, geduldiger Kinokassen-Mitarbeiter. Sprich auf Deutsch, Niveau {{level}}.
Kontext: Der Lernende möchte Kinokarten kaufen.
Deine Rolle: Hilf bei der Filmwahl, Uhrzeit, Plätzen und verkaufe Karten und Snacks.
Korrigiere sanft (max. 1 Fehler pro Antwort). Sei natürlich und gesprächig.`
        : isEnglish
          ? `You are a friendly, patient cinema box office clerk. Speak in English, level {{level}}.
Context: The learner wants to buy movie tickets.
Your role: Help choose movie, time, seats, and sell tickets and snacks.
Gently correct mistakes (max 1 per response). Be natural and conversational.`
          : `Vous êtes un employé de guichet de cinéma aimable et patient. Parlez en français, niveau {{level}}.
Contexte : L'apprenant veut acheter des billets de cinéma.
Votre rôle : Aider à choisir le film, l'horaire, les places, et vendre billets et snacks.
Corrigez doucement (max 1 erreur par réponse). Soyez naturel et conversationnel.`,
      initialMessage: isGerman
        ? 'Guten Tag! Willkommen im Kino. Welchen Film möchten Sie heute sehen? Wir haben Action, Komödie, Horror, Animation...'
        : isEnglish
          ? 'Good afternoon! Welcome to the cinema. What movie would you like to see today? We have action, comedy, horror, animation...'
          : 'Bonjour ! Bienvenue au cinéma. Quel film aimeriez-vous voir aujourd\'hui ? Nous avons action, comédie, horreur, animation...',
      vocabulary: isGerman
        ? [
            { word: 'die Karte', translation: 'la entrada / el boleto', example: 'Ich möchte zwei Karten für den 20-Uhr-Film.' },
            { word: 'die Kasse', translation: 'la taquilla', example: 'Die Kasse ist bis 22 Uhr geöffnet.' },
            { word: 'der Platz', translation: 'el asiento', example: 'Ich möchte Plätze in der Mitte, Reihe 10.' },
            { word: 'das Popcorn', translation: 'las palomitas de maíz', example: 'Kann ich eine große Popcorn haben, bitte?' },
            { word: 'das Getränk', translation: 'el refresco / la bebida', example: 'Ein mittleres Getränk dazu, bitte.' },
            { word: 'das Programm', translation: 'la cartelera', example: 'Schauen Sie ins Programm für die Zeiten.' },
            { word: 'die Vorstellung', translation: 'la sesión / la función', example: 'Die nächste Vorstellung ist um 20:30.' },
            { word: 'mit Untertiteln', translation: 'subtitulada', example: 'Ist der Film in Originalversion mit Untertiteln?' },
          ]
        : isEnglish
          ? [
            { word: 'the ticket', translation: 'la entrada / el boleto', example: 'I\'d like two tickets for the 8 PM movie.' },
            { word: 'the box office', translation: 'la taquilla', example: 'The box office is open until 10 PM.' },
            { word: 'the seat', translation: 'el asiento', example: 'I prefer seats in the middle, row 10.' },
            { word: 'the popcorn', translation: 'las palomitas de maíz', example: 'Can I have a large popcorn, please?' },
            { word: 'the drink', translation: 'el refresco / la bebida', example: 'A medium drink to go with it, please.' },
            { word: 'the schedule', translation: 'la cartelera', example: 'Check the schedule for show times.' },
            { word: 'the screening', translation: 'la sesión / la función', example: 'The next screening is at 8:30.' },
            { word: 'subtitled', translation: 'subtitulada', example: 'Is the movie in original version with subtitles?' },
          ]
          : [
            { word: 'le billet', translation: 'la entrada / el boleto', example: 'Je voudrais deux billets pour le film de 20h.' },
            { word: 'la caisse', translation: 'la taquilla', example: 'La caisse est ouverte jusqu\'à 22h.' },
            { word: 'la place', translation: 'el asiento', example: 'Je préfère des places au milieu, rang 10.' },
            { word: 'le pop-corn', translation: 'las palomitas de maíz', example: 'Puis-je avoir un grand pop-corn, s\'il vous plaît ?' },
            { word: 'la boisson', translation: 'el refresco / la bebida', example: 'Une boisson moyenne pour accompagner.' },
            { word: 'le programme', translation: 'la cartelera', example: 'Regardez le programme pour les horaires.' },
            { word: 'la séance', translation: 'la sesión / la función', example: 'La prochaine séance est à 20h30.' },
            { word: 'sous-titré', translation: 'subtitulada', example: 'Le film est-il en version originale sous-titrée ?' },
          ],
    },
    office: {
      title: isGerman ? 'Im Büro' : isEnglish ? 'At the Office' : 'Au Bureau',
      description: isGerman ? 'Meetings, E-Mails, Projekte präsentieren, Kaffee mit Kollegen' : isEnglish ? 'Meetings, emails, present projects, coffee with colleagues' : 'Réunions, emails, présenter projets, café avec collègues',
      context: isGerman ? 'Du bist in einem Büro. Es ist dein erster Tag oder du hast ein wichtiges Meeting.' : isEnglish ? 'You are in an office. It\'s your first day or you have an important meeting.' : 'Vous êtes dans un bureau. C\'est votre premier jour ou vous avez une réunion importante.',
      systemPrompt: isGerman
        ? `Du bist ein freundlicher, professioneller Kollege. Sprich auf Deutsch, Niveau {{level}}.
Kontext: Der Lernende ist ein Kollege im Büro.
Deine Rolle: Helfen bei Meetings, E-Mails, Präsentationen, Kaffeepause, Büro-Jargon.
Korrigiere sanft (max. 1 Fehler pro Antwort). Nutze professionelle, aber zugängliche Sprache.`
        : isEnglish
          ? `You are a friendly, professional colleague. Speak in English, level {{level}}.
Context: The learner is a colleague at the office.
Your role: Help with meetings, emails, presentations, coffee break, office jargon.
Gently correct mistakes (max 1 per response). Use professional but accessible language.`
          : `Vous êtes un collègue aimable et professionnel. Parlez en français, niveau {{level}}.
Contexte : L'apprenant est un collègue au bureau.
Votre rôle : Aider avec réunions, emails, présentations, pause café, jargon de bureau.
Corrigez doucement (max 1 erreur par réponse). Utilisez un langage professionnel mais accessible.`,
      initialMessage: isGerman
        ? 'Hallo! Willkommen im Team. Ist das dein erster Tag? Ich zeig dir alles: Besprechungsraum, Kaffeemaschine, mein Schreibtisch...'
        : isEnglish
          ? 'Hello! Welcome to the team. Is it your first day? Let me show you around: meeting room, coffee machine, my desk...'
          : 'Bonjour ! Bienvenue dans l\'équipe. C\'est votre premier jour ? Je vous montre tout : salle de réunion, machine à café, mon bureau...',
      vocabulary: isGerman
        ? [
            { word: 'das Meeting', translation: 'la reunión', example: 'Wir haben ein Meeting um 10 Uhr.' },
            { word: 'das Projekt', translation: 'el proyecto', example: 'Dieses Projekt ist sehr wichtig für den Kunden.' },
            { word: 'die Frist', translation: 'el plazo / la fecha límite', example: 'Die Abgabefrist ist Freitag.' },
            { word: 'der Kollege', translation: 'el compañero de trabajo', example: 'Mein Kollege hilft mir mit dem Bericht.' },
            { word: 'der Chef', translation: 'el jefe / la jefa', example: 'Der Chef will den Fortschritt morgen sehen.' },
            { word: 'der Bericht', translation: 'el informe / el reporte', example: 'Ich habe den Monatsbericht gestern fertig gemacht.' },
            { word: 'die Pause', translation: 'la pausa / el descanso', example: 'Lass uns eine Kaffeepause machen.' },
            { word: 'der Videoanruf', translation: 'la videollamada', example: 'Der Videoanruf mit dem Kunden ist um 15 Uhr.' },
          ]
        : isEnglish
          ? [
            { word: 'the meeting', translation: 'la reunión', example: 'We have a meeting at 10 AM.' },
            { word: 'the project', translation: 'el proyecto', example: 'This project is very important for the client.' },
            { word: 'the deadline', translation: 'el plazo / la fecha límite', example: 'The deadline is Friday.' },
            { word: 'the colleague', translation: 'el compañero de trabajo', example: 'My colleague helps me with the report.' },
            { word: 'the boss', translation: 'el jefe / la jefa', example: 'The boss wants to see progress tomorrow.' },
            { word: 'the report', translation: 'el informe / el reporte', example: 'I finished the monthly report yesterday.' },
            { word: 'the break', translation: 'la pausa / el descanso', example: 'Let\'s take a coffee break.' },
            { word: 'the video call', translation: 'la videollamada', example: 'The video call with the client is at 3 PM.' },
          ]
          : [
            { word: 'la réunion', translation: 'la reunión', example: 'Nous avons une réunion à 10h.' },
            { word: 'le projet', translation: 'el proyecto', example: 'Ce projet est très important pour le client.' },
            { word: 'l\'échéance', translation: 'el plazo / la fecha límite', example: 'L\'échéance est vendredi.' },
            { word: 'le collègue', translation: 'el compañero de trabajo', example: 'Mon collègue m\'aide avec le rapport.' },
            { word: 'le chef', translation: 'el jefe / la jefa', example: 'Le chef veut voir l\'avancement demain.' },
            { word: 'le rapport', translation: 'el informe / el reporte', example: 'J\'ai fini le rapport mensuel hier.' },
            { word: 'la pause', translation: 'la pausa / el descanso', example: 'Faisons une pause café.' },
            { word: 'l\'appel vidéo', translation: 'la videollamada', example: 'L\'appel vidéo avec le client est à 15h.' },
          ],
    },
    restaurant: {
      title: isGerman ? 'Im Restaurant' : isEnglish ? 'At the Restaurant' : 'Au Restaurant',
      description: isGerman ? 'Tisch reservieren, Essen bestellen, Allergien, zahlen' : isEnglish ? 'Reserve table, order food, allergies, pay bill' : 'Réserver table, commander, allergies, payer',
      context: isGerman ? 'Du bist in einem Restaurant. Du möchtest reservieren, essen bestellen und zahlen.' : isEnglish ? 'You are at a restaurant. You want to reserve, order food, and pay.' : 'Vous êtes au restaurant. Vous voulez réserver, commander et payer.',
      systemPrompt: isGerman
        ? `Du bist ein professioneller, aufmerksamer Kellner. Sprich auf Deutsch, Niveau {{level}}.
Kontext: Der Lernende ist ein Gast im Restaurant.
Deine Rolle: Reservierung nehmen, Karte zeigen, Bestellung aufnehmen, nach Allergien fragen, Rechnung bringen.
Korrigiere sanft (max. 1 Fehler pro Antwort). Sei höflich und zuvorkommend.`
        : isEnglish
          ? `You are a professional, attentive waiter. Speak in English, level {{level}}.
Context: The learner is a customer at a restaurant.
Your role: Take reservation, show menu, take order, ask about allergies, bring bill.
Gently correct mistakes (max 1 per response). Be polite and helpful.`
          : `Vous êtes un serveur professionnel et attentionné. Parlez en français, niveau {{level}}.
Contexte : L'apprenant est un client au restaurant.
Votre rôle : Prendre la réservation, montrer la carte, prendre la commande, demander les allergies, apporter l'addition.
Corrigez doucement (max 1 erreur par réponse). Soyez poli et serviable.`,
      initialMessage: isGerman
        ? 'Guten Abend! Willkommen in unserem Restaurant. Haben Sie eine Reservierung oder soll ich einen Tisch suchen?'
        : isEnglish
          ? 'Good evening! Welcome to our restaurant. Do you have a reservation or shall I find you a table?'
          : 'Bonsoir ! Bienvenue dans notre restaurant. Avez-vous une réservation ou puis-je vous trouver une table ?',
      vocabulary: isGerman
        ? [
            { word: 'die Reservierung', translation: 'la reserva', example: 'Ich habe eine Reservierung auf Müller für 20 Uhr.' },
            { word: 'die Speisekarte', translation: 'la carta / el menú', example: 'Könnten Sie uns die Speisekarte bringen, bitte?' },
            { word: 'das Hauptgericht', translation: 'el plato principal', example: 'Als Hauptgericht nehme ich den Lachs.' },
            { word: 'die Vorspeise', translation: 'el entrante / la entrada', example: 'Zum Start nehme ich einen gemischten Salat.' },
            { word: 'die Rechnung', translation: 'la cuenta', example: 'Könnten Sie uns die Rechnung bringen, bitte?' },
            { word: 'das Trinkgeld', translation: 'la propina', example: 'Der Service ist inklusive, kein Trinkgeld nötig.' },
            { word: 'allergisch', translation: 'alérgico/a', example: 'Ich bin allergisch gegen Nüsse.' },
            { word: 'das Dessert', translation: 'el postre', example: 'Zum Dessert hätte ich gerne den Schokoladenkuchen.' },
          ]
        : isEnglish
          ? [
            { word: 'the reservation', translation: 'la reserva', example: 'I have a reservation under Smith for 8 PM.' },
            { word: 'the menu', translation: 'la carta / el menú', example: 'Could you bring us the menu, please?' },
            { word: 'the main course', translation: 'el plato principal', example: 'For the main course, I\'ll have the salmon.' },
            { word: 'the starter', translation: 'el entrante / la entrada', example: 'To start, I\'ll have a mixed salad.' },
            { word: 'the bill', translation: 'la cuenta', example: 'Could you bring us the bill, please?' },
            { word: 'the tip', translation: 'la propina', example: 'Service is included, no tip needed.' },
            { word: 'allergic', translation: 'alérgico/a', example: 'I\'m allergic to nuts.' },
            { word: 'the dessert', translation: 'el postre', example: 'For dessert, I\'d like the chocolate cake.' },
          ]
          : [
            { word: 'la réservation', translation: 'la reserva', example: 'J\'ai une réservation au nom de Dupont pour 20h.' },
            { word: 'la carte', translation: 'la carta / el menú', example: 'Pourriez-vous nous apporter la carte, s\'il vous plaît ?' },
            { word: 'le plat principal', translation: 'el plato principal', example: 'En plat principal, je prendrai le saumon.' },
            { word: 'l\'entrée', translation: 'el entrante / la entrada', example: 'Pour commencer, une salade mixte.' },
            { word: 'l\'addition', translation: 'la cuenta', example: 'Pourriez-vous nous apporter l\'addition, s\'il vous plaît ?' },
            { word: 'le pourboire', translation: 'la propina', example: 'Le service est compris, pas de pourboire nécessaire.' },
            { word: 'allergique', translation: 'alérgico/a', example: 'Je suis allergique aux noix.' },
            { word: 'le dessert', translation: 'el postre', example: 'En dessert, je voudrais le gâteau au chocolat.' },
          ],
    },
    airport: {
      title: isGerman ? 'Am Flughafen' : isEnglish ? 'At the Airport' : 'À l\'Aéroport',
      description: isGerman ? 'Check-in, Sicherheitskontrolle, Gate, Gepäck' : isEnglish ? 'Check-in, security, gate, luggage' : 'Enregistrement, sécurité, porte, bagages',
      context: isGerman ? 'Du bist am Flughafen. Du musst einchecken, durch die Sicherheit und dein Gate finden.' : isEnglish ? 'You are at the airport. You need to check in, go through security, and find your gate.' : 'Vous êtes à l\'aéroport. Vous devez enregistrer, passer la sécurité et trouver votre porte.',
      systemPrompt: isGerman
        ? `Du bist ein Check-in / Sicherheits- / Informations-Mitarbeiter am Flughafen. Sprich auf Deutsch, Niveau {{level}}.
Kontext: Der Lernende ist am Flughafen und braucht Hilfe bei Check-in, Security, Boarding.
Deine Rolle: Pass/Bordingkarte verlangen, nach Gepäck fragen, Sicherheitsanweisungen geben, Gate nennen.
Korrigiere sanft (max. 1 Fehler pro Antwort). Sei klar und direkt wie am echten Flughafen.`
        : isEnglish
          ? `You are a check-in / security / info agent at the airport. Speak in English, level {{level}}.
Context: The learner is at the airport and needs help with check-in, security, boarding.
Your role: Ask for passport/boarding pass, ask about luggage, give security instructions, indicate gate.
Gently correct mistakes (max 1 per response). Be clear and direct like at a real airport.`
          : `Vous êtes un agent d'enregistrement / sécurité / information à l'aéroport. Parlez en français, niveau {{level}}.
Contexte : L'apprenant est à l'aéroport et a besoin d'aide pour l'enregistrement, la sécurité, l'embarquement.
Votre rôle : Demander passeport/carte d'embarquement, demander les bagages, donner instructions de sécurité, indiquer la porte.
Corrigez doucement (max 1 erreur par réponse). Soyez clair et direct comme dans un vrai aéroport.`,
      initialMessage: isGerman
        ? 'Guten Tag. Reisepass und Bordkarte, bitte. Möchten Sie Gepäck aufgeben?'
        : isEnglish
          ? 'Good morning. Passport and boarding pass, please. Are you checking any bags?'
          : 'Bonjour. Passeport et carte d\'embarquement, s\'il vous plaît. Enregistrez-vous des bagages ?',
      vocabulary: isGerman
        ? [
            { word: 'die Bordkarte', translation: 'la tarjeta de embarque', example: 'Hier ist meine Bordkarte.' },
            { word: 'aufgeben', translation: 'facturar (equipaje)', example: 'Ich möchte diesen Koffer aufgeben.' },
            { word: 'der Koffer', translation: 'la maleta / el equipaje', example: 'Mein Koffer wiegt 20 Kilo.' },
            { word: 'die Sicherheitskontrolle', translation: 'el control de seguridad', example: 'Wo ist die Sicherheitskontrolle?' },
            { word: 'das Gate', translation: 'la puerta de embarque', example: 'Das Gate ist B12.' },
            { word: 'der Reisepass', translation: 'el pasaporte', example: 'Hier ist mein Reisepass.' },
            { word: 'die Verspätung', translation: 'el retraso', example: 'Unser Flug hat 30 Minuten Verspätung.' },
            { word: 'das Gepäckband', translation: 'la cinta de equipajes', example: 'Holen Sie Ihren Koffer am Band 3 ab.' },
          ]
        : isEnglish
          ? [
            { word: 'boarding pass', translation: 'la tarjeta de embarque', example: 'Here is my boarding pass.' },
            { word: 'check in', translation: 'facturar (equipaje)', example: 'I want to check in this suitcase.' },
            { word: 'suitcase', translation: 'la maleta / el equipaje', example: 'My suitcase weighs 20 kilos.' },
            { word: 'security check', translation: 'el control de seguridad', example: 'Where is the security check?' },
            { word: 'the gate', translation: 'la puerta de embarque', example: 'The gate is B12.' },
            { word: 'passport', translation: 'el pasaporte', example: 'Here is my passport.' },
            { word: 'delay', translation: 'el retraso', example: 'Our flight has a 30-minute delay.' },
            { word: 'baggage claim', translation: 'la cinta de equipajes', example: 'Collect your suitcase at carousel 3.' },
          ]
          : [
            { word: 'la carte d\'embarquement', translation: 'la tarjeta de embarque', example: 'Voici ma carte d\'embarquement.' },
            { word: 'enregistrer', translation: 'facturar (equipaje)', example: 'Je veux enregistrer cette valise.' },
            { word: 'la valise', translation: 'la maleta / el equipaje', example: 'Ma valise pèse 20 kilos.' },
            { word: 'le contrôle de sécurité', translation: 'el control de seguridad', example: 'Où est le contrôle de sécurité ?' },
            { word: 'la porte d\'embarquement', translation: 'la puerta de embarque', example: 'La porte d\'embarquement est B12.' },
            { word: 'le passeport', translation: 'el pasaporte', example: 'Voici mon passeport.' },
            { word: 'le retard', translation: 'el retraso', example: 'Notre vol a 30 minutes de retard.' },
            { word: 'le tapis à bagages', translation: 'la cinta de equipajes', example: 'Récupérez votre valise au tapis 3.' },
          ],
    },
    hotel: {
      title: isGerman ? 'Im Hotel' : isEnglish ? 'At the Hotel' : 'À l\'Hôtel',
      description: isGerman ? 'Check-in, Services, WLAN, Check-out, Reklamationen' : isEnglish ? 'Check-in, services, WiFi, check-out, complaints' : 'Check-in, services, WiFi, check-out, réclamations',
      context: isGerman ? 'Du bist an der Hotelrezeption. Du machst Check-in, fragst nach Infos, machst Check-out.' : isEnglish ? 'You are at the hotel reception. You check in, ask for info, check out.' : 'Vous êtes à la réception de l\'hôtel. Vous faites le check-in, demandez des infos, faites le check-out.',
      systemPrompt: isGerman
        ? `Du bist ein freundlicher, professioneller Hotelrezeptionist. Sprich auf Deutsch, Niveau {{level}}.
Kontext: Der Lernende ist ein Gast, der eincheckt, Services fragt oder auscheckt.
Deine Rolle: Einchecken, Schlüssel/WLAN geben, Services erklären, Probleme lösen, Auschecken.
Korrigiere sanft (max. 1 Fehler pro Antwort). Sei gastfreundlich und hilfsbereit.`
        : isEnglish
          ? `You are a friendly, professional hotel receptionist. Speak in English, level {{level}}.
Context: The learner is a guest checking in, asking for services, or checking out.
Your role: Check in, give key/WiFi, explain services, solve problems, check out.
Gently correct mistakes (max 1 per response). Be hospitable and helpful.`
          : `Vous êtes un réceptionniste d'hôtel aimable et professionnel. Parlez en français, niveau {{level}}.
Contexte : L'apprenant est un client qui fait le check-in, demande des services, ou fait le check-out.
Votre rôle : Enregistrer l'arrivée, donner clé/WiFi, expliquer services, résoudre problèmes, enregistrer le départ.
Corrigez doucement (max 1 erreur par réponse). Soyez hospitalier et serviable.`,
      initialMessage: isGerman
        ? 'Willkommen in unserem Hotel! Haben Sie eine Reservierung? Wie lautet der Name?'
        : isEnglish
          ? 'Welcome to our hotel! Do you have a reservation? Under what name?'
          : 'Bienvenue dans notre hôtel ! Avez-vous une réservation ? Sous quel nom ?',
      vocabulary: isGerman
        ? [
            { word: 'der Check-in', translation: 'el check-in / la entrada', example: 'Der Check-in ist ab 15 Uhr.' },
            { word: 'der Check-out', translation: 'el check-out / la salida', example: 'Der Check-out ist vor 12 Uhr mittags.' },
            { word: 'der Schlüssel', translation: 'la llave / la tarjeta magnética', example: 'Hier ist Ihre Karte für Zimmer 305.' },
            { word: 'die Rezeption', translation: 'la recepción', example: 'Die Rezeption ist 24 Stunden geöffnet.' },
            { word: 'das WLAN', translation: 'el wifi', example: 'Das WLAN-Passwort steht auf der Karte.' },
            { word: 'das Frühstück', translation: 'el desayuno', example: 'Das Frühstück wird von 7 bis 10 serviert.' },
            { word: 'das Zimmer', translation: 'la habitación', example: 'Mein Zimmer hat Meerblick.' },
            { word: 'die Beschwerde', translation: 'la queja / la reclamación', example: 'Ich möchte mich beschweren: die Klimaanlage funktioniert nicht.' },
          ]
        : isEnglish
          ? [
            { word: 'check-in', translation: 'el check-in / la entrada', example: 'Check-in is from 3 PM.' },
            { word: 'check-out', translation: 'el check-out / la salida', example: 'Check-out is before 12 PM.' },
            { word: 'the key', translation: 'la llave / la tarjeta magnética', example: 'Here is your key card for room 305.' },
            { word: 'the reception', translation: 'la recepción', example: 'The reception is open 24 hours.' },
            { word: 'the WiFi', translation: 'el wifi', example: 'The WiFi password is on the card.' },
            { word: 'breakfast', translation: 'el desayuno', example: 'Breakfast is served from 7 to 10.' },
            { word: 'the room', translation: 'la habitación', example: 'My room has a sea view.' },
            { word: 'the complaint', translation: 'la queja / la reclamación', example: 'I want to complain: the AC doesn\'t work.' },
          ]
          : [
            { word: 'le check-in', translation: 'el check-in / la entrada', example: 'Le check-in est à partir de 15h.' },
            { word: 'le check-out', translation: 'el check-out / la salida', example: 'Le check-out est avant 12h.' },
            { word: 'la clé', translation: 'la llave / la tarjeta magnética', example: 'Voici votre carte pour la chambre 305.' },
            { word: 'la réception', translation: 'la recepción', example: 'La réception est ouverte 24h/24.' },
            { word: 'le WiFi', translation: 'el wifi', example: 'Le mot de passe WiFi est sur la carte.' },
            { word: 'le petit-déjeuner', translation: 'el desayuno', example: 'Le petit-déjeuner est servi de 7h à 10h.' },
            { word: 'la chambre', translation: 'la habitación', example: 'Ma chambre a vue sur la mer.' },
            { word: 'la réclamation', translation: 'la queja / la reclamación', example: 'Je veux faire une réclamation : la clim ne marche pas.' },
          ],
    },
    shopping: {
      title: isGerman ? 'Einkaufen' : isEnglish ? 'Shopping' : 'Faire les Courses',
      description: isGerman ? 'Kleidung, Größen, Umkleide, Bezahlen, Rückgabe, Märkte' : isEnglish ? 'Clothes, sizes, fitting room, payment, returns, markets' : 'Vêtements, tailles, cabine, paiement, retours, marchés',
      context: isGerman ? 'Du bist in einem Geschäft oder Markt. Du suchst Kleidung, fragst nach Größen, zahlst oder gibst zurück.' : isEnglish ? 'You are in a store or market. Looking for clothes, asking sizes, paying or returning.' : 'Vous êtes dans un magasin ou marché. Vous cherchez des vêtements, demandez les tailles, payez ou retournez.',
      systemPrompt: isGerman
        ? `Du bist ein freundlicher, geduldiger Verkäufer. Sprich auf Deutsch, Niveau {{level}}.
Kontext: Der Lernende kauft Kleidung oder ist auf einem Markt.
Deine Rolle: Helfen bei Größen, Farben, Umkleidekabinen, Bezahlen, Rückgaben.
Korrigiere sanft (max. 1 Fehler pro Antwort). Sei hilfsbereit und verkaufsorientiert.`
        : isEnglish
          ? `You are a friendly, patient shop assistant. Speak in English, level {{level}}.
Context: The learner is shopping for clothes or at a market.
Your role: Help find sizes, colors, fitting rooms, process payment, handle returns.
Gently correct mistakes (max 1 per response). Be helpful and service-oriented.`
          : `Vous êtes un vendeur aimable et patient. Parlez en français, niveau {{level}}.
Contexte : L'apprenant achète des vêtements ou est au marché.
Votre rôle : Aider à trouver tailles, couleurs, cabines, traiter paiement, gérer retours.
Corrigez doucement (max 1 erreur par réponse). Soyez serviable et commercial.`,
      initialMessage: isGerman
        ? 'Hallo! Kann ich Ihnen helfen? Suchen Sie etwas Bestimmtes oder schauen Sie nur?'
        : isEnglish
          ? 'Hello! Can I help you? Looking for something specific or just browsing?'
          : 'Bonjour ! Puis-je vous aider ? Vous cherchez quelque chose de précis ou vous regardez simplement ?',
      vocabulary: isGerman
        ? [
            { word: 'die Größe', translation: 'la talla', example: 'Welche Größe tragen Sie? Ich trage M.' },
            { word: 'die Umkleide', translation: 'el probador', example: 'Die Umkleiden sind hinten rechts.' },
            { word: 'anprobieren', translation: 'probarse (ropa)', example: 'Darf ich das anprobieren, bitte?' },
            { word: 'der Preis', translation: 'el precio', example: 'Was kostet dieses T-Shirt?' },
            { word: 'der Rabatt', translation: 'la rebaja / el descuento', example: 'Diese Jacke hat 30% Rabatt.' },
            { word: 'bezahlen', translation: 'pagar', example: 'Kann ich mit Karte bezahlen?' },
            { word: 'der Bon', translation: 'el recibo / el ticket', example: 'Behalten Sie den Bon für Umtausch.' },
            { word: 'zurückgeben', translation: 'devolver / cambiar', example: 'Ich möchte das zurückgeben, es ist zu groß.' },
          ]
        : isEnglish
          ? [
            { word: 'the size', translation: 'la talla', example: 'What size do you wear? I wear M.' },
            { word: 'the fitting room', translation: 'el probador', example: 'The fitting rooms are at the back on the right.' },
            { word: 'try on', translation: 'probarse (ropa)', example: 'Can I try this on, please?' },
            { word: 'the price', translation: 'el precio', example: 'How much is this t-shirt?' },
            { word: 'the discount', translation: 'la rebaja / el descuento', example: 'This jacket has 30% off.' },
            { word: 'pay', translation: 'pagar', example: 'Can I pay by card?' },
            { word: 'the receipt', translation: 'el recibo / el ticket', example: 'Keep the receipt for exchanges.' },
            { word: 'return', translation: 'devolver / cambiar', example: 'I want to return this, it\'s too big.' },
          ]
          : [
            { word: 'la taille', translation: 'la talla', example: 'Quelle taille portez-vous ? Je porte du M.' },
            { word: 'la cabine', translation: 'el probador', example: 'Les cabines sont au fond à droite.' },
            { word: 'essayer', translation: 'probarse (ropa)', example: 'Puis-je essayer ceci, s\'il vous plaît ?' },
            { word: 'le prix', translation: 'el precio', example: 'Combien coûte ce t-shirt ?' },
            { word: 'la réduction', translation: 'la rebaja / el descuento', example: 'Cette veste a 30% de réduction.' },
            { word: 'payer', translation: 'pagar', example: 'Puis-je payer par carte ?' },
            { word: 'le ticket', translation: 'el recibo / el ticket', example: 'Gardez le ticket pour échange.' },
            { word: 'retourner', translation: 'devolver / cambiar', example: 'Je veux retourner ceci, c\'est trop grand.' },
          ],
    },
  };

  return [
    { ...t.cinema, id: 'cinema', icon: '🎬' },
    { ...t.office, id: 'office', icon: '🏢' },
    { ...t.restaurant, id: 'restaurant', icon: '🍽️' },
    { ...t.airport, id: 'airport', icon: '✈️' },
    { ...t.hotel, id: 'hotel', icon: '🏨' },
    { ...t.shopping, id: 'shopping', icon: '🛍️' },
  ];
}

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  text: string;
  timestamp: Date;
  translation?: string;
  correction?: string;
}

interface VoiceState {
  isSpeaking: boolean;
  isListening: boolean;
  speakText: (text: string) => void;
  stopSpeech: () => void;
  startListening: (onResult: (text: string) => void) => void;
  stopListening: () => void;
}

interface RolePlayProps {
  profile: UserProfile;
  voiceEnabled: boolean;
  voice: VoiceState;
}

export default function RolePlay({ profile, voiceEnabled, voice }: RolePlayProps) {
  const scenarios = getScenariosForLanguage(profile.targetLanguage);
  const [activeScenario, setActiveScenario] = useState<RolePlayScenario | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showVocabulary, setShowVocabulary] = useState(false);
  const [sessionActive, setSessionActive] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [micPermission, setMicPermission] = useState<'prompt' | 'granted' | 'denied'>('prompt');

  const fallback = (
    <div className="flex-1 flex flex-col bg-white border border-stone-200 rounded-2xl shadow-xs overflow-hidden h-[calc(100vh-8rem)]">
      <div className="flex-1 flex items-center justify-center p-6 text-center">
        <div className="space-y-4">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
          <h3 className="text-lg font-semibold text-stone-800">Error al cargar Role Play</h3>
          <p className="text-sm text-stone-500">Ha ocurrido un error inesperado. Intenta cambiar de pestaña y volver.</p>
          <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm hover:bg-emerald-700">
            Recargar aplicación
          </button>
        </div>
      </div>
    </div>
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const startScenario = useCallback((scenario: RolePlayScenario) => {
    const filledSystemPrompt = scenario.systemPrompt
      .replace('{{language}}', profile.targetLanguage)
      .replace('{{level}}', profile.level);
    const filledInitialMessage = scenario.initialMessage
      .replace('{{language}}', profile.targetLanguage)
      .replace('{{level}}', profile.level);

    setActiveScenario(scenario);
    setMessages([
      { id: `sys-${Date.now()}`, role: 'system', text: filledSystemPrompt, timestamp: new Date() },
      { id: `init-${Date.now()}`, role: 'assistant', text: filledInitialMessage, timestamp: new Date() },
    ]);
    setSessionActive(true);
    if (voiceEnabled) voice.speakText(filledInitialMessage);
  }, [profile.targetLanguage, profile.level, voiceEnabled, voice]);

  const endScenario = useCallback(() => {
    setActiveScenario(null);
    setMessages([]);
    setSessionActive(false);
    voice.stopSpeech();
    voice.stopListening();
  }, [voice]);

  const sendMessage = async (textToSend?: string) => {
    if (!activeScenario || !voiceEnabled) return;
    const text = textToSend || inputText;
    if (!text.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(), role: 'user', text, timestamp: new Date()
    };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setLoading(true);

    try {
      const historyText = messages
        .filter(m => m.role !== 'system')
        .map(m => `${m.role}: ${m.text}`)
        .join('\n');

      const systemPrompt = activeScenario.systemPrompt
        .replace('{{language}}', profile.targetLanguage)
        .replace('{{level}}', profile.level);

      const prompt = `Contexto: ${activeScenario.context}\n\nConversación:\n${historyText}\n\nUsuario: ${text}\nAsistente:`;

      const res = await fetch('/api/roleplay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: text, 
          history: messages.filter(m => m.role !== 'system'), 
          profile, 
          systemPrompt,
          scenarioContext: activeScenario.context 
        }),
      });

      const textResponse = await res.text();
      if (!res.ok) throw new Error(`Server error (${res.status}): ${textResponse}`);
      const data = JSON.parse(textResponse);
      if (data.error) throw new Error(data.error);

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: data.reply,
        translation: data.translation,
        correction: data.gentleCorrection,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, assistantMsg]);
      if (voiceEnabled) voice.speakText(data.reply);
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: 'Lo siento, hubo un problema. ¿Podrías repetirlo?',
        timestamp: new Date()
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleMicToggle = () => {
    if (voice.isListening) {
      voice.stopListening();
      setIsRecording(false);
    } else {
      voice.startListening((transcript) => {
        setIsRecording(false);
        sendMessage(transcript);
      });
      setIsRecording(true);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!activeScenario) {
    return (
      <ErrorBoundary fallback={fallback}>
        <div className="flex-1 flex flex-col bg-white border border-stone-200 rounded-2xl shadow-xs overflow-hidden h-[calc(100vh-8rem)]">
        <div className="bg-stone-50 border-b border-stone-200 px-6 py-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-800 font-bold text-xl">🎭</div>
            <div>
              <h2 className="text-lg font-semibold text-stone-800">Role Play - Práctica Inmersiva</h2>
              <p className="text-xs text-stone-500">Elige un escenario y practica conversaciones reales con IA de voz</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {scenarios.map(scenario => (
            <button
              key={scenario.id}
              onClick={() => startScenario(scenario)}
              className="group p-6 border-2 border-stone-200 rounded-2xl hover:border-emerald-400 hover:bg-emerald-50 transition-all text-left"
            >
              <div className="text-4xl mb-3">{scenario.icon}</div>
              <h3 className="text-lg font-bold text-stone-800 group-hover:text-emerald-700">{scenario.title}</h3>
              <p className="text-xs text-stone-500 mt-1">{scenario.description}</p>
              <div className="mt-3 pt-3 border-t border-stone-100">
                <span className="text-[10px] text-stone-400 flex items-center space-x-1">
                  <MessageSquare className="w-3 h-3" /> Chat + Voz en tiempo real
                </span>
              </div>
            </button>
          ))}
        </div>

        <div className="px-6 pb-6 border-t border-stone-200 bg-stone-50">
          <div className="text-center text-xs text-stone-500">
            <p>La IA actuará como personaje del escenario (camarero, recepcionista, compañero...)</p>
            <p className="mt-1">Corrección suave automática • Voz en tiempo real • Vocabulario contextual</p>
          </div>
        </div>
      </div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary fallback={fallback}>
      <div className="flex-1 flex flex-col bg-white border border-stone-200 rounded-2xl shadow-xs overflow-hidden h-[calc(100vh-8rem)]">
      <div className="bg-stone-50 border-b border-stone-200 px-4 py-3 flex items-center justify-between">
        <button onClick={endScenario} className="p-2 hover:bg-stone-200 rounded-xl transition-colors">
          <ChevronLeft className="w-5 h-5 text-stone-500" />
        </button>
        <div className="flex items-center space-x-3 flex-1">
          <div className="text-2xl">{activeScenario.icon}</div>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-stone-800 truncate">{activeScenario.title}</h2>
            <p className="text-[10px] text-stone-500 truncate">{activeScenario.context}</p>
          </div>
        </div>
        <div className="flex items-center space-x-1">
          <button onClick={() => setShowVocabulary(!showVocabulary)} className="p-2 hover:bg-stone-200 rounded-xl transition-colors">
            <span className="text-xs font-medium text-stone-600">Vocab ({activeScenario.vocabulary.length})</span>
          </button>
          <button onClick={endScenario} className="p-2 hover:bg-rose-100 text-rose-600 rounded-xl transition-colors" title="Terminar sesión">
            <StopCircle className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-stone-50/50">
        {messages.filter(m => m.role !== 'system').map((msg, idx) => (
          <div key={msg.id} className={`flex animate-slide-up ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`} style={{ animationDelay: `${idx * 0.05}s` }}>
            <div className={`max-w-xl rounded-2xl px-4 py-3 space-y-2 text-sm shadow-xs ${msg.role === 'user' ? 'bg-emerald-600 text-white rounded-br-xs' : 'bg-white text-stone-800 border border-stone-200 rounded-bl-xs'}`}>
              <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
              {msg.translation && (
                <div className="text-xs bg-stone-100 text-stone-600 p-2 rounded-lg border border-stone-200">
                  <span className="font-semibold text-stone-700">Traducción:</span> {msg.translation}
                </div>
              )}
              {msg.correction && (
                <div className="text-xs bg-emerald-50 text-emerald-900 p-2 rounded-lg border border-emerald-200 flex items-start space-x-1.5">
                  <span className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0">✨</span>
                  <div><span className="font-semibold">Corrección:</span> {msg.correction}</div>
                </div>
              )}
              <div className={`text-[10px] text-right ${msg.role === 'user' ? 'text-emerald-100' : 'text-stone-400'}`}>
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start animate-fade-in">
            <div className="bg-white border border-stone-200 rounded-2xl px-5 py-4 rounded-bl-xs flex items-center space-x-3 text-stone-500 text-sm">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-emerald-600 rounded-full animate-typing-dot"></div>
                <div className="w-2 h-2 bg-emerald-600 rounded-full animate-typing-dot"></div>
                <div className="w-2 h-2 bg-emerald-600 rounded-full animate-typing-dot"></div>
              </div>
              <span className="text-xs text-stone-400">Escribiendo...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {showVocabulary && activeScenario && (
        <div className="border-t border-stone-200 bg-stone-50 p-4 max-h-64 overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-emerald-900">Vocabulario clave - {activeScenario.title}</h3>
            <button onClick={() => setShowVocabulary(false)} className="p-1 hover:bg-stone-200 rounded-lg">
              <X className="w-4 h-4 text-stone-500" />
            </button>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {activeScenario.vocabulary.map((v, i) => (
              <div key={i} className="bg-white border border-stone-200 rounded-xl p-3 text-xs">
                <div className="font-semibold text-stone-800">{v.word}</div>
                <div className="text-stone-600">{v.translation}</div>
                <div className="text-stone-400 mt-1 italic">«{v.example}»</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="p-4 bg-white border-t border-stone-200 flex items-center space-x-3">
        <button
          onClick={handleMicToggle}
          disabled={loading}
          className={`p-3 rounded-xl transition-all flex items-center justify-center ${voice.isListening ? 'bg-rose-500 text-white animate-pulse' : voiceEnabled ? 'bg-stone-100 text-stone-700 hover:bg-emerald-50' : 'bg-stone-100 text-stone-400 cursor-not-allowed'}`}
          title={voice.isListening ? 'Detener grabación' : voiceEnabled ? 'Hablar (mantén pulsado)' : 'Activa voz en ajustes'}
        >
          {voice.isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>
        <input
          type="text"
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={voice.isListening ? '🎤 Escuchando...' : `Escribe o habla en ${profile.targetLanguage}...`}
          disabled={loading}
          className="flex-1 bg-stone-100 border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
        />
        <button
          onClick={() => sendMessage()}
          disabled={loading || !inputText.trim()}
          className="p-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl transition-all shadow-sm flex items-center justify-center"
        >
          <Play className="w-5 h-5" />
        </button>
      </div>
    </div>
    </ErrorBoundary>
  );
}