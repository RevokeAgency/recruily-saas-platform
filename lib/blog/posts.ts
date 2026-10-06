// Redaktionelle Inhalte der Revetly-Blogs.
//
// Bewusst als getypte Daten statt Markdown: Die Landing-Page braucht nur
// Vorschau-Felder, die Detailseite rendert dieselbe Quelle vollständig, und
// die SEO-Metadaten (Titel, Beschreibung, Keywords) hängen direkt am Beitrag.
// Ein neuer Artikel bedeutet einen Eintrag hier, sonst nichts.
//
// Redaktionelle Regeln (wie auf der Landing Page):
//   - Du-Ansprache durchgehend, auch in Anriss und Meta-Description.
//   - Keine Gedankenstriche im Fließtext, keine Ausrufezeichen.
//   - Keine KI-, Mail- oder Zahlungsanbieter namentlich.
//   - Jede Tatsachenbehauptung mit Quelle; Verweise im Text als [1], [2] …
//     beziehen sich auf `sources` in derselben Reihenfolge. Nur Quellen,
//     die sich nachprüfen lassen (Gesetzestexte, veröffentlichte Studien).

export interface BlogBlock {
  type: "p" | "h2" | "h3" | "list" | "quote"
  /** Für p, h2, h3, quote */
  text?: string
  /** Für list */
  items?: string[]
}

export interface BlogSource {
  /** Vollständige Angabe, wie sie im Quellenverzeichnis steht. */
  label: string
  /** Öffentlich erreichbare Fassung, falls vorhanden. */
  url?: string
}

export interface BlogPost {
  slug: string
  title: string
  /** Kürzerer Titel für die Vorschaukarte, falls der volle zu lang ist. */
  cardTitle?: string
  /** Anrisstext. Steht als Vorspann im Artikel, auf /blog und auf der Startseite. */
  excerpt: string
  /** Meta-Description für Suchmaschinen (max. ~155 Zeichen). */
  metaDescription: string
  keywords: string[]
  category: string
  /** Name des Verfassers. */
  author: string
  /** ISO-Datum der Erstveröffentlichung. */
  publishedAt: string
  /** ISO-Datum der letzten inhaltlichen Überarbeitung. */
  updatedAt?: string
  blocks: BlogBlock[]
  sources: BlogSource[]
}

export const BLOG_AUTHOR = "Daniel Gräbner"

const EUR_LEX_AI_ACT = "https://eur-lex.europa.eu/eli/reg/2024/1689/oj"
const EUR_LEX_DSGVO = "https://eur-lex.europa.eu/eli/reg/2016/679/oj"

