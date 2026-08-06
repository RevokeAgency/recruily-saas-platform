// Redaktionelle Inhalte der Revetly-Blogs.
//
// Bewusst als getypte Daten statt Markdown: Die Landing-Page braucht nur
// Vorschau-Felder, die Detailseite rendert dieselbe Quelle vollständig, und
// die SEO-Metadaten (Titel, Beschreibung, Keywords) hängen direkt am Beitrag.
// Ein neuer Artikel bedeutet einen Eintrag hier, sonst nichts.

export interface BlogBlock {
  type: "p" | "h2" | "h3" | "list" | "quote"
  /** Für p, h2, h3, quote */
  text?: string
  /** Für list */
  items?: string[]
}

export interface BlogPost {
  slug: string
  title: string
  /** Kürzerer Titel für die Vorschaukarte, falls der volle zu lang ist. */
  cardTitle?: string
  /** Anrisstext auf der Landing-Page. */
  excerpt: string
  /** Meta-Description für Suchmaschinen (max. ~155 Zeichen). */
  metaDescription: string
  keywords: string[]
  category: string
  /** ISO-Datum. Beim ersten echten Veröffentlichen anpassen. */
  publishedAt: string
  readingMinutes: number
  blocks: BlogBlock[]
}

export const BLOG_POSTS: BlogPost[] = [
  // ───────────────────────────────────────────────────────────────────────────
  {
    slug: "eu-ai-act-recruiting",
    title: "EU AI Act im Recruiting: Was Personalabteilungen jetzt wissen müssen",
    cardTitle: "EU AI Act im Recruiting",
    excerpt:
      "Software, die Bewerbungen bewertet, gilt in der EU als Hochrisiko-KI. Das bringt Pflichten mit sich, die viele Personalabteilungen noch nicht auf dem Schirm haben. Was das konkret bedeutet und woran Sie ein rechtssicheres System erkennen.",
    metaDescription:
      "EU AI Act im Recruiting: Warum KI-Bewerberauswahl als Hochrisiko gilt, welche Pflichten daraus folgen und worauf Sie bei der Softwareauswahl achten sollten.",
    keywords: [
      "EU AI Act Recruiting",
      "KI Recruiting DSGVO",
      "Hochrisiko KI Personalauswahl",
      "KI Bewerberauswahl rechtssicher",
      "AI Act Personalabteilung",
    ],
    category: "Recht & Compliance",
    publishedAt: "2026-07-14",
    readingMinutes: 7,
    blocks: [
      {
        type: "p",
        text: "Der EU AI Act stuft KI-Systeme nach Risiko ein. Software, die über den Zugang zu Beschäftigung mitentscheidet, landet dabei in der zweithöchsten Kategorie: Hochrisiko. Wer Bewerbungen automatisiert vorsortiert oder bewertet, betreibt also kein harmloses Hilfsmittel, sondern ein reguliertes System.",
      },
      {
        type: "p",
        text: "Das überrascht viele Personalabteilungen. Ein Tool, das Lebensläufe nach Passung sortiert, fühlt sich an wie eine Suchfunktion. Rechtlich ist es etwas anderes.",
      },
      { type: "h2", text: "Warum ausgerechnet Recruiting" },
      {
        type: "p",
        text: "Die Begründung des Gesetzgebers ist nachvollziehbar: Eine Fehlentscheidung im Bewerbungsprozess trifft Menschen an einer empfindlichen Stelle. Wer aussortiert wird, erfährt in der Regel nicht warum. Und wenn ein System systematisch bestimmte Gruppen benachteiligt, fällt das ohne Prüfung jahrelang niemandem auf.",
      },
      {
        type: "p",
        text: "Genau hier liegt das Problem klassischer Screening-Werkzeuge. Sie liefern eine Zahl, aber keine Begründung. Warum Kandidat A auf 82 kommt und Kandidat B auf 61, lässt sich hinterher nicht rekonstruieren.",
      },
      { type: "h2", text: "Die Pflichten in verständlicher Form" },
      {
        type: "p",
        text: "Der Gesetzestext ist umfangreich. Für die Praxis lassen sich die Anforderungen auf einige Punkte eindampfen:",
      },
      {
        type: "list",
        items: [
          "Menschliche Aufsicht: Eine Person muss die Entscheidung treffen können, nicht das System. Automatisierte Absagen ohne Prüfung sind heikel.",
          "Transparenz: Bewerber müssen erfahren, dass KI eingesetzt wird.",
          "Nachvollziehbarkeit: Es muss dokumentiert sein, wie eine Bewertung zustande kam.",
          "Diskriminierungsprüfung: Das System darf nicht systematisch bestimmte Gruppen benachteiligen, und das muss überprüfbar sein.",
          "Datenqualität: Die Grundlage der Bewertung muss belastbar sein.",
        ],
      },
      {
        type: "p",
        text: "Die meisten dieser Punkte sind keine Formalitäten. Sie verlangen, dass das System erklären kann, was es tut.",
      },
      { type: "h2", text: "Was das für die Softwareauswahl heißt" },
      {
        type: "p",
        text: "Wenn Sie ein Recruiting-Tool evaluieren, ist die entscheidende Frage nicht, wie hoch die Trefferquote laut Hersteller ist. Sie lautet: Kann das System jede einzelne Bewertung begründen, und zwar mit Belegen aus den Bewerbungsunterlagen?",
      },
      {
        type: "p",
        text: "Ein praktischer Test in der Demo: Lassen Sie sich einen Kandidaten mit mittlerem Score zeigen und fragen Sie, warum es nicht mehr geworden sind. Bekommen Sie eine konkrete Antwort mit Bezug auf den Lebenslauf, ist das ein gutes Zeichen. Bekommen Sie eine Erklärung über Algorithmen und Gewichtungen, haben Sie im Zweifelsfall ein Problem.",
      },
      { type: "h3", text: "Vier Fragen für den Anbietertermin" },
      {
        type: "list",
        items: [
          "Wo werden die Bewerberdaten verarbeitet, und liegt ein Auftragsverarbeitungsvertrag vor?",
          "Werden unsere Bewerberdaten zum Training fremder Modelle verwendet?",
          "Können wir zu jeder Bewertung die Begründung samt Belegstellen einsehen?",
          "Wie lange werden Daten gespeichert, und läuft die Löschung automatisch?",
        ],
      },
      { type: "h2", text: "DSGVO und AI Act greifen ineinander" },
      {
        type: "p",
        text: "Der AI Act ersetzt die DSGVO nicht, er kommt obendrauf. Bewerberdaten sind personenbezogene Daten, und die Grundsätze gelten weiter: Zweckbindung, Datenminimierung, Löschfristen, Auskunftsrecht.",
      },
      {
        type: "p",
        text: "Praktisch relevant wird das beim Speicherort. Wenn ein Anbieter Lebensläufe an ein Modell in den USA schickt, ist das eine Drittlandübermittlung mit allem, was daran hängt. Bei Anbietern mit europäischer Infrastruktur entfällt diese Diskussion.",
      },
      {
        type: "quote",
        text: "Ein Bewerber, der wissen will, warum er abgelehnt wurde, hat ein Auskunftsrecht. Wer darauf nur mit einer Zahl antworten kann, hat ein Problem.",
      },
      { type: "h2", text: "Wo Sie anfangen sollten" },
      {
        type: "p",
        text: "Wenn Sie bereits KI im Auswahlprozess einsetzen, prüfen Sie zuerst, ob Sie eine Ablehnung erklären könnten. Nicht theoretisch, sondern anhand eines echten Falls aus den letzten Wochen.",
      },
      {
        type: "p",
        text: "Fällt die Antwort schwer, ist das kein Grund zur Panik, aber ein guter Zeitpunkt, die Prozesse anzupassen. Bewerber merken den Unterschied übrigens auch: Eine Absage mit nachvollziehbarem Grund kommt deutlich besser an als eine Textbaustein-Mail.",
      },
    ],
  },

  // ───────────────────────────────────────────────────────────────────────────
  {
    slug: "strukturierte-interviews-leitfaden",
    title: "Strukturierte Interviews: Der unterschätzte Hebel für bessere Einstellungen",
    cardTitle: "Strukturierte Interviews",
    excerpt:
      "Zwischen sauberem Screening und der finalen Entscheidung klafft bei den meisten Unternehmen eine Lücke: das Bauchgefühl-Gespräch. Warum feste Fragen und verankerte Skalen mehr bringen als jahrelange Menschenkenntnis.",
    metaDescription:
      "Strukturiertes Interview: Aufbau, Fragebeispiele und Bewertungsskala. Warum standardisierte Gespräche den Berufserfolg besser vorhersagen als freie Interviews.",
    keywords: [
      "strukturiertes Interview",
      "Interviewleitfaden erstellen",
      "Bewerbungsgespräch Fragen",
      "Personalauswahl Methoden",
      "Eignungsdiagnostik",
    ],
    category: "Auswahlprozess",
    publishedAt: "2026-06-23",
    readingMinutes: 8,
    blocks: [
      {
        type: "p",
        text: "In der Eignungsdiagnostik gibt es wenige Befunde, die so stabil sind wie dieser: Strukturierte Interviews sagen den späteren Berufserfolg deutlich besser vorher als freie Gespräche. Trotzdem führen die meisten Unternehmen weiterhin freie Gespräche.",
      },
      {
        type: "p",
        text: "Der Grund ist selten Unwissen. Es fühlt sich einfach besser an, ein Gespräch laufen zu lassen und den Menschen kennenzulernen. Nur misst man dabei etwas anderes als Eignung.",
      },
      { type: "h2", text: "Was im freien Gespräch schiefgeht" },
      {
        type: "p",
        text: "Drei Effekte arbeiten gegen Sie, und alle drei sind gut dokumentiert.",
      },
      {
        type: "p",
        text: "Der erste ist der Ähnlichkeitseffekt. Wir bewerten Menschen besser, die uns ähneln, im Werdegang, im Auftreten, im Humor. Das fühlt sich nicht wie Voreingenommenheit an, sondern wie gute Chemie.",
      },
      {
        type: "p",
        text: "Der zweite ist der erste Eindruck. Die Entscheidung fällt oft in den ersten Minuten, der Rest des Gesprächs dient der Bestätigung. Wer sympathisch startet, bekommt wohlwollendere Nachfragen.",
      },
      {
        type: "p",
        text: "Der dritte ist die fehlende Vergleichbarkeit. Wenn Kandidatin A andere Fragen bekommt als Kandidat B, vergleichen Sie am Ende zwei verschiedene Gespräche und nicht zwei Personen.",
      },
      { type: "h2", text: "Was ein strukturiertes Interview ausmacht" },
      {
        type: "p",
        text: "Es sind im Kern zwei Dinge: Alle Bewerber bekommen dieselben Fragen, und die Antworten werden auf einer Skala bewertet, deren Stufen vorher beschrieben sind.",
      },
      {
        type: "p",
        text: "Der zweite Teil wird oft weggelassen, und genau daran scheitert es dann. Eine Skala von 1 bis 5 ohne Beschreibung ist wertlos, weil Ihre 4 die 2 Ihrer Kollegin sein kann. Die Stufen brauchen Anker.",
      },
      { type: "h3", text: "So sieht ein verankerter Anker aus" },
      {
        type: "p",
        text: "Frage: \"Erzählen Sie von einer Situation, in der ein Projekt aus dem Ruder lief. Was haben Sie konkret getan?\"",
      },
      {
        type: "list",
        items: [
          "1 bis 2: Bleibt allgemein, beschreibt vor allem, was andere hätten tun sollen. Keine eigene Handlung erkennbar.",
          "3: Nennt eine konkrete Situation, bleibt bei der eigenen Rolle aber vage.",
          "4 bis 5: Schildert Situation, eigenes Vorgehen und Ergebnis nachvollziehbar. Benennt auch, was rückblickend nicht funktioniert hat.",
        ],
      },
      {
        type: "p",
        text: "Mit dieser Beschreibung bewerten zwei Personen dasselbe Gespräch sehr viel ähnlicher als ohne.",
      },
      { type: "h2", text: "Verhaltensbasiert statt hypothetisch" },
      {
        type: "p",
        text: "Fragen Sie nach vergangenem Verhalten, nicht nach Absichtserklärungen. \"Wie würden Sie mit einem schwierigen Kunden umgehen?\" misst, wie gut jemand Bewerbungsratgeber gelesen hat. \"Erzählen Sie von einem schwierigen Kunden\" misst, was die Person tatsächlich getan hat.",
      },
      {
        type: "p",
        text: "Bei Berufseinsteigern ohne einschlägige Erfahrung funktioniert das auch, nur mit anderem Bezug: Studienprojekte, Nebenjobs, Vereinsarbeit.",
      },
      { type: "h2", text: "Woher die Fragen kommen sollten" },
      {
        type: "p",
        text: "Der häufigste Fehler ist ein Standardfragebogen für alle Stellen. Ein guter Leitfaden entsteht aus dem, was Sie über den konkreten Kandidaten noch nicht wissen.",
      },
      {
        type: "p",
        text: "Wenn das Screening zeigt, dass die Fachkenntnisse solide belegt sind, die Führungserfahrung aber nur behauptet wird, gehört die Führungserfahrung ins Interview und nicht die Fachkenntnis. Das Gespräch ist teuer, jede Frage sollte etwas klären.",
      },
      {
        type: "quote",
        text: "Ein Interview ist kein Wiederholungstest für Dinge, die im Lebenslauf schon belegt sind. Es ist die Gelegenheit, das Unklare zu klären.",
      },
      { type: "h2", text: "Der Aufwand ist geringer als gedacht" },
      {
        type: "p",
        text: "Ein Leitfaden mit sechs Fragen und Ankern kostet beim ersten Mal etwa eine Stunde. Danach passen Sie ihn pro Stelle an, das dauert Minuten.",
      },
      {
        type: "p",
        text: "Was Sie dafür bekommen: vergleichbare Bewertungen, eine dokumentierte Entscheidungsgrundlage bei Rückfragen, und eine deutlich geringere Chance, jemanden einzustellen, der vor allem gut geredet hat.",
      },
    ],
  },

  // ───────────────────────────────────────────────────────────────────────────
  {
    slug: "time-to-hire-senken",
    title: "Time-to-Hire senken: Wo die Wochen wirklich verloren gehen",
    cardTitle: "Time-to-Hire senken",
    excerpt:
      "Die meisten Unternehmen suchen die Verzögerung im Bewerbermangel. Tatsächlich vergeht die meiste Zeit an Stellen, die niemand misst: zwischen Eingang und Sichtung, zwischen Gespräch und Rückmeldung, zwischen Zusage und Vertrag.",
    metaDescription:
      "Time-to-Hire reduzieren: Wo im Recruiting-Prozess die Zeit tatsächlich verloren geht und welche Stellschrauben ohne zusätzliches Personal wirken.",
    keywords: [
      "Time to Hire senken",
      "Recruiting KPIs",
      "Bewerbungsprozess beschleunigen",
      "Recruiting Prozess optimieren",
      "Kennzahlen Personalgewinnung",
    ],
    category: "Prozess & Kennzahlen",
    publishedAt: "2026-06-02",
    readingMinutes: 6,
    blocks: [
      {
        type: "p",
        text: "Wenn eine Stelle drei Monate offen bleibt, lautet die Erklärung meist: Der Markt gibt niemanden her. Manchmal stimmt das. Häufiger verteilt sich die Zeit auf Wartephasen, die niemand protokolliert.",
      },
      { type: "h2", text: "Zerlegen Sie die Kennzahl" },
      {
        type: "p",
        text: "Time-to-Hire als eine Zahl hilft nicht weiter. Nützlich wird sie erst, wenn Sie die Strecke in Abschnitte teilen:",
      },
      {
        type: "list",
        items: [
          "Bewerbungseingang bis Sichtung",
          "Sichtung bis Einladung",
          "Einladung bis Gespräch",
          "Gespräch bis Rückmeldung",
          "Zusage bis Vertragsunterzeichnung",
        ],
      },
      {
        type: "p",
        text: "Messen Sie das für die letzten zehn Besetzungen. In den meisten Fällen liegen zwei Abschnitte auffällig über dem Rest, und es sind selten die, die man vermutet.",
      },
      { type: "h2", text: "Die üblichen Verdächtigen" },
      { type: "h3", text: "Eingang bis Sichtung" },
      {
        type: "p",
        text: "Bewerbungen landen im Postfach und werden gesichtet, wenn jemand Zeit hat. Bei einer Stelle mit 40 Bewerbungen bedeutet das oft eine Woche Verzögerung, bevor überhaupt etwas passiert.",
      },
      {
        type: "p",
        text: "Das ist die Stelle, an der Automatisierung am meisten bringt. Wenn Bewerbungen bei Eingang vorbewertet werden, beginnt Ihre Arbeit bei einer sortierten Liste statt bei einem Stapel.",
      },
      { type: "h3", text: "Gespräch bis Rückmeldung" },
      {
        type: "p",
        text: "Hier verlieren Sie Kandidaten, nicht nur Zeit. Wer nach einem guten Gespräch zwei Wochen nichts hört, geht davon aus, dass es nichts wird, und nimmt das andere Angebot an.",
      },
      {
        type: "p",
        text: "Die Ursache ist fast immer dieselbe: Die Entscheidung hängt an einer Person, die im Urlaub ist oder auf eine andere Meinung wartet. Ein fester Termin für die Nachbesprechung, direkt bei der Terminvergabe mitgeplant, löst das zuverlässiger als jede Erinnerungsmail.",
      },
      { type: "h3", text: "Zusage bis Vertrag" },
      {
        type: "p",
        text: "Unterschätzter Abschnitt. Zwischen mündlicher Zusage und unterschriebenem Vertrag vergehen oft ein bis zwei Wochen, in denen der Kandidat weiterhin ansprechbar für andere ist.",
      },
      { type: "h2", text: "Was messbar hilft" },
      {
        type: "p",
        text: "Vorbewertung bei Eingang. Nicht um die Entscheidung abzugeben, sondern um die Reihenfolge zu klären. Wer zuerst auf die zwanzig plausibelsten Bewerbungen schaut statt auf die zwanzig ältesten, wird schneller fertig.",
      },
      {
        type: "p",
        text: "Feste Slots für Gespräche. Zwei Nachmittage pro Woche, dauerhaft geblockt. Terminfindung ist ein häufiger Zeitfresser, den man einmalig löst.",
      },
      {
        type: "p",
        text: "Absagen sofort. Eine Absage, die zwei Wochen liegen bleibt, kostet Sie Ruf und blockiert Ihre eigene Übersicht.",
      },
      {
        type: "quote",
        text: "Schnelligkeit ist kein Selbstzweck. Aber der beste Kandidat ist meistens auch der, der die wenigsten Wochen wartet.",
      },
      { type: "h2", text: "Was Sie nicht optimieren sollten" },
      {
        type: "p",
        text: "Das Gespräch selbst. Ein Interview auf 20 Minuten zu kürzen spart eine halbe Stunde und kostet Sie die Entscheidungsgrundlage. Kürzen Sie die Wartezeiten, nicht die Prüfung.",
      },
    ],
  },

  // ───────────────────────────────────────────────────────────────────────────
  {
    slug: "talent-pool-aktivieren",
    title: "Der Talent-Pool, den Sie schon haben: Warum Absagen von gestern die Kandidaten von morgen sind",
    cardTitle: "Talent-Pool aktivieren",
    excerpt:
      "Die meisten Datenbanken sind Friedhöfe. Dabei sitzen dort Menschen, die sich vor einem halben Jahr beworben haben und knapp nicht genommen wurden. Für eine neue Stelle sind das oft die besten Kandidaten, und sie kosten nichts.",
    metaDescription:
      "Talent-Pool im Recruiting richtig nutzen: Wie Sie aus alten Bewerbungen neue Besetzungen machen, ohne Akquisekosten und DSGVO-konform.",
    keywords: [
      "Talent Pool aufbauen",
      "Bewerberpool nutzen",
      "Active Sourcing",
      "Recruiting Kosten senken",
      "Kandidaten Datenbank",
    ],
    category: "Sourcing",
    publishedAt: "2026-05-12",
    readingMinutes: 6,
    blocks: [
      {
        type: "p",
        text: "Jede Personalabteilung hat sie: eine Datenbank mit hunderten Bewerbungen aus den letzten zwei Jahren. Und jede Personalabteilung startet bei einer neuen Stelle trotzdem eine neue Anzeige.",
      },
      {
        type: "p",
        text: "Das ist erstaunlich, wenn man kurz nachrechnet. Eine Neuausschreibung kostet Anzeigenbudget, Sichtungszeit und mehrere Wochen. Ein Kandidat aus dem eigenen Bestand kostet eine Nachricht.",
      },
      { type: "h2", text: "Warum die Datenbank tot bleibt" },
      {
        type: "p",
        text: "Nicht aus Nachlässigkeit. Der Grund ist banal: Niemand weiß, wer da drin ist.",
      },
      {
        type: "p",
        text: "Eine Volltextsuche nach \"Projektleiter\" findet die Leute, die genau dieses Wort im Lebenslauf stehen haben. Sie findet nicht die Teamleiterin, die faktisch Projekte geführt hat, es aber anders genannt hat. Und wer 400 Profile hat, liest sie nicht durch, um das herauszufinden.",
      },
      { type: "h2", text: "Der Unterschied zwischen Suche und Abgleich" },
      {
        type: "p",
        text: "Eine Suche verlangt, dass Sie wissen, wonach Sie suchen. Ein Abgleich dreht das um: Das System nimmt die neue Stelle und prüft den vorhandenen Bestand dagegen.",
      },
      {
        type: "p",
        text: "Der praktische Unterschied ist groß. Statt \"suche Projektleiter\" bekommen Sie \"vier Personen aus Ihrer Datenbank passen zu über 80 Prozent auf diese Stelle\". Das ist eine Antwort, mit der man arbeiten kann.",
      },
      { type: "h2", text: "Die alten Bewerber sind oft die besseren" },
      {
        type: "p",
        text: "Wer sich vor sechs Monaten auf eine ähnliche Stelle beworben hat, hat sich mit Ihrem Unternehmen bereits beschäftigt. Er kennt die Branche, das Produkt und in vielen Fällen auch schon Ihre Ansprechpartner.",
      },
      {
        type: "p",
        text: "Dazu kommt: Ein knappes Nein bedeutet selten mangelnde Eignung. Häufiger war jemand anderes einen Tick passender, oder das Budget hat für die Seniorität nicht gereicht. Beides kann bei der nächsten Stelle anders aussehen.",
      },
      { type: "h2", text: "Was Sie datenschutzrechtlich beachten müssen" },
      {
        type: "p",
        text: "Hier wird es konkret, und viele machen es falsch. Bewerbungsunterlagen dürfen Sie nicht unbegrenzt aufbewahren, um sie später erneut zu verwenden. Die Speicherung ist an den Zweck gebunden, für den die Person sich beworben hat.",
      },
      {
        type: "p",
        text: "Sauber ist es so: Fragen Sie bei der Absage aktiv, ob die Unterlagen für künftige Stellen im Bestand bleiben dürfen. Dokumentieren Sie die Antwort. Ohne Einwilligung gilt die reguläre Löschfrist.",
      },
      {
        type: "p",
        text: "Der Nebeneffekt ist angenehm: Eine Absage mit der Frage \"dürfen wir uns bei passenden Stellen wieder melden\" klingt deutlich besser als eine Absage ohne.",
      },
      {
        type: "quote",
        text: "Ein Bewerberpool ohne dokumentierte Einwilligung ist kein Vermögenswert, sondern ein Risiko.",
      },
      { type: "h2", text: "Womit Sie anfangen" },
      {
        type: "p",
        text: "Nehmen Sie die nächste offene Stelle und lassen Sie den vorhandenen Bestand dagegen prüfen, bevor Sie die Anzeige schalten. Im schlechtesten Fall kostet es zehn Minuten. Im besten Fall sparen Sie sich die Ausschreibung.",
      },
    ],
  },

  // ───────────────────────────────────────────────────────────────────────────
  {
    slug: "ki-matching-vs-keyword-suche",
    title: "KI-Matching oder Stichwortsuche: Warum klassisches CV-Screening die falschen Leute aussortiert",
    cardTitle: "KI-Matching vs. Stichwortsuche",
    excerpt:
      "Filtert Ihr System nach Schlagworten, sortiert es zuverlässig alle aus, die dieselbe Fähigkeit anders benannt haben. Was der Unterschied zwischen Wortabgleich und inhaltlichem Verständnis in der Praxis bedeutet.",
    metaDescription:
      "KI-Matching statt Keyword-Filter: Warum Stichwortsuche im CV-Screening passende Kandidaten aussortiert und woran Sie echtes semantisches Matching erkennen.",
    keywords: [
      "KI Matching Bewerber",
      "CV Screening Software",
      "Lebenslauf Analyse KI",
      "Bewerbermanagement KI",
      "semantisches Matching Recruiting",
    ],
    category: "Technologie",
    publishedAt: "2026-04-28",
    readingMinutes: 7,
    blocks: [
      {
        type: "p",
        text: "Die meisten Bewerbermanagementsysteme filtern nach Stichworten. Sie geben \"React\" ein, das System zeigt alle Lebensläufe, in denen \"React\" steht. Das klingt vernünftig und ist der Grund, warum viele passende Bewerber nie gesichtet werden.",
      },
      { type: "h2", text: "Das Grundproblem" },
      {
        type: "p",
        text: "Ein Lebenslauf ist kein Formular. Zwei Menschen mit derselben Qualifikation beschreiben sie unterschiedlich.",
      },
      {
        type: "p",
        text: "Wer seit vier Jahren mit Next.js arbeitet, beherrscht React, denn Next.js baut darauf auf. Steht \"React\" aber nicht ausdrücklich im Lebenslauf, fällt die Person aus dem Filter. Dasselbe gilt für PostgreSQL und SQL, für \"Teamleitung\" und \"Führungserfahrung\", für \"Debitorenbuchhaltung\" und \"Rechnungswesen\".",
      },
      {
        type: "p",
        text: "Die Aussortierten sind dabei nicht zufällig verteilt. Es trifft überdurchschnittlich oft Quereinsteiger und Menschen, die ihren Lebenslauf nicht auf Suchmaschinen optimiert haben.",
      },
      { type: "h2", text: "Was semantisches Matching anders macht" },
      {
        type: "p",
        text: "Ein System, das Inhalte versteht, prüft nicht die Schreibweise, sondern die Sache. Es erkennt, dass Next.js React einschließt, und kann das auch begründen.",
      },
      {
        type: "p",
        text: "Der entscheidende Punkt dabei ist die Begründung. Ein Abgleich, der \"passt zu 84 Prozent\" ausgibt und sonst nichts, hat Ihnen die Blackbox nur verschoben. Brauchbar wird es, wenn dabeisteht, welche Anforderung durch welche Erfahrung gedeckt ist.",
      },
      { type: "h3", text: "Woran Sie echtes Verständnis erkennen" },
      {
        type: "list",
        items: [
          "Das System nennt zu jeder geforderten Fähigkeit, wodurch sie gedeckt ist, oder dass sie fehlt.",
          "Es unterscheidet, ob eine Fähigkeit nur in einer Liste steht oder in einer Position tatsächlich angewendet wurde.",
          "Es erkennt Lücken im Lebenslauf und benennt sie, statt sie zu überspielen.",
          "Es sagt, wenn eine Angabe unklar ist, statt eine Zahl zu erfinden.",
        ],
      },
      {
        type: "p",
        text: "Der letzte Punkt ist der wichtigste und der seltenste. Systeme, die bei fehlender Information wohlwollend raten, produzieren Zahlen, die gut aussehen und nichts bedeuten.",
      },
      { type: "h2", text: "Der Unterschied zwischen gelistet und belegt" },
      {
        type: "p",
        text: "Eine Skill-Liste am Ende des Lebenslaufs ist eine Behauptung. Dieselbe Fähigkeit, die in einer beschriebenen Position vorkommt, ist ein Beleg.",
      },
      {
        type: "p",
        text: "Wer \"Projektmanagement\" in der Fähigkeitenliste stehen hat, kann alles zwischen einem Wochenendkurs und acht Jahren Verantwortung meinen. Wer schreibt, dass er die Migration einer Warenwirtschaft mit sechs Beteiligten geleitet hat, hat es gezeigt.",
      },
      {
        type: "p",
        text: "Ein gutes System behandelt diese beiden Fälle unterschiedlich. Ein Stichwortfilter kann es nicht.",
      },
      {
        type: "quote",
        text: "Die Frage ist nicht, ob ein Wort im Lebenslauf steht. Die Frage ist, ob die Person die Sache kann.",
      },
      { type: "h2", text: "Was das für die Auswahl bedeutet" },
      {
        type: "p",
        text: "Rechnen Sie nicht damit, dass die Umstellung Ihnen sofort mehr Top-Kandidaten liefert. Der erste sichtbare Effekt ist meistens ein anderer: Kandidaten, die vorher unten lagen, rutschen nach oben, und ihre Lebensläufe ergeben beim Lesen Sinn.",
      },
      {
        type: "p",
        text: "Der zweite Effekt zeigt sich in den Absagen. Wenn Sie begründen können, warum jemand nicht passt, wird auch die Rückmeldung an den Bewerber besser.",
      },
    ],
  },

  // ───────────────────────────────────────────────────────────────────────────
  {
    slug: "bewerbermanagement-software-auswahl",
    title: "Bewerbermanagement-Software für KMU: Woran Auswahlprojekte scheitern",
    cardTitle: "Software-Auswahl für KMU",
    excerpt:
      "Funktionslisten sind bei ATS-Anbietern erstaunlich austauschbar. Die Unterschiede zeigen sich an anderer Stelle: beim Einrichtungsaufwand, beim Umgang mit E-Mail-Bewerbungen und bei der Frage, was mit Ihren Daten passiert.",
    metaDescription:
      "Bewerbermanagement-Software auswählen: Welche Kriterien für KMU wirklich zählen, welche Funktionen überschätzt werden und welche Fragen Sie Anbietern stellen sollten.",
    keywords: [
      "Bewerbermanagement Software",
      "ATS Software Vergleich",
      "Recruiting Software KMU",
      "Bewerbermanagement System einführen",
      "Applicant Tracking System",
    ],
    category: "Software-Auswahl",
    publishedAt: "2026-04-07",
    readingMinutes: 7,
    blocks: [
      {
        type: "p",
        text: "Wer Bewerbermanagementsysteme vergleicht, bekommt schnell den Eindruck, dass alle dasselbe können. Weitgehend stimmt das auch. Die Unterschiede liegen fast nie im Funktionsumfang, sondern darin, wie viel Aufwand nötig ist, bis das System tatsächlich benutzt wird.",
      },
      { type: "h2", text: "Der häufigste Fehler bei der Auswahl" },
      {
        type: "p",
        text: "Unternehmen bewerten Software anhand von Funktionslisten. Wer die längste Liste hat, gewinnt. Sechs Monate später nutzt das Team drei Funktionen und arbeitet für den Rest weiter mit Excel.",
      },
      {
        type: "p",
        text: "Die bessere Frage lautet: Was passiert konkret, wenn morgen eine Bewerbung per E-Mail hereinkommt? Lassen Sie sich das in der Demo vorführen, mit einer echten Mail und einem echten PDF.",
      },
      { type: "h2", text: "Kriterien, die für kleinere Unternehmen zählen" },
      { type: "h3", text: "Zeit bis zur ersten Stelle" },
      {
        type: "p",
        text: "Manche Systeme verlangen, dass Sie erst Workflows, Rollen und Bewertungsbögen konfigurieren. Für Konzerne sinnvoll. Für ein Unternehmen mit zwölf Einstellungen im Jahr bedeutet es, dass die Einführung an der Konfiguration hängen bleibt.",
      },
      {
        type: "p",
        text: "Fragen Sie, wie lange es dauert, bis die erste Stelle live ist. Alles über einem halben Tag ist für KMU ein Warnsignal.",
      },
      { type: "h3", text: "Umgang mit E-Mail-Bewerbungen" },
      {
        type: "p",
        text: "Im Mittelstand kommt ein erheblicher Teil der Bewerbungen weiterhin per Mail, oft an eine persönliche Adresse. Ein System, das nur über das eigene Formular funktioniert, verwaltet die Hälfte Ihrer Bewerbungen nicht.",
      },
      { type: "h3", text: "Was mit den Daten passiert" },
      {
        type: "p",
        text: "Bewerberdaten sind sensibel. Zwei Fragen gehören in jedes Anbietergespräch: Wo werden die Daten verarbeitet, und werden sie zum Training von KI-Modellen verwendet?",
      },
      {
        type: "p",
        text: "Bei der zweiten Frage lohnt es, auf die Formulierung zu achten. \"Wir verkaufen keine Daten\" beantwortet die Frage nach dem Training nicht.",
      },
      { type: "h3", text: "Löschung" },
      {
        type: "p",
        text: "Die Aufbewahrungsfristen für Bewerbungsunterlagen sind begrenzt. Prüfen Sie, ob das System automatisch löscht oder ob jemand das manuell nachhalten muss. Manuell bedeutet in der Praxis: gar nicht.",
      },
      { type: "h2", text: "Überschätzte Funktionen" },
      {
        type: "p",
        text: "Aufwendige Karriereseiten-Baukästen. Die meisten Unternehmen brauchen eine funktionierende Stellenseite mit einem Bewerbungsformular, das auf dem Handy läuft. Mehr wird selten genutzt.",
      },
      {
        type: "p",
        text: "Umfangreiche Auswertungen. Wenn Sie zwanzig Einstellungen im Jahr haben, sind Diagramme über Bewerberquellen statistisch bedeutungslos. Zwei Zahlen reichen: Wie lange dauert eine Besetzung, und woher kommen die Kandidaten, die Sie eingestellt haben.",
      },
      {
        type: "quote",
        text: "Die beste Software ist die, mit der Ihr Team nach zwei Wochen noch arbeitet. Alles andere ist Funktionsumfang, den Sie mitbezahlen.",
      },
      { type: "h2", text: "Ein praktischer Test für die Demo" },
      {
        type: "p",
        text: "Bringen Sie eine echte Stellenausschreibung mit und lassen Sie sie im Termin anlegen. Bringen Sie einen anonymisierten Lebenslauf mit und lassen Sie ihn verarbeiten.",
      },
      {
        type: "p",
        text: "Anbieter, die das nicht spontan vorführen können, zeigen Ihnen eine vorbereitete Umgebung. Was Sie dabei sehen, hat mit Ihrem Alltag wenig zu tun.",
      },
    ],
  },
]

/** Alle Beiträge, neueste zuerst. */
export function getAllPosts(): BlogPost[] {
  return [...BLOG_POSTS].sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  )
}

export function getPost(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((p) => p.slug === slug)
}

/** Datum in deutscher Schreibweise, z. B. "14. Juli 2026". */
export function formatBlogDate(iso: string): string {
  return new Date(iso).toLocaleDateString("de-DE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}
