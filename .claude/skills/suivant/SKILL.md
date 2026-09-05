---
name: suivant
description: Choisir la prochaine issue à prendre, et la confronter au code avant d'écrire une ligne.
---

Le suivi de ce dépôt vit dans ses issues, et nulle part ailleurs (D224). Cette
skill dit laquelle prendre, et ce qu'il faut faire avant de commencer.

## Ce que portent les issues

| Famille | On la reconnaît à | Ce que c'est |
|---|---|---|
| **Roadmap** | préfixe de titre `L1 ·`, `L2 ·`… (et `L1.1 ·` pour les étapes) + un label de chantier | ordonnée, séquencée par pré-requis |
| **Annexe** | label `annexe` | indépendant, faisable n'importe quand |
| **Bloqué** | label `bloque` | une condition n'est pas remplie — elle est citée en tête de corps |

Un défaut courant ne porte **aucune** des trois : c'est ce qui le fait passer en
premier. Un label `decision-porteur` se superpose : l'arbitrage n'appartient
qu'au porteur, et une session qui le trancherait à sa place ferait un travail
qu'il faudrait défaire.

**« En cours » = issue assignée.** Rien d'autre n'est un état.

## Choisir

```
gh issue list --state open --limit 100 --json number,title,labels,assignees
```

Dans cet ordre, on s'arrête au premier qui rend quelque chose :

1. **un défaut non bloqué** — label `bug`, sans `bloque` ;
2. **le plus petit `L<n>` dont les pré-requis sont fermés** — la carte du
   chantier porte la table des pré-requis, et sa barre de progression dit où on
   en est ;
3. **une annexe**, si le temps est court ;
4. **jamais un `bloque`** tant que sa condition n'est pas tombée. Si elle vient
   de tomber, dis-le dans l'issue avant de la prendre : c'est ce qui la rend
   prenable, et ce que quelqu'un cherchera plus tard.

Une issue déjà assignée à quelqu'un d'autre ne se prend pas.

## Avant d'écrire une ligne : confronter au code

Une issue est datée du jour où elle a été écrite. **Rien ne l'immunise contre ce
qui a tué le fichier de suivi qu'elle remplace.** Sur les deux autres dépôts du
porteur, neuf constats sur quarante-deux étaient faux en trois semaines — dont
cinq travaux annoncés « à faire » et déjà livrés.

Donc, avant tout : va lire les fichiers que l'issue nomme. Le manque doit se
constater dans le code tel qu'il est.

Trois issues sur quatre nomment un fichier et une ligne : c'est fait pour ça.

## Quand un constat est démenti

**Un item démenti ne devient rien.** Pas de contournement, pas de tâche de
remplacement, pas de ligne dans un fichier.

- Le sujet est déjà fait : ferme l'issue, en disant où c'est fait.
- Le sujet a changé de forme : réécris le corps de l'issue avant de commencer,
  pas après.
- Le constat est faux mais le sujet tient : corrige le constat dans l'issue.

Dans tous les cas, le démenti va dans le corps de la pull request. C'est là que
quelqu'un le cherchera.

## Pendant

Une pull request, un sujet, et elle référence son issue par `Closes #N` — ou
`Refs #N` si elle ne l'épuise pas. Un contrôle le vérifie et avertit.

Ce que la session décide se range selon la skill « consigner ».
