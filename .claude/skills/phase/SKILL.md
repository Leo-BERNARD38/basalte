---
name: phase
description: Écrire le cahier d'une phase à venir dans son issue, ou clore une phase finie.
---

Une phase est une session de travail qui a un cahier. Le cahier **est le corps
de son issue de roadmap** : il se lit avant de commencer, et l'issue se ferme
quand la phase est finie. Il n'est écrit dans aucun fichier — un fichier de
suivi n'a pas d'état, et diverge en silence (D224).

Une phase porte un préfixe de titre `L<n> ·`, et un label de chantier. Un
chantier à plusieurs étapes a une **issue carte** parente, qui porte la table
des pré-requis et liste ses étapes en sous-issues : GitHub y affiche une barre
de progression, et c'est la seule page à ouvrir pour savoir où on en est.

## Ce qu'un cahier contient

Six paragraphes, dans cet ordre. Les titres sont fixes — un corps d'issue se
parcourt en diagonale, et un titre qui change fait perdre la ligne.

| Titre | Ce qu'il répond |
|---|---|
| **Objectif.** | quel manque existe aujourd'hui, constaté dans le code, avec le fichier |
| **Ce qu'elle produit.** | ce qui existera après, en une ou deux phrases |
| **Enjeux.** | ce qui est difficile, et ce qu'on paie si on tranche mal |
| **Déjà tranché.** | les invariants, décisions et documents que la phase ne rouvre pas |
| **À décider dans la phase.** | les questions qui lui appartiennent |
| **Terminé quand.** | le fait observable qui dit que c'est fini |

Les trois champs que le formulaire d'issue impose — `Objectif`, `Périmètre`,
`Terminé quand` — sont les trois premiers de cette liste sous d'autres noms :
« Périmètre » recouvre « ce qu'elle produit » et « déjà tranché ».

## Ce qu'un cahier ne contient pas

**Le comment.** Pas de noms de fichiers imposés, pas de signatures, pas d'ordre
des travaux. Décider à l'aveugle des détails d'un travail qu'on n'a pas commencé
produit des choix qu'on ne peut pas encore évaluer, qu'on suivra par discipline,
et qu'on paiera plus tard.

Si un cahier nomme quand même un fichier ou une commande, c'est une
**hypothèse** — un point de départ pour ne pas repartir de zéro. Écris-la en
italique, et la phase la remplacera librement.

## Les quatre épreuves

Avant d'ouvrir l'issue, éprouve-la :

1. **Le pourquoi tient-il sans la phase ?** Un manque doit se constater dans le
   code tel qu'il est, fichier à l'appui. « Ce serait mieux si » n'est pas un
   manque.
2. **Un enjeu a-t-il plus d'une réponse possible ?** Sinon ce n'est pas un
   enjeu, c'est une instruction déguisée — elle va dans « déjà tranché ».
3. **La phase laisse-t-elle vraiment quelque chose à décider ?** Une phase sans
   « à décider » est une spécification, et une spécification écrite d'avance est
   la dette que ce format évite.
4. **Le « terminé quand » est-il observable ?** Quelqu'un d'autre doit pouvoir
   le vérifier sans te demander ton avis. Une commande qui passe, un compteur
   qui tombe, un comportement qui change — jamais « c'est fait ».

## Ouvrir une phase

Le formulaire « Tâche » de l'interface, ou :

```
gh issue create --title "L2 · <nom>" --label <chantier> --body-file <fichier>
```

Un label de chantier neuf n'existe pas tant que `scripts/labels.mjs` ne le porte
pas : `gh` résout les labels strictement et refuse ceux qu'il ne connaît pas.
Ajoute-le au script, joue `node scripts/labels.mjs --dry-run`, applique, puis
crée l'issue.

## Clore une phase

Une phase finie **ferme son issue**. Ce qu'elle laisse derrière elle :

- ses décisions dans `docs/decisions.md`, chacune avec **l'alternative écartée
  et sa raison** — c'est la seule mémoire dont on ait besoin, puisque ce que le
  code fait se lit dans le code ;
- ce qu'elle a appris dans le document de son domaine — `panel.md`,
  `publication.md`, `securite.md` ;
- ce qu'elle a vu et écarté en **issue bloquée**, avec sa condition — voir la
  skill « consigner ».

Ne laisse **rien** d'autre : ni récit du travail, ni « ce qui restait ouvert »,
ni comparaison avec ce que la phase prévoyait. Un document qui raconte comment
on en est arrivé là se lit une fois et se relit jamais.
