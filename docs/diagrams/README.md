# Diagramy projektu MoodFlow

Wszystkie diagramy są napisane w [Mermaid](https://mermaid.js.org/) — renderują się
bezpośrednio na GitHubie i w większości edytorów Markdown (VS Code, Cursor, Obsidian).

## Spis diagramów

| # | Diagram | Plik |
|---|---|---|
| 1 | Przypadków użycia (use case) | [01-use-cases.md](./01-use-cases.md) |
| 2 | Encyjno-relacyjny (ERD) | [02-erd.md](./02-erd.md) |
| 3 | Klas (UML) | [03-class.md](./03-class.md) |
| 4 | Sekwencji — wypełnienie testu | [04-sequence-assessment.md](./04-sequence-assessment.md) |
| 5 | Maszyna stanów — cykl życia konta | [05-state-user.md](./05-state-user.md) |
| 6 | Komponentów (architektura systemu) | [06-components.md](./06-components.md) |
| 7 | Wdrożenia (deployment) | [07-deployment.md](./07-deployment.md) |
| 8 | BPMN procesu rejestracji i pierwszego testu | [08-bpmn-onboarding.md](./08-bpmn-onboarding.md) |

## Eksport do PNG/SVG

Aby wyeksportować diagram do osobnego pliku:

```bash
# Mermaid CLI
npm install -g @mermaid-js/mermaid-cli
mmdc -i 02-erd.md -o 02-erd.png
```

Lub online: https://mermaid.live — wklej kod i wyeksportuj.

## Notacja

- **Aktorzy** — postacie ludzkie (`actor` w Mermaid).
- **Stany** — prostokąty zaokrąglone, przejścia ze strzałkami.
- **Encje (ERD)** — `||--o{` (jeden-do-wielu), `||--||` (jeden-do-jeden).
- **Klasy (UML)** — strzałki `-->` (zależność), `--|>` (dziedziczenie).
- **BPMN** — bramki decyzyjne `{}`, zdarzenia `[/.../]`, akcje `[...]`.
