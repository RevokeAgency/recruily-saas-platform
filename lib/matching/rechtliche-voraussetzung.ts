// ─────────────────────────────────────────────────────────────────────────────
// Was darf einen Bewerber ausschließen?
//
// Regel (Vorgabe 23.11.2026): Ausschließen darf nur, ohne das jemand die
// Tätigkeit rechtlich nicht ausüben darf. Alles andere ist eine Anforderung,
// die in den Score eingeht, aber niemanden aussortiert. Viele Unternehmen
// schreiben „Studium (Uni/FH)“ in die Anzeige und nehmen dann gute Leute mit
// Berufserfahrung.
//
// Die Prüfung ist bewusst im Code und nicht beim Modell: Ein Modellurteil
// allein hat „Technische Ausbildung (Uni/FH)“ als Berufszulassung eingestuft
// und eine Floristin mit 13 Jahren Erfahrung auf 12 % gedeckelt.
//
// Ausschließen kann eine Anforderung nur, wenn ihr Wortlaut eine rechtliche
// Voraussetzung nennt (Berufsberechtigung, Registereintrag, Approbation,
// Arbeitserlaubnis, Führerschein, gesetzlich vorgeschriebener Nachweis oder
// ein reglementierter Gesundheits-, Rechts- oder Prüfberuf). Ein Studium, eine
// Lehre, die Matura, Jahre an Erfahrung, Sprachen oder Software tun es nie.
// ─────────────────────────────────────────────────────────────────────────────

function fold(s: string): string {
  return s
    .toLowerCase()
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
}

/** Wortlaut, der eine rechtliche Voraussetzung nennt. */
const RECHTLICH: RegExp[] = [
  // Berechtigungen, Zulassungen, Register
  /berufsberechtigung|berufszulassung|berufsausuebungs|zulassung (als|zum|zur)|approbation|nostrifi|berufsanerkennung|anerkennung (als|des|der) (berufs|abschluss|ausbildung)/,
  /(eintragung|registrierung) (in|im|ins|als|bei)\b|berufsregister|gesundheitsberuferegister|kammermitglied|kammerzugehoerigkeit/,
  // Aufenthalt und Arbeit
  /arbeitserlaubnis|arbeitsberechtigung|arbeitsbewilligung|aufenthaltstitel|aufenthaltsbewilligung|rot[- ]weiss[- ]rot|beschaeftigungsbewilligung|work permit|right to work/,
  // Fahren und Bedienen, wenn die Anzeige es als Schein verlangt
  /fuehrerschein|lenkberechtigung|fahrerlaubnis|staplerschein|stapelerschein|kranschein|kranfuehrerschein|adr[- ]schein|berufskraftfahrer|c95|code 95|fahrerkarte|bootsfuehrerschein|pilotenlizenz|fluglizenz/,
  // Gesetzlich vorgeschriebene Nachweise
  /befaehigungsnachweis|sachkundenachweis|sachkundepruefung|gewerbeberechtigung|konzession|waffenbesitzkarte|waffenpass|strahlenschutz|sicherheitsueberpruefung|ermaechtigung|gesetzlich vorgeschrieben/,
  // Reglementierte Berufe, wenn der Beruf selbst verlangt wird
  /\b(dgkp|pflegefachassistenz|pflegeassistenz|diplomierte gesundheits|hebamme|arzt|aerztin|fachaerztin|facharzt|zahnarzt|zahnaerztin|apotheker|apothekerin|psychotherapeut|psychotherapeutin|klinische[rn]? psycholog\w*|gesundheitspsycholog\w*|physiotherapeut|physiotherapeutin|ergotherapeut|ergotherapeutin|logopaed\w*|diaetolog\w*|radiologietechnolog\w*|biomedizinische[rn]? analytiker\w*|notfallsanitaeter\w*|rettungssanitaeter\w*)\b/,
  /\b(rechtsanwalt|rechtsanwaeltin|notar|notarin|steuerberater|steuerberaterin|wirtschaftspruefer|wirtschaftsprueferin|bilanzbuchhalter|bilanzbuchhalterin|ziviltechniker|ziviltechnikerin|ingenieurkonsulent|baumeister|baumeisterin|lehramt\w*|lehrbefaehigung|elementarpaedagog\w*)\b/,
]

/**
 * Nennt der Wortlaut eine rechtliche Voraussetzung? Nur dann darf eine
 * Anforderung ausschließen oder den Score deckeln.
 */
export function istRechtlicheVoraussetzung(anforderung: string): boolean {
  const t = fold(anforderung ?? "")
  return RECHTLICH.some((re) => re.test(t))
}

/**
 * K.O.-Kriterien des Kunden aufteilen: rechtliche bleiben K.O., alles andere
 * wird zur Muss-Anforderung, die in den Score eingeht und niemanden ausschließt.
 */
export function splitKoCriteria(ko: string[] | null | undefined): { rechtlich: string[]; anforderung: string[] } {
  const rechtlich: string[] = []
  const anforderung: string[] = []
  for (const k of ko ?? []) {
    const t = k?.trim()
    if (!t) continue
    ;(istRechtlicheVoraussetzung(t) ? rechtlich : anforderung).push(t)
  }
  return { rechtlich, anforderung }
}
