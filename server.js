const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const PROFIL = `LEBENSLAUF: Anne Charlotte Forstmann. MSc Psychology of Economic Life (LSE, Distinction, Rob Farr Award). BSc Politics/Psychology/Law/Economics (UvA, 2:1). Wissenschaftliche Mitarbeiterin TU Braunschweig seit 11/2023: empirische Studien (qual/quant/Computational Methods/ML), Projektkoordination Museum fuer Naturkunde Berlin, Drittmittelprojekt, Konferenzen, Lehre, Newsletter. 180 Degrees Consulting Amsterdam: 25+ Berater geschult (McKinsey 7-Step, BCG), 10 NGO-Klienten in 3 Laendern (NL/Ruanda/Libanon), 100% Lieferquote. Scribbr: Teamleitung, Prozessdesign, Skalierung, SCRUM/OKRs. Skills: R, SPSS, Qualtrics, Atlas.ti, Asana, Notion, Power BI (laufend), SQL (laufend). Sprachen: DE, EN C2, ES B2, NL B1. Zertifikate: Projektmanagement (GradTUBS 2025), Computational Text Analysis R (GESIS 2024).
PRAEFERENZEN: Klein-Team (2-5), Hybrid, Dienstreisen gerne, viel Abwechslung. Aufgaben: Forschung/Analyse, Beratung/Strategie, Projektmanagement. Gesellschaftlicher Impact + Einfluss auf Strategie wichtig. Branchen: Beratung, NGO/Social Impact, Tech/Daten, Wissenschaft. Grosskonzern oder Startup. Karriereziel: Fuehrungskraft (People & Strategy) 3-5 Jahre. Gehalt: 55.000-70.000 EUR.`;

app.post('/api/analyze', async (req, res) => {
  const { text } = req.body;
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!text) return res.status(400).json({ error: 'Kein Text angegeben.' });
  if (!apiKey) return res.status(500).json({ error: 'API Key nicht konfiguriert.' });

  const prompt = `Du bist ein Karrierecoach. Analysiere diese Stellenanzeige fuer Anne Forstmann. Antworte NUR mit einem JSON-Objekt – keine Backticks, kein anderer Text.

PROFIL:
${PROFIL}

SCORING (0-100):
- cv: Fit Lebenslauf zu Stelle
- pref: Fit Arbeitsweise/Aufgaben zu Praeferenzen
- salary: 100=55-70k perfekt, 75=nah dran, 50=keine Angabe/unklar, 20=weit daneben
- career: Foerdert Karriereziel Fuehrungskraft People & Strategy?
- totalScore = EXAKT runden(cv*0.35 + pref*0.30 + salary*0.20 + career*0.15)
Falls Gehalt fehlt: schaetze realistisch z.B. "ca. 58-68k EUR (Schaetzung Stepstone)".
Falls Firmeninfo fehlt: ergaenze 1 Satz aus deinem Wissen.

ANTWORTE NUR MIT DIESEM JSON:
{"firma":"...","rolle":"...","ort":"...","remote":"Remote|Hybrid|Vor Ort|k.A.","gehalt":"...","recruiter":"Name + Email oder leer","unternehmen_info":"1 Satz zu Groesse/Branche/Kultur","scores":{"cv":0,"pref":0,"salary":0,"career":0},"totalScore":0,"kernaufgaben":["...","...","..."],"staerken":["...","..."],"luecken":["...","..."],"begruendung":"2-3 Saetze Gesamteinschaetzung"}

STELLENANZEIGE:
${text.substring(0, 7000)}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();
    if (!data.content) throw new Error(data.error?.message || 'API Fehler');

    let raw = data.content.map(c => c.text || '').join('').replace(/```json|```/g, '').trim();
    const job = JSON.parse(raw);
    job.totalScore = Math.round(
      (job.scores?.cv || 0) * 0.35 +
      (job.scores?.pref || 0) * 0.30 +
      (job.scores?.salary || 0) * 0.20 +
      (job.scores?.career || 0) * 0.15
    );
    res.json(job);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/ping', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server läuft auf Port ${PORT}`));
