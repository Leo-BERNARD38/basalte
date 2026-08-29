# Publication

## Enregistrer et publier sont deux actions

- **Enregistrer** — écriture du fichier et **commit local**. Instantané, sans
  réseau. Le client retravaille sa page par petites touches sans déclencher de
  build.
- **Publier** — bouton explicite : build, bascule atomique, puis **push vers
  GitHub**.

Le client contrôle donc quand ses changements sortent, et un chantier en cours
ne devient jamais public par accident.

Le push n'a lieu qu'à la publication. Trois conséquences :

1. l'enregistrement ne dépend jamais du réseau ni de la disponibilité de GitHub
2. ce qui est sur GitHub correspond exactement à ce qui est en ligne
3. la sauvegarde hors site suit les publications, pas la frappe au clavier

## Conflit avec tes propres modifications

Tu ajoutes un bloc sur mesure depuis ta machine pendant que le client édite
depuis le panel. Le cas est certain, pas hypothétique.

Avant de pousser, le panel fait `git pull --rebase`. En cas de conflit il
**s'arrête**, affiche au client « la mise en ligne a échoué, ton site n'a pas
changé » et t'envoie l'erreur par email. Il ne tente jamais de résoudre un
conflit tout seul.

Le panel n'écrit que dans `content/` et `public/media/`. Ne jamais toucher à
ces deux dossiers depuis ta machine pendant qu'un client édite rend les
conflits quasi impossibles.

## Preview

Une route `/admin/preview/…` rend le contenu **non publié** avec exactement les
mêmes composants Astro que le site réel — pas une approximation. Possible sans
travail supplémentaire, puisqu'un runtime Node tourne déjà pour le panel.

## Le dossier de build ne bouge pas

Le build tourne **toujours dans le même dossier de travail** — le dépôt — et
seul le `dist/` produit est déplacé dans `releases/<date>/`.

Astro conserve les images déjà optimisées dans `node_modules/.astro`.
Construire dans un dossier neuf à chaque publication jetterait ce cache et
ferait ré-encoder toutes les images à chaque fois : quelques minutes de build
et un pic mémoire parfaitement évitables sur un VPS de 2 Go.

## Bascule atomique

```
/srv/site/
├── releases/2026-08-29T15-21-40/     nouveau build
├── releases/2026-08-29T14-03-12/     précédent, conservé
└── current -> releases/2026-08-29T15-21-40
```

Caddy sert `current`. Le build se construit à côté et ne devient visible qu'une
fois terminé, par changement de lien symbolique. Trois propriétés :

1. Un visiteur ne voit jamais un site à moitié reconstruit.
2. Un build en échec laisse `current` inchangé : **une publication ratée ne peut
   pas casser un site qui fonctionnait**.
3. Le retour arrière est instantané, sans rebuild.

Les cinq dernières versions sont conservées, les plus anciennes supprimées.

## File d'attente

Une seule place : une publication demandée pendant un build attend ; une
seconde demande remplace celle en attente au lieu de s'empiler. Deux builds
Astro simultanés saturent la mémoire d'un petit VPS.

## En cas d'échec

Le client voit « la publication a échoué, ton site en ligne n'a pas changé »,
jamais une trace d'erreur. L'erreur complète part par email au mainteneur. Le
site continue de tourner sur la version précédente.