export const BLOG_POSTS: BlogPost[] = [
  // ───────────────────────────────────────────────────────────────────────────
  {
    slug: "eu-ai-act-recruiting",
    title: "EU AI Act im Recruiting: Was Personalabteilungen jetzt wissen müssen",
    cardTitle: "EU AI Act im Recruiting",
    excerpt:
      "Software, die Bewerbungen sichtet und vorsortiert, gilt in der EU als Hochrisiko-KI. Das bringt Pflichten mit sich, die viele Personalabteilungen noch nicht auf dem Schirm haben. Was das konkret bedeutet und woran du ein rechtssicheres System erkennst.",
    metaDescription:
      "EU AI Act im Recruiting: Warum KI in der Bewerberauswahl als Hochrisiko gilt, welche Pflichten du als Arbeitgeber hast und worauf du bei Software achten solltest.",
    keywords: [
      "EU AI Act Recruiting",
      "KI-Verordnung Personalauswahl",
      "Hochrisiko KI Bewerbung",
      "KI Bewerberauswahl rechtssicher",
      "AI Act Pflichten Arbeitgeber",
    ],
    category: "Recht & Compliance",
    author: BLOG_AUTHOR,
    publishedAt: "2026-07-14",
    updatedAt: "2026-10-06",
    blocks: [
      {
        type: "p",
        text: "Die europäische KI-Verordnung, meist EU AI Act genannt, ordnet KI-Systeme nach ihrem Risiko ein [1]. Software, die bei der Einstellung oder Auswahl von Menschen mitwirkt, steht dabei ausdrücklich auf der Liste der Hochrisiko-Anwendungen. Genannt sind unter anderem Systeme, die Bewerbungen sichten oder filtern und Bewerberinnen und Bewerber einschätzen [2].",
      },
      {
        type: "p",
        text: "Das überrascht viele. Ein Tool, das Lebensläufe nach Passung sortiert, fühlt sich an wie eine bessere Suchfunktion. Rechtlich ist es etwas anderes, und für dich als Arbeitgeber folgen daraus eigene Pflichten.",
      },
      { type: "h2", text: "Warum gerade Recruiting als Hochrisiko gilt" },
      {
        type: "p",
        text: "Die Begründung ist nachvollziehbar. Eine Fehlentscheidung im Bewerbungsprozess trifft Menschen an einer empfindlichen Stelle: beim Zugang zu Arbeit. Wer aussortiert wird, erfährt meist nicht warum. Und wenn ein System bestimmte Gruppen systematisch benachteiligt, fällt das ohne gezielte Prüfung lange niemandem auf.",
      },
      {
        type: "p",
        text: "Genau hier liegt die Schwäche vieler klassischer Screening-Werkzeuge. Sie liefern eine Zahl, aber keine Begründung. Warum eine Person auf 82 kommt und eine andere auf 61, lässt sich hinterher oft nicht mehr nachvollziehen.",
      },
      { type: "h2", text: "Anbieter und Anwender haben unterschiedliche Pflichten" },
      {
        type: "p",
        text: "Die Verordnung unterscheidet zwischen dem Anbieter, der ein System entwickelt und in Verkehr bringt, und dem Betreiber, der es einsetzt. Wenn du eine Recruiting-Software nutzt, bist du in der Regel Betreiber. Die aufwendigen Pflichten rund um Risikomanagement, technische Dokumentation und Konformitätsbewertung liegen beim Anbieter. Deine Pflichten sind überschaubarer, aber nicht verhandelbar [3]:",
      },
      {
        type: "list",
        items: [
          "Das System nach der Gebrauchsanweisung des Anbieters einsetzen, nicht für Zwecke, für die es nicht gedacht ist.",
          "Die menschliche Aufsicht Personen übertragen, die dafür fachlich geeignet, geschult und befugt sind.",
          "Die Eingabedaten, soweit du sie kontrollierst, auf Relevanz für den Zweck prüfen. Eine Stellenbeschreibung mit diskriminierenden Kriterien wird nicht besser, weil eine KI sie auswertet.",
          "Den Betrieb überwachen und bei Auffälligkeiten den Anbieter informieren.",
          "Die automatisch erzeugten Protokolle mindestens sechs Monate aufbewahren, soweit sie unter deiner Kontrolle stehen.",
          "Beschäftigte und ihre Vertretung vor dem Einsatz am Arbeitsplatz informieren.",
          "Bewerberinnen und Bewerber darüber informieren, dass ein Hochrisiko-System bei Entscheidungen über sie eingesetzt wird.",
        ],
      },
      {
        type: "p",
        text: "Dazu kommt ein Recht, das oft übersehen wird: Wer von einer Entscheidung auf Grundlage eines solchen Systems betroffen ist, kann eine klare und aussagekräftige Erläuterung verlangen, welche Rolle das System bei der Entscheidung gespielt hat [4]. Spätestens hier zeigt sich, ob dein Werkzeug Gründe liefern kann oder nur Zahlen.",
      },
      { type: "h2", text: "Was schon heute gilt" },
      {
        type: "p",
        text: "Zwei Regeln gelten bereits seit dem 2. Februar 2025 [5]. Erstens müssen Unternehmen, die KI einsetzen, dafür sorgen, dass die damit befassten Personen über ausreichende KI-Kompetenz verfügen [6]. Für die Personalabteilung heißt das: Wer mit einem Matching-System arbeitet, sollte verstehen, was es kann, wo es irren kann und wann man ihm nicht folgen sollte.",
      },
      {
        type: "p",
        text: "Zweitens sind bestimmte Praktiken verboten. Dazu gehört, Emotionen von Menschen am Arbeitsplatz mit KI zu erkennen, abgesehen von medizinischen oder Sicherheitsgründen [7]. Werkzeuge, die aus Videointerviews Begeisterung, Nervosität oder Ehrlichkeit ablesen wollen, haben im europäischen Recruiting damit keinen Platz mehr.",
      },
      {
        type: "p",
        text: "Nach dem ursprünglichen Text der Verordnung gelten die Pflichten für Hochrisiko-Systeme ab dem 2. August 2026 [5]. Dieser Zeitplan ist politisch in Bewegung: Die EU-Kommission hat vorgeschlagen, die Anwendung der Hochrisiko-Regeln zu verschieben. Prüfe deshalb vor einer Entscheidung den aktuellen Stand im Amtsblatt. Für die Auswahl einer Software ändert das wenig, denn ein System, das du heute einführst, wirst du auch nach dem Stichtag noch nutzen.",
      },
      { type: "h2", text: "DSGVO und AI Act greifen ineinander" },
      {
        type: "p",
        text: "Die KI-Verordnung ersetzt die Datenschutz-Grundverordnung nicht, sie kommt dazu. Bewerberdaten sind personenbezogene Daten, und die bekannten Grundsätze gelten weiter: Zweckbindung, Datenminimierung, Speicherbegrenzung, Auskunftsrecht [8].",
      },
      {
        type: "p",
        text: "Besonders wichtig ist das Verbot rein automatisierter Entscheidungen mit erheblicher Wirkung [9]. Eine Absage, die ein System ohne menschliche Prüfung verschickt, ist genau so ein Fall. Ein Matching darf vorsortieren und begründen, entscheiden muss ein Mensch, und zwar mit echter Prüfung und nicht als reiner Klick auf „bestätigen“.",
      },
      {
        type: "p",
        text: "Praktisch relevant wird auch der Ort der Verarbeitung. Schickt ein Anbieter Lebensläufe an ein Modell außerhalb der EU, ist das eine Übermittlung in ein Drittland mit allen Anforderungen, die daran hängen. Bei Anbietern mit europäischer Infrastruktur entfällt diese Diskussion weitgehend.",
      },
      { type: "h2", text: "Betriebsrat früh einbinden" },
      {
        type: "p",
        text: "Gibt es in deinem Unternehmen einen Betriebsrat, gehört er früh an den Tisch. In Deutschland unterliegt die Einführung technischer Systeme, die Verhalten oder Leistung von Beschäftigten erfassen können, der Mitbestimmung [10]. In Österreich regelt das Arbeitsverfassungsgesetz, wann für Systeme mit Personaldaten eine Betriebsvereinbarung nötig ist [11]. Recruiting-Software betrifft zwar zuerst Bewerber, wird aber von deinen Beschäftigten bedient und protokolliert deren Arbeit mit.",
      },
      { type: "h2", text: "Was das für die Auswahl einer Software heißt" },
      {
        type: "p",
        text: "Wenn du ein Recruiting-Tool prüfst, ist die entscheidende Frage nicht, wie hoch die Trefferquote laut Hersteller ist. Sie lautet: Kann das System jede einzelne Einschätzung begründen, und zwar mit Belegen aus den Bewerbungsunterlagen?",
      },
      {
        type: "p",
        text: "Ein praktischer Test für die Demo: Lass dir eine Bewerbung mit mittlerem Ergebnis zeigen und frag, warum es nicht mehr geworden ist. Bekommst du eine konkrete Antwort mit Bezug auf den Lebenslauf, ist das ein gutes Zeichen. Bekommst du eine Erklärung über Algorithmen und Gewichtungen, wirst du dasselbe Problem haben, wenn ein Bewerber sein Recht auf Erläuterung geltend macht.",
      },
      { type: "h3", text: "Sechs Fragen für den Anbietertermin" },
      {
        type: "list",
        items: [
          "Gibt es eine Gebrauchsanweisung für Betreiber, die beschreibt, wofür das System gedacht ist und wo seine Grenzen liegen?",
          "Können wir zu jeder Einschätzung die Begründung samt Belegstellen einsehen und exportieren?",
          "Wird protokolliert, wer wann welche Entscheidung getroffen hat?",
          "Wo werden die Bewerberdaten verarbeitet, und liegt ein Vertrag zur Auftragsverarbeitung vor?",
          "Werden unsere Bewerberdaten zum Training von Modellen für andere Kunden verwendet?",
          "Wie lange werden Daten gespeichert, und läuft die Löschung automatisch?",
        ],
      },
      {
        type: "quote",
        text: "Wer eine Absage nur mit einer Zahl begründen kann, hat sie nicht begründet.",
      },
      { type: "h2", text: "Wo du anfangen solltest" },
      {
        type: "p",
        text: "Wenn du bereits KI in der Auswahl einsetzt, nimm dir einen echten Fall aus den letzten Wochen und versuch, die Absage schriftlich zu erklären. Fällt das schwer, ist das kein Grund zur Panik, aber ein guter Zeitpunkt, die Prozesse anzupassen.",
      },
      {
        type: "p",
        text: "Danach drei Schritte: Ergänze deinen Datenschutzhinweis für Bewerber um den Einsatz von KI. Lege fest, wer die menschliche Aufsicht übernimmt, und sorge dafür, dass diese Personen geschult sind. Und dokumentiere, wie eine Entscheidung zustande kommt. Bewerber merken den Unterschied übrigens auch: Eine Absage mit nachvollziehbarem Grund kommt deutlich besser an als ein Textbaustein.",
      },
    ],
    sources: [
      { label: "Verordnung (EU) 2024/1689 über künstliche Intelligenz (KI-Verordnung), Amtsblatt der EU vom 12. Juli 2024", url: EUR_LEX_AI_ACT },
      { label: "KI-Verordnung, Art. 6 Abs. 2 in Verbindung mit Anhang III Nr. 4 (Beschäftigung, Personalmanagement)", url: EUR_LEX_AI_ACT },
      { label: "KI-Verordnung, Art. 26 (Pflichten der Betreiber von Hochrisiko-KI-Systemen)", url: EUR_LEX_AI_ACT },
      { label: "KI-Verordnung, Art. 86 (Recht auf Erläuterung der Entscheidungsfindung im Einzelfall)", url: EUR_LEX_AI_ACT },
      { label: "KI-Verordnung, Art. 113 (Inkrafttreten und Geltungsbeginn)", url: EUR_LEX_AI_ACT },
      { label: "KI-Verordnung, Art. 4 (KI-Kompetenz)", url: EUR_LEX_AI_ACT },
      { label: "KI-Verordnung, Art. 5 Abs. 1 lit. f (Verbot der Emotionserkennung am Arbeitsplatz)", url: EUR_LEX_AI_ACT },
      { label: "Verordnung (EU) 2016/679 (Datenschutz-Grundverordnung), Art. 5 (Grundsätze) und Art. 15 (Auskunftsrecht)", url: EUR_LEX_DSGVO },
      { label: "Datenschutz-Grundverordnung, Art. 22 (Automatisierte Entscheidungen im Einzelfall)", url: EUR_LEX_DSGVO },
      { label: "Betriebsverfassungsgesetz (Deutschland), § 87 Abs. 1 Nr. 6", url: "https://www.gesetze-im-internet.de/betrvg/__87.html" },
      { label: "Arbeitsverfassungsgesetz (Österreich), § 96a (Personaldatensysteme), abrufbar im Rechtsinformationssystem des Bundes", url: "https://www.ris.bka.gv.at" },
    ],
  },

  // ───────────────────────────────────────────────────────────────────────────
  {
    slug: "strukturierte-interviews-leitfaden",
    title: "Strukturierte Interviews: Der unterschätzte Hebel für bessere Einstellungen",
    cardTitle: "Strukturierte Interviews",
    excerpt:
      "Zwischen sauberem Screening und der finalen Entscheidung klafft bei den meisten Unternehmen eine Lücke: das Bauchgefühl-Gespräch. Warum feste Fragen und beschriebene Skalen mehr bringen als jahrelange Menschenkenntnis.",
    metaDescription:
      "Strukturiertes Interview: Aufbau, Fragebeispiele und Skala mit Ankern. Warum standardisierte Gespräche den Berufserfolg besser vorhersagen als freie Interviews.",
    keywords: [
      "strukturiertes Interview",
      "Interviewleitfaden erstellen",
      "Bewerbungsgespräch Fragen",
      "Personalauswahl Methoden",
      "Eignungsdiagnostik",
    ],
    category: "Auswahlprozess",
    author: BLOG_AUTHOR,
    publishedAt: "2026-06-23",
    updatedAt: "2026-10-06",
    blocks: [
      {
        type: "p",
        text: "In der Personalauswahl gibt es wenige Befunde, die so stabil sind wie dieser: Strukturierte Interviews sagen den späteren Berufserfolg deutlich besser vorher als freie Gespräche. Das zeigte schon die viel zitierte Übersicht von Schmidt und Hunter aus dem Jahr 1998 [1]. Eine Neuauswertung von Sackett und Kollegen aus dem Jahr 2022 hat das noch zugespitzt: Dort steht das strukturierte Interview an der Spitze der untersuchten Auswahlverfahren, klar vor dem unstrukturierten Gespräch [2].",
      },
      {
        type: "p",
        text: "Trotzdem führen die meisten Unternehmen weiter freie Gespräche. Der Grund ist selten Unwissen. Es fühlt sich einfach besser an, ein Gespräch laufen zu lassen und den Menschen kennenzulernen. Nur misst du dabei etwas anderes als Eignung.",
      },
      { type: "h2", text: "Was im freien Gespräch schiefgeht" },
      {
        type: "p",
        text: "Drei Effekte arbeiten gegen dich, und du kennst sie vermutlich aus eigener Erfahrung.",
      },
      {
        type: "p",
        text: "Der erste ist Ähnlichkeit. Menschen, die uns im Werdegang, im Auftreten oder im Humor ähneln, wirken auf uns kompetenter. Das fühlt sich nicht wie Voreingenommenheit an, sondern wie gute Chemie.",
      },
      {
        type: "p",
        text: "Der zweite ist der erste Eindruck. Oft steht die Meinung nach wenigen Minuten fest, der Rest des Gesprächs dient der Bestätigung. Wer sympathisch startet, bekommt wohlwollendere Nachfragen und mehr Gelegenheit, gut auszusehen.",
      },
      {
        type: "p",
        text: "Der dritte ist fehlende Vergleichbarkeit. Bekommt Kandidatin A andere Fragen als Kandidat B, vergleichst du am Ende zwei verschiedene Gespräche und nicht zwei Personen. Und in einem Streitfall kannst du kaum belegen, dass alle dieselbe Chance hatten.",
      },
      { type: "h2", text: "Was ein strukturiertes Interview ausmacht" },
      {
        type: "p",
        text: "Im Kern sind es drei Dinge. Die Fragen leiten sich aus den Anforderungen der Stelle ab. Alle Bewerber bekommen dieselben Fragen in derselben Reihenfolge. Und die Antworten werden auf einer Skala festgehalten, deren Stufen vorher beschrieben sind.",
      },
      {
        type: "p",
        text: "Der letzte Teil wird oft weggelassen, und genau daran scheitert es. Eine Skala von 1 bis 5 ohne Beschreibung hilft wenig, weil deine 4 die 2 deiner Kollegin sein kann. Die Stufen brauchen Anker: kurze Beschreibungen, wie eine schwache, eine mittlere und eine starke Antwort klingt.",
      },
      {
        type: "p",
        text: "Wer in Deutschland einen Rahmen sucht, findet ihn in der DIN 33430. Die Norm beschreibt Anforderungen an berufsbezogene Eignungsdiagnostik, vom Anforderungsprofil bis zur Dokumentation [3]. Du musst sie nicht vollständig umsetzen, um von ihr zu profitieren. Schon ihr Grundgedanke hilft: Erst festlegen, worauf es ankommt, dann danach fragen.",
      },
      { type: "h3", text: "So sieht eine Frage mit Ankern aus" },
      {
        type: "p",
        text: "Frage: „Erzähl von einer Situation, in der ein Projekt aus dem Ruder lief. Was hast du konkret getan?“",
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
        text: "Mit dieser Beschreibung kommen zwei Personen, die dasselbe Gespräch führen, zu deutlich ähnlicheren Ergebnissen als ohne. Genau das ist der Punkt: Die Einschätzung hängt weniger davon ab, wer fragt.",
      },
      { type: "h2", text: "Verhaltensbasiert statt hypothetisch" },
      {
        type: "p",
        text: "Frag nach vergangenem Verhalten, nicht nach Absichten. „Wie würdest du mit einem schwierigen Kunden umgehen?“ misst vor allem, wie gut jemand Bewerbungsratgeber gelesen hat. „Erzähl von einem schwierigen Kunden und was du getan hast“ misst, was die Person tatsächlich getan hat.",
      },
      {
        type: "p",
        text: "Situative Fragen haben trotzdem ihren Platz, etwa bei Berufseinsteigern ohne einschlägige Erfahrung. Dann hilft ein anderer Bezug: Studienprojekte, Nebenjobs, Vereinsarbeit, Ausbildung. Wichtig ist, dass auch hier die Anker vorher feststehen.",
      },
      { type: "h2", text: "Woher die Fragen kommen sollten" },
      {
        type: "p",
        text: "Der häufigste Fehler ist ein Standardfragebogen für alle Stellen. Ein guter Leitfaden entsteht aus zwei Quellen: aus den Anforderungen der Stelle und aus dem, was du über die konkrete Person noch nicht weißt.",
      },
      {
        type: "p",
        text: "Zeigt der Lebenslauf solide belegte Fachkenntnisse, aber nur eine behauptete Führungserfahrung, gehört die Führung ins Gespräch und nicht das Fachwissen. Das Gespräch ist die teuerste Stunde im ganzen Prozess, jede Frage sollte etwas klären. Für Aussagen aus dem Anschreiben, die der Lebenslauf nicht trägt, gilt dasselbe: Sie sind die besten Kandidaten für eine Nachfrage.",
      },
      {
        type: "quote",
        text: "Ein Interview ist kein Wiederholungstest für Dinge, die im Lebenslauf schon belegt sind. Es ist die Gelegenheit, das Unklare zu klären.",
      },
      { type: "h2", text: "Ablauf in fünf Schritten" },
      {
        type: "list",
        items: [
          "Anforderungen festlegen: drei bis fünf Punkte, die für den Erfolg in der Stelle wirklich zählen.",
          "Pro Anforderung eine bis zwei Fragen formulieren, verhaltensbasiert, offen.",
          "Für jede Frage Anker schreiben: wie klingt eine schwache, eine mittlere, eine starke Antwort.",
          "Im Gespräch Notizen machen und die Punkte direkt nach jeder Antwort festhalten, nicht erst am Ende.",
          "Erst danach mit anderen Beteiligten sprechen. Wer vorher die Meinung der Kollegin hört, übernimmt sie oft unbemerkt.",
        ],
      },
      { type: "h2", text: "Typische Einwände" },
      {
        type: "p",
        text: "„Das wirkt steif.“ Nur wenn du es steif führst. Feste Fragen schließen ein freundliches Gespräch nicht aus. Plane fünf Minuten am Anfang für Ankommen und am Ende für die Fragen der Bewerberin ein. Der Kern dazwischen bleibt strukturiert.",
      },
      {
        type: "p",
        text: "„Ich erkenne gute Leute auch so.“ Vielleicht. Aber du kannst es nicht prüfen, und deine Kolleginnen erkennen vielleicht andere. Die Struktur macht Urteile vergleichbar und damit besprechbar.",
      },
      {
        type: "p",
        text: "„Dafür fehlt die Zeit.“ Ein Leitfaden mit sechs Fragen und Ankern kostet beim ersten Mal etwa eine Stunde. Danach passt du ihn pro Stelle an. Das ist wenig im Vergleich zu einer Fehlbesetzung.",
      },
      { type: "h2", text: "Was du dafür bekommst" },
      {
        type: "p",
        text: "Vergleichbare Ergebnisse, eine dokumentierte Entscheidungsgrundlage bei Rückfragen und eine deutlich geringere Chance, jemanden einzustellen, der vor allem gut reden konnte. Und Bewerberinnen und Bewerber erleben ein Gespräch, in dem es um ihre Arbeit geht. Das kommt in aller Regel gut an.",
      },
    ],
    sources: [
      { label: "Schmidt, F. L. & Hunter, J. E. (1998). The validity and utility of selection methods in personnel psychology. Psychological Bulletin, 124(2), 262–274", url: "https://doi.org/10.1037/0033-2909.124.2.262" },
      { label: "Sackett, P. R., Zhang, C., Berry, C. M. & Lievens, F. (2022). Revisiting meta-analytic estimates of validity in personnel selection. Journal of Applied Psychology, 107(11), 2040–2068", url: "https://doi.org/10.1037/apl0000994" },
      { label: "DIN 33430:2016-07, Anforderungen an berufsbezogene Eignungsdiagnostik. Deutsches Institut für Normung" },
    ],
  },

  // ───────────────────────────────────────────────────────────────────────────
  {
    slug: "time-to-hire-senken",
    title: "Time-to-Hire senken: Wo die Wochen wirklich verloren gehen",
    cardTitle: "Time-to-Hire senken",
    excerpt:
      "Die meisten suchen die Verzögerung im Bewerbermangel. Tatsächlich vergeht die meiste Zeit an Stellen, die niemand misst: zwischen Eingang und Sichtung, zwischen Gespräch und Rückmeldung, zwischen Zusage und Vertrag.",
    metaDescription:
      "Time-to-Hire senken: Wo im Recruiting die Zeit wirklich verloren geht, wie du die Kennzahl sinnvoll misst und welche Stellschrauben ohne mehr Personal wirken.",
    keywords: [
      "Time to Hire senken",
      "Time to Fill",
      "Recruiting KPIs",
      "Bewerbungsprozess beschleunigen",
      "Recruiting Prozess optimieren",
    ],
    category: "Prozess & Kennzahlen",
    author: BLOG_AUTHOR,
    publishedAt: "2026-06-02",
    updatedAt: "2026-10-06",
    blocks: [
      {
        type: "p",
        text: "Wenn eine Stelle drei Monate offen bleibt, lautet die Erklärung meist: Der Markt gibt niemanden her. In manchen Berufen stimmt das. Die Bundesagentur für Arbeit weist in ihrer jährlichen Engpassanalyse eine ganze Reihe von Berufen aus, in denen Fachkräfte knapp sind [1], und in Österreich legt die Fachkräfteverordnung jedes Jahr eine Liste der Mangelberufe fest [2].",
      },
      {
        type: "p",
        text: "Häufiger verteilt sich die Zeit aber auf Wartephasen, die niemand protokolliert. Und anders als der Arbeitsmarkt liegen die in deiner Hand.",
      },
      { type: "h2", text: "Zwei Kennzahlen, die oft verwechselt werden" },
      {
        type: "p",
        text: "Time-to-Fill misst, wie lange eine Stelle offen ist: vom Start der Suche bis zur Zusage. Time-to-Hire misst, wie lange eine konkrete Person im Prozess ist: von ihrer Bewerbung bis zur Zusage. Die erste Zahl sagt dir, wie lange dir jemand fehlt. Die zweite sagt dir, wie lange gute Leute auf dich warten müssen, und damit, wie hoch das Risiko ist, dass sie vorher abspringen.",
      },
      {
        type: "p",
        text: "Für die Frage, wo dein Prozess Zeit verliert, ist die zweite Zahl die nützlichere.",
      },
      { type: "h2", text: "Zerlege die Kennzahl" },
      {
        type: "p",
        text: "Time-to-Hire als einzelne Zahl hilft nicht weiter. Nützlich wird sie erst, wenn du die Strecke in Abschnitte teilst:",
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
        text: "Miss das für die letzten zehn Besetzungen. Dafür brauchst du kein System: Die Zeitstempel stehen in deinem Postfach und deinem Kalender. In den meisten Fällen liegen zwei Abschnitte auffällig über dem Rest, und es sind selten die, die man vermutet.",
      },
      { type: "h2", text: "Die üblichen Verdächtigen" },
      { type: "h3", text: "Eingang bis Sichtung" },
      {
        type: "p",
        text: "Bewerbungen landen im Postfach und werden gesichtet, wenn jemand Zeit hat. Bei einer Stelle mit vierzig Bewerbungen bedeutet das oft eine Woche, bevor überhaupt etwas passiert. Kommen Bewerbungen über mehrere Wege, also Formular, Mail und Jobportal, wird es noch schlimmer, weil niemand den Überblick hat, was schon gelesen ist.",
      },
      {
        type: "p",
        text: "Das ist die Stelle, an der Automatisierung am meisten bringt. Wenn alle Bewerbungen an einem Ort landen und bei Eingang vorsortiert werden, beginnt deine Arbeit bei einer geordneten Liste statt bei einem Stapel.",
      },
      { type: "h3", text: "Einladung bis Gespräch" },
      {
        type: "p",
        text: "Terminfindung per Mail ist ein unterschätzter Zeitfresser. Drei Vorschläge, eine Gegenfrage, ein neuer Vorschlag: Schnell sind es vier Tage für einen einzigen Termin. Feste Gesprächsfenster und eine Buchung, bei der die Person selbst einen freien Termin wählt, lösen das Problem einmal und dauerhaft.",
      },
      { type: "h3", text: "Gespräch bis Rückmeldung" },
      {
        type: "p",
        text: "Hier verlierst du Kandidaten, nicht nur Zeit. Wer nach einem guten Gespräch zwei Wochen nichts hört, geht davon aus, dass es nichts wird, und nimmt das andere Angebot an.",
      },
      {
        type: "p",
        text: "Die Ursache ist fast immer dieselbe: Die Entscheidung hängt an einer Person, die im Urlaub ist oder auf eine weitere Meinung wartet. Ein fester Termin für die Nachbesprechung, direkt bei der Terminvergabe mitgeplant, hilft zuverlässiger als jede Erinnerungsmail. Muss die Fachabteilung mitreden, hol ihre Einschätzung vor dem Gespräch ein, nicht danach.",
      },
      { type: "h3", text: "Zusage bis Vertrag" },
      {
        type: "p",
        text: "Ein unterschätzter Abschnitt. Zwischen mündlicher Zusage und unterschriebenem Vertrag vergehen oft ein bis zwei Wochen, in denen die Person weiter für andere ansprechbar ist. Halte eine Vertragsvorlage bereit, kläre Gehalt und Startdatum im Gespräch, und schick den Vertrag am selben Tag.",
      },
      { type: "h2", text: "Was messbar hilft" },
      {
        type: "list",
        items: [
          "Vorsortieren bei Eingang. Nicht um die Entscheidung abzugeben, sondern um die Reihenfolge zu klären. Wer zuerst auf die zwanzig plausibelsten Bewerbungen schaut statt auf die zwanzig ältesten, ist schneller fertig.",
          "Feste Gesprächsfenster. Zwei Nachmittage pro Woche, dauerhaft geblockt.",
          "Eine Person, die für jede Stelle den nächsten Schritt verantwortet. Wenn alle zuständig sind, wartet jeder auf den anderen.",
          "Absagen sofort. Eine Absage, die zwei Wochen liegen bleibt, schadet deinem Ruf und blockiert deine eigene Übersicht.",
          "Eine kurze Eingangsbestätigung mit realistischem Zeitplan. Wer weiß, wann er etwas hört, wartet geduldiger.",
        ],
      },
      {
        type: "quote",
        text: "Schnelligkeit ist kein Selbstzweck. Aber die beste Bewerberin ist meistens auch die, die am wenigsten lange auf dich warten muss.",
      },
      { type: "h2", text: "Was du nicht optimieren solltest" },
      {
        type: "p",
        text: "Das Gespräch selbst. Ein Interview auf zwanzig Minuten zu kürzen spart eine halbe Stunde und kostet dich die Entscheidungsgrundlage. Dasselbe gilt für die Prüfung der Unterlagen: Schneller zu lesen ist kein Fortschritt, wenn du dabei die Passenden übersiehst. Kürze die Wartezeiten, nicht die Prüfung.",
      },
      { type: "h2", text: "So startest du" },
      {
        type: "p",
        text: "Nimm die nächste Stelle, die du besetzt, und schreib für jeden der fünf Abschnitte das Datum auf. Nach drei oder vier Stellen siehst du, wo es hakt. Dann änderst du genau einen Abschnitt und misst wieder. Das klingt unspektakulär, bringt aber mehr als jede große Umstellung auf einmal.",
      },
    ],
    sources: [
      { label: "Bundesagentur für Arbeit, Statistik: Engpassanalyse (jährlich)", url: "https://statistik.arbeitsagentur.de" },
      { label: "Fachkräfteverordnung (Österreich), jährliche Festlegung der Mangelberufe, abrufbar im Rechtsinformationssystem des Bundes", url: "https://www.ris.bka.gv.at" },
    ],
  },

  // ───────────────────────────────────────────────────────────────────────────
  {
    slug: "talent-pool-aktivieren",
    title: "Talent-Pool nutzen: Warum frühere Bewerber oft die besten Kandidaten sind",
    cardTitle: "Talent-Pool aktivieren",
    excerpt:
      "Die meisten Bewerberdatenbanken sind Friedhöfe. Dabei sitzen dort Menschen, die sich vor einem halben Jahr beworben haben und knapp nicht genommen wurden. Für eine neue Stelle sind das oft die besten Kandidaten, und du musst sie nicht erst finden.",
    metaDescription:
      "Talent-Pool im Recruiting nutzen: Wie du aus früheren Bewerbungen neue Besetzungen machst, ohne neue Anzeige und mit sauberer Einwilligung nach DSGVO.",
    keywords: [
      "Talent Pool aufbauen",
      "Bewerberpool DSGVO",
      "Bewerberdaten aufbewahren",
      "Recruiting Kosten senken",
      "Kandidaten Datenbank",
    ],
    category: "Sourcing",
    author: BLOG_AUTHOR,
    publishedAt: "2026-05-12",
    updatedAt: "2026-10-06",
    blocks: [
      {
        type: "p",
        text: "Fast jede Personalabteilung hat sie: eine Sammlung mit hunderten Bewerbungen aus den letzten Jahren. Und fast jede startet bei einer neuen Stelle trotzdem eine neue Anzeige.",
      },
      {
        type: "p",
        text: "Das ist erstaunlich, wenn man kurz nachrechnet. Eine Neuausschreibung kostet Anzeigenbudget, Zeit für die Sichtung und mehrere Wochen. Eine passende Person aus dem eigenen Bestand kostet eine Nachricht.",
      },
      { type: "h2", text: "Warum die Datenbank tot bleibt" },
      {
        type: "p",
        text: "Nicht aus Nachlässigkeit. Der Grund ist banal: Niemand weiß, wer da drin ist.",
      },
      {
        type: "p",
        text: "Eine Volltextsuche nach „Projektleiter“ findet die Leute, die genau dieses Wort im Lebenslauf stehen haben. Sie findet nicht die Teamleiterin, die faktisch Projekte geführt hat, es aber anders genannt hat. Und wer 400 Profile hat, liest sie nicht durch, um das herauszufinden.",
      },
      {
        type: "p",
        text: "Dazu kommt Unsicherheit beim Datenschutz. Viele wissen nicht genau, ob sie alte Bewerbungen überhaupt noch nutzen dürfen, und lassen sie deshalb lieber liegen. Diese Vorsicht ist berechtigt, dazu weiter unten mehr.",
      },
      { type: "h2", text: "Der Unterschied zwischen Suche und Abgleich" },
      {
        type: "p",
        text: "Eine Suche verlangt, dass du weißt, wonach du suchst. Ein Abgleich dreht das um: Das System nimmt die neue Stelle und prüft den vorhandenen Bestand dagegen.",
      },
      {
        type: "p",
        text: "Der praktische Unterschied ist groß. Statt „suche Projektleiter“ bekommst du „vier Personen aus deinem Bestand passen gut auf diese Stelle, und zwar aus diesen Gründen“. Damit kann man arbeiten.",
      },
      { type: "h2", text: "Die früheren Bewerber sind oft die besseren" },
      {
        type: "p",
        text: "Wer sich vor sechs Monaten auf eine ähnliche Stelle beworben hat, hat sich mit deinem Unternehmen schon beschäftigt. Die Person kennt Branche und Angebot und in vielen Fällen auch schon deine Ansprechpartner.",
      },
      {
        type: "p",
        text: "Dazu kommt: Ein knappes Nein bedeutet selten mangelnde Eignung. Häufiger war jemand anderes einen Tick passender, oder das Budget hat für die Seniorität nicht gereicht. Beides kann bei der nächsten Stelle ganz anders aussehen.",
      },
      { type: "h2", text: "Was datenschutzrechtlich gilt" },
      {
        type: "p",
        text: "Hier wird es konkret, und viele machen es falsch. Bewerbungsunterlagen dürfen nicht unbegrenzt aufbewahrt werden, um sie später für andere Stellen zu nutzen. Die Daten wurden für eine bestimmte Bewerbung erhoben und sind an diesen Zweck gebunden. Sie dürfen nur so lange gespeichert werden, wie es dafür nötig ist [1].",
      },
      {
        type: "p",
        text: "Wie lange das ist, hängt vor allem an den Fristen, in denen abgelehnte Bewerber Ansprüche wegen Diskriminierung geltend machen können. In Deutschland muss ein solcher Anspruch innerhalb von zwei Monaten nach der Absage schriftlich geltend gemacht werden [2], die Klage folgt dann binnen drei weiteren Monaten [3]. In Österreich beträgt die Frist für die gerichtliche Geltendmachung sechs Monate [4]. In der Praxis hat sich deshalb eingebürgert, Unterlagen etwa sechs Monate nach Abschluss des Verfahrens zu löschen.",
      },
      {
        type: "p",
        text: "Willst du jemanden länger im Bestand halten, brauchst du eine Einwilligung [5]. Die muss freiwillig sein, sich auf einen klaren Zweck beziehen und jederzeit widerrufbar sein. Und du musst sie nachweisen können [6]. Ist der Zweck erledigt oder wird die Einwilligung widerrufen, sind die Daten zu löschen [7].",
      },
      { type: "h3", text: "So holst du die Einwilligung sauber ein" },
      {
        type: "list",
        items: [
          "Am besten gleich im Bewerbungsformular, als eigenes Kästchen, das nicht vorausgewählt ist und keine Voraussetzung für die Bewerbung ist.",
          "Alternativ bei der Absage: kurz fragen, ob die Unterlagen für passende künftige Stellen im Bestand bleiben dürfen.",
          "Den Zweck genau benennen, etwa „für vergleichbare Stellen in unserem Unternehmen“, und eine Dauer angeben.",
          "Antwort und Datum dokumentieren. Ohne Einwilligung gilt die reguläre Löschfrist.",
          "Den Widerruf einfach machen: eine Mail an eine feste Adresse muss genügen.",
        ],
      },
      {
        type: "p",
        text: "Der Nebeneffekt ist angenehm: Eine Absage mit der Frage, ob du dich bei passenden Stellen wieder melden darfst, klingt deutlich wertschätzender als eine ohne.",
      },
      {
        type: "quote",
        text: "Ein Bewerberpool ohne dokumentierte Einwilligung ist kein Vermögenswert, sondern ein Risiko.",
      },
      { type: "h2", text: "Wie du frühere Bewerber ansprichst" },
      {
        type: "p",
        text: "Schreib persönlich und nimm Bezug auf die frühere Bewerbung. Zwei, drei Sätze reichen: welche Stelle offen ist, warum du an die Person gedacht hast und wie sie sich melden kann. Eine Massenmail an den ganzen Bestand ist das Gegenteil davon und wirkt auch so.",
      },
      {
        type: "p",
        text: "Rechne nicht damit, dass alle antworten. Manche haben inzwischen eine neue Stelle, andere sind nicht mehr wechselwillig. Aber wer antwortet, kommt mit Vorwissen und echtem Interesse in den Prozess, und das merkst du im Gespräch.",
      },
      { type: "h2", text: "Womit du anfängst" },
      {
        type: "p",
        text: "Sorg zuerst dafür, dass neue Bewerbungen die Möglichkeit zur Einwilligung haben. Damit wächst dein Bestand von jetzt an auf sauberer Grundlage. Prüf dann bei der nächsten offenen Stelle den vorhandenen Bestand, bevor du die Anzeige schaltest. Im schlechtesten Fall hast du einen Abgleich umsonst gemacht. Im besten Fall sparst du dir die Ausschreibung.",
      },
    ],
    sources: [
      { label: "Verordnung (EU) 2016/679 (Datenschutz-Grundverordnung), Art. 5 Abs. 1 lit. b und e (Zweckbindung, Speicherbegrenzung)", url: EUR_LEX_DSGVO },
      { label: "Allgemeines Gleichbehandlungsgesetz (Deutschland), § 15 Abs. 4", url: "https://www.gesetze-im-internet.de/agg/__15.html" },
      { label: "Arbeitsgerichtsgesetz (Deutschland), § 61b Abs. 1", url: "https://www.gesetze-im-internet.de/arbgg/__61b.html" },
      { label: "Gleichbehandlungsgesetz (Österreich), § 15 Abs. 1, abrufbar im Rechtsinformationssystem des Bundes", url: "https://www.ris.bka.gv.at" },
      { label: "Datenschutz-Grundverordnung, Art. 6 Abs. 1 lit. a (Einwilligung)", url: EUR_LEX_DSGVO },
      { label: "Datenschutz-Grundverordnung, Art. 7 (Bedingungen für die Einwilligung)", url: EUR_LEX_DSGVO },
      { label: "Datenschutz-Grundverordnung, Art. 17 (Recht auf Löschung)", url: EUR_LEX_DSGVO },
    ],
  },

  // ───────────────────────────────────────────────────────────────────────────
  {
    slug: "ki-matching-vs-keyword-suche",
    title: "KI-Matching statt Stichwortsuche: Warum Filter die Falschen aussortieren",
    cardTitle: "KI-Matching vs. Stichwortsuche",
    excerpt:
      "Filtert dein System nach Schlagworten, sortiert es zuverlässig alle aus, die dieselbe Fähigkeit anders benannt haben. Was der Unterschied zwischen Wortabgleich und inhaltlichem Verständnis in der Praxis bedeutet.",
    metaDescription:
      "KI-Matching statt Keyword-Filter: Warum Stichwortsuche im CV-Screening passende Bewerber aussortiert und woran du echtes inhaltliches Matching erkennst.",
    keywords: [
      "KI Matching Bewerber",
      "CV Screening Software",
      "Lebenslauf Analyse KI",
      "Keyword Filter Bewerbung",
      "semantisches Matching Recruiting",
    ],
    category: "Technologie",
    author: BLOG_AUTHOR,
    publishedAt: "2026-04-28",
    updatedAt: "2026-10-06",
    blocks: [
      {
        type: "p",
        text: "Viele Bewerbermanagementsysteme filtern nach Stichworten. Du gibst „React“ ein, das System zeigt alle Lebensläufe, in denen „React“ steht. Das klingt vernünftig und ist der Grund, warum viele passende Bewerber nie gesichtet werden.",
      },
      {
        type: "p",
        text: "Wie verbreitet das Problem ist, hat eine Studie der Harvard Business School gemeinsam mit Accenture untersucht. Die befragten Arbeitgeber räumten mehrheitlich ein, dass ihre Systeme geeignete Bewerber aussortieren, weil diese nicht exakt den vorgegebenen Kriterien entsprechen [1]. Die Autoren sprechen von „Hidden Workers“: Menschen, die arbeiten könnten und wollen, aber an Filtern scheitern.",
      },
      { type: "h2", text: "Das Grundproblem" },
      {
        type: "p",
        text: "Ein Lebenslauf ist kein Formular. Zwei Menschen mit derselben Qualifikation beschreiben sie unterschiedlich.",
      },
      {
        type: "p",
        text: "Wer seit vier Jahren mit Next.js arbeitet, beherrscht React, denn Next.js baut darauf auf. Steht „React“ aber nicht ausdrücklich im Lebenslauf, fällt die Person durch den Filter. Dasselbe gilt für PostgreSQL und SQL, für „Teamleitung“ und „Führungserfahrung“, für „Debitorenbuchhaltung“ und „Rechnungswesen“, für „Kfz-Mechatroniker“ und „Kraftfahrzeugtechniker“.",
      },
      {
        type: "p",
        text: "Die Aussortierten sind dabei nicht zufällig verteilt. Es trifft eher Quereinsteiger, Menschen mit Lücken im Lebenslauf und alle, die ihre Unterlagen nicht auf Suchbegriffe hin optimiert haben [1].",
      },
      { type: "h2", text: "Warum das auch rechtlich heikel ist" },
      {
        type: "p",
        text: "Starre Filter wirken neutral, können aber mittelbar benachteiligen. Eine scheinbar harmlose Vorgabe, die bestimmte Gruppen überdurchschnittlich oft ausschließt, kann nach dem Gleichbehandlungsrecht eine mittelbare Benachteiligung sein, wenn sie sachlich nicht gerechtfertigt ist [2]. Ein Filter auf „Muttersprache Deutsch“ für eine Stelle, die gutes Deutsch braucht, aber keine Muttersprache, ist ein typisches Beispiel.",
      },
      {
        type: "p",
        text: "Die europäische KI-Verordnung verlangt von Anbietern von Hochrisiko-Systemen im Recruiting außerdem, die Daten auf mögliche Verzerrungen zu prüfen und gegenzusteuern [3]. Ein Werkzeug, das nur Wörter zählt, hat dafür wenig zu bieten.",
      },
      { type: "h2", text: "Was inhaltliches Matching anders macht" },
      {
        type: "p",
        text: "Ein System, das Inhalte versteht, prüft nicht die Schreibweise, sondern die Sache. Es erkennt, dass Next.js React einschließt, und kann das auch begründen.",
      },
      {
        type: "p",
        text: "Der entscheidende Punkt ist die Begründung. Ein Abgleich, der „passt zu 84 Prozent“ ausgibt und sonst nichts, hat dir die Blackbox nur verschoben. Brauchbar wird es, wenn dabeisteht, welche Anforderung durch welche Erfahrung gedeckt ist, und welche nicht.",
      },
      { type: "h3", text: "Woran du echtes Verständnis erkennst" },
      {
        type: "list",
        items: [
          "Das System nennt zu jeder geforderten Fähigkeit, wodurch sie gedeckt ist, oder dass sie fehlt.",
          "Es unterscheidet, ob eine Fähigkeit nur in einer Liste steht oder in einer Position tatsächlich angewendet wurde.",
          "Es erkennt Lücken im Lebenslauf und benennt sie, statt sie zu überspielen.",
          "Es sagt, wenn eine Angabe unklar ist, statt eine Zahl zu erfinden.",
          "Es hält Muss-Kriterien getrennt fest. Fehlt eine zwingende Qualifikation, etwa eine Berufszulassung, kann eine gute Gesamtpassung das nicht ausgleichen.",
        ],
      },
      {
        type: "p",
        text: "Der vierte Punkt ist der wichtigste und der seltenste. Systeme, die bei fehlender Information wohlwollend raten, produzieren Zahlen, die gut aussehen und wenig bedeuten.",
      },
      { type: "h2", text: "Gelistet oder belegt" },
      {
        type: "p",
        text: "Eine Skill-Liste am Ende des Lebenslaufs ist eine Behauptung. Dieselbe Fähigkeit, die in einer beschriebenen Position vorkommt, ist ein Beleg.",
      },
      {
        type: "p",
        text: "Wer „Projektmanagement“ in der Liste stehen hat, kann alles zwischen einem Wochenendkurs und acht Jahren Verantwortung meinen. Wer schreibt, dass er die Einführung einer Warenwirtschaft mit sechs Beteiligten geleitet hat, hat es gezeigt. Ein gutes System behandelt diese beiden Fälle unterschiedlich. Ein Stichwortfilter kann es nicht.",
      },
      {
        type: "quote",
        text: "Die Frage ist nicht, ob ein Wort im Lebenslauf steht. Die Frage ist, ob die Person die Sache kann.",
      },
      { type: "h2", text: "Grenzen, die du kennen solltest" },
      {
        type: "p",
        text: "Auch inhaltliches Matching ist kein Orakel. Es arbeitet mit dem, was in den Unterlagen steht. Wer seine Erfahrung schlecht beschreibt, wird auch hier unterschätzt, nur seltener. Und versteckter Text in einem PDF, etwa weiße Schrift mit Schlagworten, sollte ein gutes System erkennen und ignorieren, statt sich davon beeinflussen zu lassen.",
      },
      {
        type: "p",
        text: "Darum gehört am Ende ein Mensch an die Entscheidung. Das Matching ordnet und begründet, du prüfst die Begründung und entscheidest. So sieht es auch das Datenschutzrecht vor, das rein automatisierte Entscheidungen mit erheblicher Wirkung nur in engen Ausnahmen zulässt [4].",
      },
      { type: "h2", text: "Was sich in der Praxis ändert" },
      {
        type: "p",
        text: "Rechne nicht damit, dass die Umstellung dir sofort mehr Spitzenkandidaten liefert. Der erste sichtbare Effekt ist meist ein anderer: Bewerbungen, die vorher unten lagen, rutschen nach oben, und beim Lesen ergibt ihre Position Sinn.",
      },
      {
        type: "p",
        text: "Der zweite Effekt zeigt sich bei den Absagen. Wenn du begründen kannst, warum jemand nicht passt, wird auch die Rückmeldung besser. Und der dritte ist leiser: Du verlierst weniger Leute, die du nie zu Gesicht bekommen hättest.",
      },
    ],
    sources: [
      { label: "Fuller, J. B., Raman, M., Sage-Gavin, E. & Hines, K. (2021). Hidden Workers: Untapped Talent. Harvard Business School, Project on Managing the Future of Work, und Accenture" },
      { label: "Allgemeines Gleichbehandlungsgesetz (Deutschland), § 3 Abs. 2 (mittelbare Benachteiligung); in Österreich § 19 Abs. 2 Gleichbehandlungsgesetz", url: "https://www.gesetze-im-internet.de/agg/__3.html" },
      { label: "Verordnung (EU) 2024/1689 (KI-Verordnung), Art. 10 (Daten und Daten-Governance) und Anhang III Nr. 4", url: EUR_LEX_AI_ACT },
      { label: "Verordnung (EU) 2016/679 (Datenschutz-Grundverordnung), Art. 22", url: EUR_LEX_DSGVO },
    ],
  },

  // ───────────────────────────────────────────────────────────────────────────
  {
    slug: "bewerbermanagement-software-auswahl",
    title: "Bewerbermanagement-Software für KMU: Woran Auswahlprojekte scheitern",
    cardTitle: "Software-Auswahl für KMU",
    excerpt:
      "Funktionslisten sind bei Bewerbermanagement-Anbietern erstaunlich austauschbar. Die Unterschiede zeigen sich an anderer Stelle: beim Einrichtungsaufwand, beim Umgang mit E-Mail-Bewerbungen und bei der Frage, was mit deinen Daten passiert.",
    metaDescription:
      "Bewerbermanagement-Software auswählen: Welche Kriterien für KMU wirklich zählen, welche Funktionen überschätzt werden und welche Fragen du Anbietern stellen solltest.",
    keywords: [
      "Bewerbermanagement Software",
      "ATS Software Vergleich",
      "Recruiting Software KMU",
      "Bewerbermanagement System einführen",
      "Applicant Tracking System",
    ],
    category: "Software-Auswahl",
    author: BLOG_AUTHOR,
    publishedAt: "2026-04-07",
    updatedAt: "2026-10-06",
    blocks: [
      {
        type: "p",
        text: "Wer Bewerbermanagementsysteme vergleicht, bekommt schnell den Eindruck, dass alle dasselbe können. Weitgehend stimmt das auch. Die Unterschiede liegen fast nie im Funktionsumfang, sondern darin, wie viel Aufwand nötig ist, bis das System im Alltag tatsächlich benutzt wird.",
      },
      { type: "h2", text: "Der häufigste Fehler bei der Auswahl" },
      {
        type: "p",
        text: "Unternehmen vergleichen Software anhand von Funktionslisten. Wer die längste Liste hat, gewinnt. Sechs Monate später nutzt das Team drei Funktionen und arbeitet für den Rest weiter mit Tabellen und Postfach.",
      },
      {
        type: "p",
        text: "Die bessere Frage lautet: Was passiert konkret, wenn morgen eine Bewerbung per E-Mail hereinkommt? Lass dir das in der Demo vorführen, mit einer echten Mail und einem echten PDF.",
      },
      { type: "h2", text: "Bevor du Anbieter anschaust" },
      {
        type: "p",
        text: "Schreib auf, wie Bewerbungen heute bei dir ankommen und wer was damit macht. Wie viele Stellen besetzt ihr pro Jahr, wie viele Bewerbungen kommen pro Stelle, wer liest sie, wer entscheidet? Diese halbe Seite ist der beste Maßstab für jede Demo, weil du damit sofort siehst, ob ein System zu euch passt oder zu einem Konzern.",
      },
      { type: "h2", text: "Kriterien, die für kleinere Unternehmen zählen" },
      { type: "h3", text: "Zeit bis zur ersten Stelle" },
      {
        type: "p",
        text: "Manche Systeme verlangen, dass du erst Abläufe, Rollen und Fragebögen konfigurierst. Für Konzerne sinnvoll. Für ein Unternehmen mit zwölf Einstellungen im Jahr bedeutet es oft, dass die Einführung an der Konfiguration hängen bleibt.",
      },
      {
        type: "p",
        text: "Frag, wie lange es dauert, bis die erste Stelle veröffentlicht ist. Wenn die Antwort in Wochen statt Stunden ausfällt, ist das für ein KMU ein Warnsignal.",
      },
      { type: "h3", text: "Umgang mit E-Mail-Bewerbungen" },
      {
        type: "p",
        text: "Im Mittelstand kommt ein erheblicher Teil der Bewerbungen weiterhin per Mail, oft an eine persönliche Adresse. Ein System, das nur über das eigene Formular funktioniert, verwaltet einen großen Teil deiner Bewerbungen nicht. Frag nach einer eigenen Bewerbungsadresse pro Stelle, deren Eingänge automatisch bei der richtigen Stelle landen.",
      },
      { type: "h3", text: "Was mit den Daten passiert" },
      {
        type: "p",
        text: "Bewerberdaten sind sensibel. Der Anbieter verarbeitet sie in deinem Auftrag, dafür brauchst du einen Vertrag zur Auftragsverarbeitung [1]. Der Anbieter muss außerdem angemessene technische und organisatorische Schutzmaßnahmen nachweisen können [2]. Und werden Daten außerhalb der EU verarbeitet, gelten zusätzliche Anforderungen an die Übermittlung [3].",
      },
      {
        type: "p",
        text: "Eine Frage gehört in jedes Anbietergespräch: Werden die Daten zum Training von KI-Modellen verwendet? Achte auf die Formulierung der Antwort. „Wir verkaufen keine Daten“ beantwortet die Frage nach dem Training nicht.",
      },
      { type: "h3", text: "Löschung" },
      {
        type: "p",
        text: "Bewerbungsunterlagen dürfen nur so lange gespeichert werden, wie es für den Zweck nötig ist [4]. Prüf, ob das System nach einer einstellbaren Frist automatisch löscht oder ob jemand das von Hand nachhalten muss. Von Hand bedeutet in der Praxis: gar nicht.",
      },
      { type: "h3", text: "KI-Funktionen" },
      {
        type: "p",
        text: "Viele Systeme werben inzwischen mit KI. Setzt die Software KI ein, um Bewerbungen zu sichten oder vorzusortieren, gilt sie nach der europäischen KI-Verordnung als Hochrisiko-System, und du hast als Betreiber eigene Pflichten [5]. Frag, ob es eine Gebrauchsanweisung dafür gibt, ob jede Einschätzung begründet wird und ob die Entscheidung bei dir bleibt.",
      },
      { type: "h3", text: "Betriebsrat" },
      {
        type: "p",
        text: "Gibt es einen Betriebsrat, binde ihn früh ein. In Deutschland ist die Einführung von Systemen, die Verhalten oder Leistung von Beschäftigten erfassen können, mitbestimmungspflichtig [6], in Österreich gelten für Personaldatensysteme eigene Regeln [7]. Wer das erst nach der Kaufentscheidung klärt, verliert Monate.",
      },
      { type: "h2", text: "Überschätzte Funktionen" },
      {
        type: "p",
        text: "Aufwendige Baukästen für Karriereseiten. Die meisten Unternehmen brauchen eine funktionierende Stellenseite mit einem Bewerbungsformular, das auf dem Handy läuft. Mehr wird selten genutzt.",
      },
      {
        type: "p",
        text: "Umfangreiche Auswertungen. Bei zwanzig Einstellungen im Jahr sind Diagramme über Bewerberquellen statistisch wenig aussagekräftig. Zwei Zahlen reichen meist: Wie lange dauert eine Besetzung, und woher kamen die Leute, die du eingestellt hast.",
      },
      {
        type: "p",
        text: "Unterschätzt wird dagegen oft, was nach dem Gespräch passiert: Absagen, die rechtzeitig und freundlich rausgehen, und eine Terminbuchung, die ohne Mailverkehr auskommt. Das spart im Alltag mehr Zeit als jedes Dashboard.",
      },
      {
        type: "quote",
        text: "Die beste Software ist die, mit der dein Team nach zwei Wochen noch arbeitet. Alles andere ist Funktionsumfang, den du mitbezahlst.",
      },
      { type: "h2", text: "Ein praktischer Test für die Demo" },
      {
        type: "p",
        text: "Bring eine echte Stellenausschreibung mit und lass sie im Termin anlegen. Bring einen anonymisierten Lebenslauf mit und lass ihn verarbeiten. Schick während des Termins eine Bewerbung per Mail und schau, wo sie landet.",
      },
      {
        type: "p",
        text: "Anbieter, die das nicht spontan vorführen können, zeigen dir eine vorbereitete Umgebung. Was du dabei siehst, hat mit deinem Alltag wenig zu tun.",
      },
      { type: "h2", text: "Checkliste für die Entscheidung" },
      {
        type: "list",
        items: [
          "Ist die erste Stelle an einem Tag veröffentlicht?",
          "Landen E-Mail-Bewerbungen automatisch bei der richtigen Stelle?",
          "Liegt ein Vertrag zur Auftragsverarbeitung vor, und wo werden die Daten verarbeitet?",
          "Werden die Daten zum Training von Modellen für andere genutzt?",
          "Löscht das System nach einer festen Frist von selbst?",
          "Begründet jede KI-Einschätzung sich mit Belegen, und entscheidest am Ende du?",
          "Ist der Vertrag monatlich kündbar, oder bindest du dich für Jahre?",
        ],
      },
    ],
    sources: [
      { label: "Verordnung (EU) 2016/679 (Datenschutz-Grundverordnung), Art. 28 (Auftragsverarbeiter)", url: EUR_LEX_DSGVO },
      { label: "Datenschutz-Grundverordnung, Art. 32 (Sicherheit der Verarbeitung)", url: EUR_LEX_DSGVO },
      { label: "Datenschutz-Grundverordnung, Art. 44 ff. (Übermittlung in Drittländer)", url: EUR_LEX_DSGVO },
      { label: "Datenschutz-Grundverordnung, Art. 5 Abs. 1 lit. e (Speicherbegrenzung)", url: EUR_LEX_DSGVO },
      { label: "Verordnung (EU) 2024/1689 (KI-Verordnung), Anhang III Nr. 4 und Art. 26", url: EUR_LEX_AI_ACT },
      { label: "Betriebsverfassungsgesetz (Deutschland), § 87 Abs. 1 Nr. 6", url: "https://www.gesetze-im-internet.de/betrvg/__87.html" },
      { label: "Arbeitsverfassungsgesetz (Österreich), § 96a, abrufbar im Rechtsinformationssystem des Bundes", url: "https://www.ris.bka.gv.at" },
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

/** Lesezeit in Minuten, aus der Wortzahl (rund 200 Wörter pro Minute). */
export function readingMinutes(post: BlogPost): number {
  const words = [post.excerpt, ...post.blocks.flatMap((b) => [b.text ?? "", ...(b.items ?? [])])]
    .join(" ")
    .split(/\s+/)
    .filter(Boolean).length
  return Math.max(3, Math.round(words / 200))
}

/** Datum in deutscher Schreibweise, z. B. "14. Juli 2026". */
export function formatBlogDate(iso: string): string {
  return new Date(iso).toLocaleDateString("de-DE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}
