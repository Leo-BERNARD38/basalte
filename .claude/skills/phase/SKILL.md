---
name: phase
description: Écrire le cahier d'une phase à venir, ou clore une phase finie.
---

Une phase est une session de travail qui a un cahier dans
`docs/implementation.md`. Le cahier se lit avant de commencer, et disparaît
quand la phase est close.

## Ce qu'un cahier contient

Six paragraphes, dans cet ordre. Les titres sont fixes — `implementation.md`
se parcourt en diagonale, et un titre qui change fait perdre la ligne.

| Titre | Ce qu'il répond |
|---|---|
| **Pourquoi.** | quel manque existe aujourd'hui, constaté dans le code, avec le fichier |
| **Ce qu'elle produit.** | ce qui existera après, en une ou deux phrases |
| **Enjeux.** | ce qui est difficile, et ce qu'on paie si on tranche mal |
| **Déjà tranché.** | les invariants, décisions et documents que la phase ne rouvre pas |
| **À décider dans la phase.** | les questions qui lui appartiennent |
| **Finie quand.** | le fait observable qui dit que c'est fini |

## Ce qu'un cahier ne contient pas

**Le comment.** Pas de noms de fichiers imposés, pas de signatures, pas
d'ordre des travaux. Décider à l'aveugle des détails d'un travail qu'on n'a pas
commencé produit des choix qu'on ne peut pas encore évaluer, qu'on suivra par
discipline, et qu'on paiera plus tard.

Si un cahier nomme quand même un fichier ou une commande, c'est une
**hypothèse** — un point de départ pour ne pas repartir de zéro. Écris-la en
italique, et la phase la remplacera librement.

## Les quatre épreuves

Avant d'écrire un cahier, éprouve-le :

1. **Le pourquoi tient-il sans la phase ?** Un manque doit se constater dans le
   code tel qu'il est, fichier à l'appui. « Ce serait mieux si » n'est pas un
   manque.
2. **Un enjeu a-t-il plus d'une réponse possible ?** Sinon ce n'est pas un
   enjeu, c'est une instruction déguisée — elle va dans « déjà tranché ».
3. **La phase laisse-t-elle vraiment quelque chose à décider ?** Une phase sans
   « à décider » est une spécification, et une spécification écrite d'avance est
   la dette que ce format évite.
4. **Le « finie quand » est-il observable ?** Quelqu'un d'autre doit pouvoir le
   vérifier sans te demander ton avis.

## Clore une phase

Une phase finie **retire son cahier** de `docs/implementation.md` — il a servi,
il n'apprend plus rien, et il coûte à chaque lecture du document.

Ce qu'elle laisse derrière elle :

- une ligne dans la table « Ce qui est fait », qui dit ce que la phase a mis en
  place et sa plage de décisions ;
- ses décisions dans `docs/decisions.md`, chacune avec **l'alternative écartée
  et sa raison** — c'est la seule mémoire dont on ait besoin, puisque ce que le
  code fait se lit dans le code ;
- ce qu'elle a appris dans le document de son domaine — `panel.md`,
  `publication.md`, `securite.md` ;
- ce qu'elle a vu et écarté dans `docs/roadmap.md`, avec son déclencheur — voir
  la skill « consigner ».

Ne laisse **rien** d'autre : ni récit du travail, ni « ce qui restait ouvert »,
ni comparaison avec ce que la phase prévoyait. Un document qui raconte comment
on en est arrivé là se lit une fois et se relit jamais.
