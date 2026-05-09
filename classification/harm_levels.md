# Harm Level Classification System

All molecules and foods in this database are assigned a **harm level** from 0–5. This classification reflects potential harm **at dietary exposure levels**, not at extreme pharmacological doses.

---

## Scale

| Level | Code | Label | Definition |
|-------|------|-------|------------|
| 0 | `none` | No Known Harm | No adverse effects documented at any realistic dietary exposure. May be actively beneficial. |
| 1 | `negligible` | Negligible | Adverse effects documented only at doses >100× normal dietary exposure. Irrelevant for most people. |
| 2 | `low` | Low Risk | Mild adverse effects possible in sensitive subpopulations (e.g., allergic individuals, infants). No risk in healthy adults at normal intake. |
| 3 | `moderate` | Moderate Risk | Adverse effects documented within normal dietary ranges for some people. Risk increases with frequency/amount. Preparation can often reduce risk. |
| 4 | `high` | High Risk | Adverse effects at common consumption levels. Regulatory warnings exist. Should be avoided or significantly limited. |
| 5 | `critical` | Critical / Toxic | Acutely toxic at small doses. Can cause death or severe irreversible harm. Banned or highly restricted by regulatory authorities. |

---

## Evidence Requirements Per Level

- **Level 0–1:** Absence of adverse findings in published literature is sufficient.
- **Level 2–3:** At least 1 peer-reviewed human study or 2+ animal studies with relevance to dietary exposure.
- **Level 4:** Regulatory body ruling (EFSA, FDA, IARC, WHO, Health Canada) OR 3+ human studies.
- **Level 5:** Well-established toxicology; LD50 data in mammals; regulatory ban in at least 1 major jurisdiction.

---

## Adjusting for Context

A molecule may carry different effective harm levels depending on:
- **Dose:** Oxalic acid is `low` at typical spinach servings, `moderate` at daily raw spinach consumption, `critical` only at industrial concentrations.
- **Population:** Nitrate is `none` for healthy adults, `moderate` for infants under 6 months.
- **Preparation:** Phytohaemagglutinin (kidney bean lectin) is `high` raw, `none` after boiling.

When these distinctions exist, the **maximum realistic dietary harm level** is used in the database, with notes explaining the context.

---

*Classification based on: IARC Monographs, EFSA Scientific Opinions, US FDA GRAS database, WHO Technical Reports, and peer-reviewed epidemiological literature.*
