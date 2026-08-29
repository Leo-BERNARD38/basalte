# Publication

## Enregistrer et publier sont deux actions

- **Enregistrer** — écriture du fichier et **commit local**. Instantané, sans
  réseau. Le client retravaille sa page par petites touches sans déclencher de
  build.
- **Publier** — bouton explicite : build, bascule atomique, puis **push vers
  GitHub**.

L'enregistrement est en place depuis la phase 3 : le panel valide, écrit, puis
commite au nom du compte qui édite. Un contenu invalide est refusé (D60) — un
commit qui ne se construit pas ferait échouer la mise en ligne suivante. Le
commit saute les hooks du dépôt : `check` vient de passer, et un hook en échec
rendrait l'enregistrement impossible (D62).

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

## Aperçu

`/admin/preview/<slug>` rend le contenu **non publié** avec exactement les mêmes
composants Astro que le site réel — pas une approximation. Le processus Node du
panel le sert, derrière la même session : un aperçu n'est jamais public.

Il montre le dépôt tel qu'il est enregistré, images comprises — le panel sert
`/media/*` depuis le dépôt et non depuis la version en ligne (D64). Il montre
aussi les **langues en préparation**, absentes du site construit : c'est le seul
endroit où une traduction se relit avant de sortir.

Le bouton « Aperçu » du panel enregistre d'abord si quelque chose attend.

## L'ordre : rebaser, construire, basculer, pousser

Il porte tout ce qui suit (D72).

**Rebaser d'abord** fait construire exactement ce qui sera poussé, et fait
échouer le conflit — le seul échec vraiment probable — avant qu'une seconde de
build n'ait été dépensée.

**Basculer avant de pousser** fait que le site sort dès qu'il est
constructible, même si GitHub est indisponible. Un push en échec après la
bascule n'est pas une publication ratée : le site est en ligne, la sauvegarde
manque. Le client le lit ainsi, et le mainteneur reçoit l'erreur.

Le rebase comme le push sont gardés par la règle qui protège déjà les commits :
la racine du site doit être la racine du dépôt (D74). Sans elle, git répondrait
pour le dépôt le plus proche au-dessus, et publier un dossier logé ailleurs
pousserait ce dépôt-là.

## Le dossier de build ne bouge pas

Le build tourne **toujours dans le même dossier de travail** — le dépôt. C'est
le dépôt git du site : le panel y a commité, et c'est cet état-là qu'on
construit.

Sa **sortie**, elle, est écrite directement dans le dossier de la version, à
côté des autres et sur le même système de fichiers (D68). Deux raisons : `dist/`
porte le panel construit, celui que le processus en cours exécute, et un
déplacement entre deux volumes ne serait plus un renommage. La rendre visible
n'est donc qu'un renommage, puis un lien remplacé.

Il tourne en **processus enfant** (D67), plafonné à 1 Go de tas et à dix
minutes. Un build qui sature la mémoire ou qui ne revient jamais emporterait
sinon avec lui le seul écran capable de le relancer.

Le build ne traite aucune image (D40) : les largeurs sont produites quand
l'image entre dans le site, et `public/` est recopié tel quel. Une publication
ne ré-encode donc rien, et il n'y a aucun cache d'images à préserver d'une
version à l'autre.

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

Les cinq dernières versions sont conservées, les plus anciennes supprimées —
jamais celle qui est en ligne, même si elle est plus ancienne que les cinq.

La racine servie vient de `BASALTE_SITE_ROOT` (D69) : le conteneur la monte sur
`/srv/site`, partagée avec Caddy ; hors production elle vit dans `.basalte/site`
à la racine du dépôt, où rien ne la partage.

## File d'attente

Une seule place (D71) : une publication demandée pendant un build attend ; une
seconde demande remplace celle en attente au lieu de s'empiler. Deux builds
Astro simultanés saturent la mémoire d'un petit VPS, et trois clics d'un client
impatient ne valent qu'une seule mise en ligne.

Un build dure des secondes, pas des millisecondes : `POST /api/publish` rend
l'état obtenu sans attendre, et le panel revient le lire jusqu'à ce que la file
soit vide. Rien de tout cela ne survit à un redémarrage — seuls les états
terminaux sont écrits en base (D73), une ligne « en cours » y mentirait pour
toujours.

## En cas d'échec

Le client lit :

> La mise en ligne a échoué. Ton site en ligne n'a pas changé, et personne
> d'autre que toi ne l'a vu.

Jamais une trace d'erreur — le panel n'en reçoit même pas. L'erreur complète
part par email au mainteneur, sur le canal du site et non sur celui des codes de
connexion (D75) : une machine qui échoue en boucle ne doit pas épuiser le quota
qui sert à se connecter.

Le site continue de tourner sur la version précédente, et le dossier de version
inachevé est effacé. Un dépôt laissé au milieu d'un rebase serait pire qu'un
build raté : le prochain enregistrement du client y échouerait sans qu'il
comprenne pourquoi — le panel l'annule donc systématiquement.

## Le bouton

La barre du bas porte « Mettre en ligne », à côté d'« Aperçu » et
d'« Enregistrer ». Il enregistre d'abord si quelque chose attend : un chantier
laissé dans le navigateur sortirait sinon sans son dernier paragraphe.

Une ligne dit en permanence où en est le site — « jamais mis en ligne », « mise
en ligne en cours… », « en ligne depuis le 29/08/2026 18:48 ». C'est là que le
client vient vérifier que ce qu'il a écrit est bien sorti.
