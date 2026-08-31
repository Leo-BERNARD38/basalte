# Roadmap

Ce qui a été identifié, et volontairement laissé de côté.

Ce document ne porte que cela. Les phases à faire sont dans
`implementation.md` ; ce que les phases faites ont décidé est dans
`decisions.md`.

Chaque ligne dit **ce qui la ferait revenir**. C'est la seule chose qui compte
ici : un sujet sans déclencheur est un sujet qu'on reprendra par ennui ou
qu'on oubliera, jamais un sujet qu'on reprendra au bon moment.

## Vu, et pas retenu maintenant

| Sujet | Ce qui le ferait revenir |
|---|---|
| **`f.boolean` et `f.number`** — le DSL porte neuf types, et aucun n'exprime un interrupteur ni une quantité : un « afficher le badge » passe aujourd'hui par un `select` à deux valeurs | Le premier bloc qui a vraiment besoin d'un des deux. La question est moins le type que ce que le panel en rend, et un type de champ est un engagement de migration |
| **Le reste du plancher d'accessibilité** — `design.md` pose 4,5:1, 44 px et le focus visible ; `lint` fait le contraste, le reste demande de regarder un écran | Le premier site livré à quelqu'un qui navigue au clavier ou à la loupe. Le banc de blocs le rend visible à l'œil, ce qui suffit tant qu'il y a peu de sites |
| **Un budget de poids par page**, vérifié au build | Le jour où un bloc charge un script. Un site sans JavaScript ne dépasse pas un budget par accident |
| **Un aperçu partageable** sans compte, pour montrer au client avant mise en ligne | Le premier client qui demande à voir avant. Cela contourne l'authentification : à concevoir, pas à improviser |
| **La provenance des leads** (campagne, source) | Le premier client qui paie de la publicité |
| **Un jeu d'icônes complet** au-delà du favicon | Personne ne l'a réclamé |
| **La restauration après sinistre jouée pour de vrai** — la procédure est celle d'une nouvelle installation, donc validée à chaque site créé, mais jamais exécutée depuis une sauvegarde | La première machine qui porte un site dont la perte coûterait quelque chose. Une procédure jamais jouée est une hypothèse |
| **La sauvegarde du fichier SQLite** — sans propriétaire dans le socle, assumée (`deploiement.md`) | Le premier site dont les messages ont de la valeur au-delà de leur notification |
| **La CI sur les commits poussés dans `main`** — elle ne tourne que sur les pull requests (D38), et le travail passe souvent par `main` directement : elle n'y voit donc rien | Le premier `main` cassé qui n'est découvert qu'à la publication. `basalte release` lance `verify` avant de publier, ce qui tient tant que rien n'atteint un client sans passer par lui |
| **Le partage d'un bloc entre deux dépôts clients** — écarté par D147 : un bloc écrit hors socle se recopie, et le socle absorbe ce qui sert à plusieurs (D148) | Le troisième dépôt client qui reçoit le même bloc recopié à la main, **et une correction à reporter dans les trois**. C'est le report qui coûte, pas la copie |

## Hors périmètre, toujours

Ce n'est pas de la dette, et rien ne le ramènera : `implementation.md` en tient
la liste, sous « Hors périmètre ».
