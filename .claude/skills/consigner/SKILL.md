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
| un sujet identifié et volontairement laissé de côté | `docs/roadmap.md`, avec son déclencheur |
| un travail qu'on vient de finir | **nulle part** — le code le dit, `decisions.md` dit pourquoi |

La dernière ligne est celle qu'on oublie. Le récit d'un travail accompli ne se
range pas : il se supprime.

## Écrire dans la roadmap

Une ligne de `roadmap.md` porte deux choses, jamais une : **le sujet**, et **ce
qui le ferait revenir**.

Le déclencheur est la seule chose qui compte. Un sujet sans déclencheur est un
sujet qu'on reprendra par ennui ou qu'on oubliera — jamais un sujet qu'on
reprendra au bon moment. Il se formule en fait observable :

- oui — « la première fois qu'un bloc est recopié d'un dépôt à l'autre »
- oui — « le premier client qui paie de la publicité »
- non — « quand on aura le temps », « si ça devient gênant »

**Pas de déclencheur, pas de ligne.** Si tu n'en trouves pas, c'est que le sujet
n'a pas encore de raison d'exister : ne l'écris pas.

## Retirer

À faire à chaque fois que l'occasion se présente, pas dans un grand ménage :

- une ligne de roadmap dont le sujet a été fait, ou dont le déclencheur ne se
  produira plus ;
- un cahier de phase close — voir la skill « phase » ;
- une phrase au futur sur un travail désormais fait (« la phase 10 lui
  adjoindra ») : mets-la au présent, ou supprime-la ;
- une section titrée par une étape du projet plutôt que par son sujet — un
  lecteur cherche « les adresses des messages », jamais « ce que la phase 5 a
  ajouté » ;
- une hypothèse qu'une phase a remplacée.

Garde en revanche ce qui **date un mécanisme pour dire une compatibilité** :
« un bloc écrit avant la phase 8 continue de fonctionner » apprend quelque chose
à qui maintient un vieux site.

## L'épreuve

Devant un paragraphe, une question suffit : **qu'est-ce que quelqu'un fera
différemment après l'avoir lu ?** Si la réponse est « rien », il part.
