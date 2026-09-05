---
name: consigner
description: Ranger ce qui vient d'être décidé, fait ou écarté, et retirer ce qui n'apprend plus rien.
---

La documentation de ce dépôt ne garde que ce qui **apprend encore quelque
chose**. Tout le reste est du contexte que quelqu'un relira, et qui lui coûtera
sans le renseigner.

## Où va ce qui vient d'être fait

| Ce que c'est | Où ça va |
|---|---|
| un choix qui engage le reste, avec une alternative crédible écartée | `docs/decisions.md`, numéroté |
| un comportement que le code porte désormais | le document du domaine : `panel.md`, `publication.md`, `securite.md`… |
| un sujet identifié et volontairement laissé de côté | **une issue `bloque`**, avec sa condition |
| un travail qu'on vient de finir | **nulle part** — le code le dit, `decisions.md` dit pourquoi |

Les deux dernières lignes sont celles qu'on oublie. Le récit d'un travail
accompli ne se range pas : il se supprime. Et un sujet laissé de côté ne
s'écrit **jamais dans un fichier** : un fichier de suivi n'a pas d'état — rien
ne force à le tenir, rien ne signale qu'il est périmé, il diverge en silence
(D224).

## Ouvrir une issue bloquée

Une issue `bloque` porte deux choses, jamais une : **le sujet**, et **la
condition** qui la débloquerait — citée en tête de corps, en blockquote.

La condition est la seule chose qui compte. Un sujet sans condition est un sujet
qu'on reprendra par ennui ou qu'on oubliera, jamais un sujet qu'on reprendra au
bon moment. Elle passe **trois épreuves**, et une seule ratée la disqualifie
(D225) :

1. **Observable.** Un fait qu'on remarquera sans le guetter.
   - oui — « la première fois qu'un bloc est recopié d'un dépôt à l'autre »
   - oui — « le jour où `@astrojs/check` accepte `^7` »
   - non — « quand on aura le temps », « si ça devient gênant »
   - non — « le premier site livré à quelqu'un qui navigue au clavier » : on ne
     sait jamais qui visite une page. Une condition qu'on ne peut pas constater
     ne tombe jamais, et l'issue n'est pas différée — elle est enterrée.
2. **Pas encore vraie.** Si elle est remplie à la seconde où le produit sert,
   ce n'est pas une condition : c'est une dette qu'on n'a pas voulu nommer.
   « Le premier site dont les messages ont de la valeur » est vrai du premier
   client payant — une landing sert à récolter des leads.
3. **Sans réponse déjà écrite.** Si une décision numérotée porte à la fois la
   question et sa réponse, l'issue en est un doublon : elle vieillira à côté,
   et c'est la décision qu'on relira de toute façon.

Vérifie aussi que la condition **est celle de l'objectif**. Le carousel
attendait « plus d'images qu'une page n'en porte » quand son intérêt était le
défilement contraint : la condition écrite était déjà remplie par `gallery`, et
sa réalisation n'apprenait rien.

**Pas de condition, pas d'issue.** Si tu n'en trouves pas, c'est que le sujet
n'a pas encore de raison d'exister : ne l'écris pas.

Le formulaire « Bloqué » de l'interface impose les quatre champs, dans l'ordre.
Le corps dit aussi **l'état actuel constaté dans le code**, fichier et ligne à
l'appui : c'est ce qui permet à la session qui la prendra de vérifier que le
constat tient encore.

Si une décision numérotée a écarté le sujet, dis-la : la rouvrir demande
d'acter la décision inverse, pas de la contourner. Et si cette décision porte
déjà ce qui la ferait tomber, n'ouvre rien — c'est la troisième épreuve.

## Retirer

À faire à chaque fois que l'occasion se présente, pas dans un grand ménage :

- **une issue dont le sujet a été fait, ou dont la condition ne se produira
  plus** : ferme-la, en disant pourquoi ;
- une phrase au futur sur un travail désormais fait (« la phase 10 lui
  adjoindra ») : mets-la au présent, ou supprime-la ;
- une section titrée par une étape du projet plutôt que par son sujet — un
  lecteur cherche « les adresses des messages », jamais « ce que la phase 5 a
  ajouté » ;
- une hypothèse qu'une phase a remplacée ;
- **un compte écrit à la main** — « le socle en fournit sept » — qui sera faux à
  la phase suivante. Renvoie à `basalte inventory`, qui le produit depuis le
  code.

Garde en revanche ce qui **date un mécanisme pour dire une compatibilité** :
« un bloc écrit avant la phase 8 continue de fonctionner » apprend quelque chose
à qui maintient un vieux site.

## Deux gardes tiennent ce document

Elles ne remplacent pas le jugement, elles rattrapent l'oubli :

- **`basalte lint`, règle `docs/reference`** : un chemin de document cité dans
  le dépôt doit exister. Supprimer un fichier sans corriger ses renvois échoue,
  à l'endroit fautif.
- **le contrôle « Issue liée »** : une pull request qui ne référence aucune
  issue est signalée.

## L'épreuve

Devant un paragraphe, une question suffit : **qu'est-ce que quelqu'un fera
différemment après l'avoir lu ?** Si la réponse est « rien », il part.
