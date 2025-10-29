# BobApp -- CI/CD & Qualité

**Auteur :** Sébastien GERARD
**Dernière mise à jour :** 29/10/2026

Ce document décrit le workflow CI/CD mis en place sur GitHub Actions
pour BobApp (monorepo **/back** Spring Boot + **/front** Angular),
propose des **KPI qualité**, et présente une **analyse initiale** des
métriques et des retours utilisateurs (Notes & Avis). Il sert de
référence pour les contributeurs et pour la revue avec Bob.

------------------------------------------------------------------------

## 1) Objectifs

-   Automatiser la validation des contributions (PR) : build, tests,
    qualité code.
-   Générer et publier des **rapports de couverture** (JaCoCo pour back,
    Karma/Jasmine pour front) et l'analyse **SonarCloud**.
-   Builder et publier les **images Docker** (front & back) vers Docker
    Hub **uniquement si** toutes les étapes amont ont réussi.
-   Élever le niveau de qualité, réduire les régressions et accélérer
    les itérations.

------------------------------------------------------------------------

## 2) Pré-requis & secrets

-   **SonarCloud** : `SONAR_TOKEN` (Repository secret).
-   **Docker Hub** : `DOCKER_USERNAME`, `DOCKER_PASSWORD` (Repository
    secrets).\
-   **Java** : JDK 11 (ou 17 si le projet migre).
-   **Node** : version compatible Angular du projet
    (cf. `front/package.json`).

> *Astuce* : Activer le **caching** Maven et npm pour accélérer les
> jobs.

------------------------------------------------------------------------

## 3) Déclencheurs (triggers)

Le workflow principal est déclenché sur : - `pull_request` vers `main` →
**validation PR** (sans push Docker). - `push` sur branches → analyse de
qualité + build. - `push` sur `main` → **Quality Gate SonarCloud**
**enforced** + **push Docker** si QG OK.

------------------------------------------------------------------------

## 4) Vue d'ensemble du pipeline

               PR / push            push on main
                 │                       │
         ┌───────▼───────┐        ┌──────▼──────┐
         │ Sanity checks │        │  Sanity     │
         └───────┬───────┘        └──────┬──────┘
                 │                       │
         ┌───────▼─────────┐      ┌──────▼─────────┐
         │ Backend (Maven) │      │ Frontend (npm) │
         │ test + coverage │      │ test + coverage│
         └───────┬─────────┘      └──────┬─────────┘
                 │                       │
         ┌───────▼──────────┐     ┌──────▼──────────┐
         │ Sonar (branch)   │     │ Sonar (branch)  │
         │  (no gate)       │     │  (no gate)      │
         └────────┬─────────┘     └────────┬────────┘
                  │                         │
         push on main only →  ┌─────────────▼─────────────┐
                              │ Sonar (main, wait QG=OK) │
                              └─────────────┬─────────────┘
                                            │
                              ┌─────────────▼─────────────┐
                              │ Docker build & Docker push│
                              └────────────────────────────┘

------------------------------------------------------------------------

## 5) Détail des jobs & étapes

### 5.1 Sanity (rapide)

Objectif : vérifier la structure du repo et exposer quelques infos
utiles. - `actions/checkout@v4` - Listing des fichiers clés (`pom.xml`,
`back/pom.xml`, `front/package.json`, etc.)

### 5.2 Backend (Maven)

Objectif : compiler, tester, mesurer la couverture, analyser la qualité,
puis builder l'image Docker. 1. **Checkout** 2. **Setup JDK** (11) 3.
**Cache Maven** 4. `mvn -f back/pom.xml clean verify` 5. **Couverture**
JaCoCo : `mvn -f back/pom.xml jacoco:report`\
*Rapport*: `back/target/site/jacoco/index.html` 6. **SonarCloud --
branches ≠ main** : analyse sans attendre le Quality Gate\
`uses: SonarSource/sonarcloud-github-action@v2` (`projectBaseDir: back`)
7. **SonarCloud -- main** : `args: -Dsonar.qualitygate.wait=true` 8.
**Docker build** : `docker build -t <user>/bobapp-back:<tag> back/` 9.
**Docker push** (uniquement si QG OK & sur main)

### 5.3 Frontend (Angular)

