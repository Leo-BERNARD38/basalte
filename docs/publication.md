# Publication

## Enregistrer et publier sont deux actions

- **Enregistrer** — écriture du fichier et commit git. Instantané. Le client
  retravaille sa page par petites touches sans déclencher de build.
- **Publier** — bouton explicite qui déclenche le build.

Le client contrôle donc quand ses changements sortent, et un chantier en cours
ne devient jamais public par accident.

## Preview

Une route `/admin/preview/…` rend le contenu **non publié** avec exactement les
mêmes composants Astro que le site réel — pas une approximation. Possible sans
travail supplémentaire, puisqu'un runtime Node tourne déjà pour le panel.

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
