# BobApp — CI/CD, Qualité & Synthèse des métriques  

Document professionnel résumant la mise en place du pipeline CI/CD, les indicateurs de qualité retenus, ainsi que les premières métriques issues de SonarCloud et les retours utilisateurs.

---

# 1. Objectifs

- Automatiser la validation des contributions (PR).  
- Exécuter systématiquement : build, tests, couverture, analyse SonarCloud.  
- Générer les images Docker et les publier sur Docker Hub **uniquement si** la qualité est validée.  
- Améliorer la maintenabilité et réduire les régressions.  

---

# 2. Déclencheurs & logique CI/CD

BobApp fonctionne sur un monorepo `front/` (Angular) + `back/` (Spring Boot).

## Workflows **push** (CI)
Déclenchés sur un *push* de n’importe quelle branche :

- Front — Build, Tests, Coverage, Sonar (analyse non bloquante)  
- Back — Build, Tests, Coverage, Sonar (non bloquant sauf sur `main`)

 **Aucun push Docker** à ce stade.  
 Objectif : valider rapidement la qualité du code avant PR/merge.

## Workflows **merge vers main** (CD)
Déclenchés uniquement lorsqu’une PR est **merge dans `main`**.

- Re-build complet front / back  
- Quality Gate **enforcement**  
- Build Docker (front + back)  
- Publication Docker Hub (`latest` + `sha`)

 Ces workflows constituent le pipeline **CD officiel**.

---

# 3. Architecture du pipeline

```
                 PUSH (any branch)
              ┌──────────────────────┐
              │  CI                  │
              │  • build             │
              │  • tests             │
              │  • coverage          │
              │  • sonar (branch)    │
              └─────────┬────────────┘
                        │
     PR → MERGE into main (base=main)
              ┌────────────────────────┐
              │  CD                    │
              │  • build + tests       │
              │  • sonar (QG enforced) │
              │  • docker build        │
              │  • docker push         │
              └────────────────────────┘
```

---

# 4. Détails techniques par composant

## Backend (Spring Boot)

Actions réalisées :  
- Build & tests Maven  
- Couverture JaCoCo (XML)  
- Analyse SonarCloud (QG seulement sur merge/main)  
- Build image Docker (`bobapp-back`) lors du workflow CD  

Points clés :
- JDK 11 via Temurin  
- Rapport JaCoCo : `target/site/jacoco/jacoco.xml`  
- Docker tags : `latest`, `<sha-short>`  

## Frontend (Angular)

Actions réalisées :  
- Installation via `npm ci`  
- Tests Karma/Jasmine en ChromeHeadless  
- Couverture LCOV (`coverage/lcov.info`)  
- Analyse SonarCloud (QG seulement sur merge/main)  
- Build image Docker (`bobapp-front`) lors du workflow CD  

Points clés :
- Node 18  
- Chrome installé via `browser-actions/setup-chrome`  
- Docker tags : `latest`, `<sha-short>`  

---

# 5. KPIs Qualité

| KPI | Cible | Portée |
|------|--------|-----------|
| **Coverage global** | ≥ 80 % | Projet entier |
| **Coverage New Code** | ≥ 80 % | 30 derniers jours |
| **New Critical / Blocker issues** | 0 | New Code |
| **Maintainability Rating** | A | Global |
| **Reliability Rating** | A | Global |

 **Le Quality Gate SonarCloud bloque la release si l’un des KPI New Code n’est pas respecté.**  
 La génération Docker dépend du Quality Gate.

---

# 6. Premières métriques SonarCloud

| Métrique | Backend | Frontend |
|----------|---------|----------|
| Coverage global | 38.8 % | 52.6 % |
| Bugs | 1 | 0 |
| Vulnérabilités | 0 | 0 |
| Code Smells | 6 | 6 |
| Duplications | 0 % | 0 % |
| Quality Gate | ✔️ Pass | ✔️ Pass |

## Interprétation synthétique
- Les deux projets passent le **Quality Gate**, ce qui valide la qualité du New Code.  
- La couverture globale reste insuffisante (objectif : 80 %).  
- Code smells mineurs, absence de vulnérabilités.

---

# 7. Priorisation des retours utilisateurs

###  Problèmes critiques (P0)
- Crash navigateur sur la suggestion de blague.  
- Bug persistant sur l’upload vidéo.

###  Problèmes importants (P1)
- Notifications perdues / absence de réponse email.  
- Manque d’observabilité.

###  Problèmes secondaires (P2)
- Churn utilisateur : suppressions de favoris.

---
