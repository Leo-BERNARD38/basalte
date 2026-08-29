# Déploiement et exploitation

## Docker Compose

Généré par `basalte init` : application Node et Caddy. Un nouveau client se
provisionne en une commande, à l'identique, chez n'importe quel hébergeur.

## Dimensionnement

**2 Go de RAM par VPS.** Le pic mémoire vient du traitement des images par
sharp au build. 1 Go fonctionne en bridant la concurrence de sharp, mais laisse
peu de marge le jour où un client téléverse quinze photos d'un coup.

## Sauvegardes

Le contenu et les images sont **déjà répliqués hors site** à chaque
publication, puisque le dépôt est poussé sur GitHub. C'est le gros de la donnée,
sauvegardé sans rien ajouter.

Reste la base SQLite (comptes, sessions, leads), qui est un fichier : dump
quotidien.

## Reprise après sinistre

`git clone` + `basalte init` + restauration du fichier SQLite.

**La procédure de restauration est celle qu'on exécute à chaque nouveau
client**, donc elle est validée en permanence — à la différence d'un document
que personne ne teste jamais.