Objectif : installer, tester avec couverture, analyser la qualité, puis
builder l'image Docker. 1. **Checkout** 2. **Setup Node** (via
`actions/setup-node@v4`) 3. **Cache npm** 4. `npm ci` (ou `npm install`
selon le projet) 5. **Tests + coverage** :
`ng test --watch=false --code-coverage` *Rapport*: `front/coverage/`
(lcov export) 6. **SonarCloud -- branches ≠ main** : analyse
(`projectBaseDir: front`) 7. **SonarCloud -- main** :
`-Dsonar.qualitygate.wait=true` 8. **Docker build** :
`docker build -t <user>/bobapp-front:<tag> front/` 9. **Docker push**
(uniquement si QG OK & sur main)

> *Remarque* : Le **tag** Docker peut être `git-sha`, `latest` sur main,
> et `branch-<name>` sur branches.

------------------------------------------------------------------------

## 6) KPIs proposés (cibles)

  -----------------------------------------------------------------------
  KPI                     Cible                   Portée
  ----------------------- ----------------------- -----------------------
  **Coverage (global)**   **≥ 80%**               Projet entier

  **Coverage (New Code)** ≥ 80%                   Fichiers modifiés sur
                                                  30 jours glissants

  **New Critical/Blocker  **= 0**                 Sur le **New Code**
  Issues**                                        

  Maintainability Rating  A                       Global

  Reliability Rating      A                       Global
  -----------------------------------------------------------------------

> *Enforcement* : Le **Quality Gate** SonarCloud doit échouer si l'un
> des KPI « New Code » n'est pas respecté. La publication Docker en
> dépend.

------------------------------------------------------------------------

## 7) Métriques actuelles (après première exécution)

| Métrique | Backend | Frontend | Source |
|-----------|----------|-----------|--------|
| **Coverage global** | **38.8 %** | **0.0 %** | SonarCloud > Measures |
| **Coverage New Code** | _(non affiché)_ | _(non affiché)_ | SonarCloud > Quality Gate |
| **Bugs** | **1** | **0** | SonarCloud > Issues |
| **Vulnerabilities** | **0** | **0** | SonarCloud > Issues |
| **Code Smells** | **6** | **6** | SonarCloud > Issues |
| **Duplications** | **0.0 %** | **0.0 %** | SonarCloud > Measures |
| **Quality Gate (main)** | ✅ **Passed** | ✅ **Passed** | SonarCloud |

### 🧭 Interprétation rapide
- **Backend** : couverture correcte pour un début (38.8 %), mais encore loin de l’objectif de 80 %. Un bug et quelques *code smells* à corriger.  
- **Frontend** : aucun bug ni vulnérabilité, mais la couverture à 0 % indique que les tests ne sont pas encore reliés à Sonar (à corriger via `sonar-project.properties`).  
- **Quality Gate** : les deux modules **ont passé** le contrôle, donc la pipeline CI/CD est considérée comme **valide**.


------------------------------------------------------------------------

## 8) Notes & Avis utilisateurs -- synthèse et priorisation

-   ❗ *Bouton suggestion de blague* : crash navigateur → **blocant
    UX**.
-   ❗ *Post vidéo* : bug signalé non corrigé → **défaut non résorbé**.
-   ⚠️ *Notifications perdues* + pas de réponse email → **problème de
    fiabilité**.
-   ⚠️ *Churn* : suppression du site → **insatisfaction**.

### Priorités

1.  **P0 -- Corriger les flux critiques** : suggestion & upload vidéo.
2.  **P1 -- Observabilité** : ajout monitoring, logs structurés.
3.  **P2 -- Process qualité** : branch protection, tests E2E ciblés.

------------------------------------------------------------------------

## 9) Recommandations

-   Ajouter tests unitaires & E2E sur parcours critiques.
-   Activer New Code Definition (30 jours) sur SonarCloud.
-   Publier artefacts coverage (lcov, JaCoCo).
-   Enrichir tagging Docker : `:latest` + `:<sha>`.
-   Mettre en place **CODEOWNERS** + **branch protection**.

------------------------------------------------------------------------

## 10) Check-list finale

-   [ ] Secrets configurés (`SONAR_TOKEN`, `DOCKER_USERNAME`,
    `DOCKER_PASSWORD`).
-   [ ] Pipeline CI/CD verte sur PR et main.
-   [ ] Quality Gate **passé**.
-   [ ] Images Docker poussées.
-   [ ] Tableau de métriques rempli.
-   [ ] Tickets P0/P1 créés selon priorités.
