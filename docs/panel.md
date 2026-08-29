# Panel d'édition

## Structure technique

Le panel est **une island React unique** montée en `client:only="react"`.

Astro ne partage pas de contexte React entre islands séparées ; un arbre unique
supprime le problème, et `client:only` évite tout souci d'hydratation. Le panel
n'a besoin ni de SEO ni de rendu serveur, puisqu'il est derrière une
authentification.

Mantine fournit l'essentiel : `@mantine/form` pour l'état et la validation,
`@mantine/dropzone` pour le téléversement, des entrées correspondant une à une
aux types de champs, `@mantine/notifications` et `@mantine/modals`. Le
réordonnancement des sections utilise dnd-kit, que Mantine recommande
explicitement.

Reste à écrire : le moteur qui traduit un schéma en formulaire, et la partie
serveur.

## Structure de l'interface

Le panel aura beaucoup de fonctions. Elles ne doivent jamais être visibles en
même temps.

**Six pages, et pas davantage.** *Hypothèse de départ — la phase 3 confirme ou
remplace ce découpage. Ce qui ne bouge pas : leur nombre reste petit, et la
hiérarchie suit la fréquence d'usage.*

| Page | Contenu |
|---|---|
| Édition | les pages du site et leurs sections — l'écran par défaut |
| Médias | la médiathèque |
| Messages | les leads du formulaire de contact |
| Statistiques | le rapport d'audience |
| Réglages | langues, informations du site |
| Compte | mot de passe, appareils, journal de connexion |

Arriver à dix pages signifie que deux d'entre elles auraient dû fusionner. La
hiérarchie suit la fréquence d'usage : le client édite chaque semaine, il
consulte ses statistiques une fois par mois.

**Deux niveaux de navigation au maximum.** Menu, puis page. Jamais un troisième
étage d'onglets : une page qui réclame des onglets est deux pages.

**Trois informations lisibles en permanence**, sans cliquer :

- ai-je des modifications non publiées ?
- quand ai-je publié pour la dernière fois ?
- est-ce que quelque chose est cassé ?

Elles suppriment l'essentiel des questions que le client poserait autrement.

**Un seul endroit pour agir sur l'état du site** : la barre d'enregistrement et
de publication, toujours à la même place à l'écran. Jamais deux boutons
« Publier » à deux endroits.

**Le vocabulaire est celui du client.** Ni « bloc », ni « schéma », ni
« build », ni « commit », ni « déployer ». On dit *section*, *enregistrer*,
*mettre en ligne*. Une dizaine de mots fixés une fois et tenus partout.

Mantine fournit des composants corrects, pas une hiérarchie. Une petite couche
maison garantit que toutes les pages se ressemblent, et empêche que chaque écran
soit redessiné un peu différemment. *Hypothèse — `PageHeader`, `Section`,
`EmptyState`, `SaveBar` : la phase 3 la dessine depuis les écrans réels, pas
l'inverse.*

## Authentification

Flux : email + mot de passe, puis code à six chiffres reçu par email.

- **Mot de passe généré** par le socle à la création du compte, modifiable
  ensuite. Minimum 12 caractères, refus des mots de passe les plus courants via
  une liste embarquée (aucun appel réseau). Hachage Argon2id.
- **Il ne transite jamais par email** : affiché une seule fois à la création du
  compte, ou communiqué de vive voix. L'email portant déjà le second facteur,
  l'y envoyer réunirait les deux facteurs dans la même boîte — et le second
  facteur ne protégerait plus de rien.
- **Code** valable 10 minutes, à usage unique, **lié à la tentative de connexion
  en cours** et non au seul compte — sans quoi il serait rejouable ailleurs.
  Trois envois maximum par quart d'heure, cinq essais avant invalidation,
  comparaison en temps constant.
- **Appareil de confiance 30 jours** : le code n'est demandé que sur un appareil
  inconnu. Chaque nouvel appareil reconnu déclenche une notification par email,
  et un bouton révoque tous les appareils.
- **Sessions** : cookie `HttpOnly`, `Secure`, `SameSite=Strict`, jeton aléatoire
  de 256 bits stocké haché. 12 h d'inactivité, 7 jours en absolu, révocables
  côté serveur.
- **Force brute** : limitation par IP *et* par compte, verrouillage temporaire
  progressif, notification au client après plusieurs échecs — cette notification
  vaut plus que le verrouillage.
- **Journal** des connexions réussies et échouées (date, IP, navigateur),
  consultable par le client dans le panel.
- **Secours hors email** : `basalte admin:login --user <email>` exécuté en SSH
  génère un lien de connexion valable dix minutes. Indispensable, puisque
  l'email est devenu un composant d'authentification.

Les emails d'authentification empruntent un **canal distinct** de ceux du
formulaire de contact, pour qu'un robot spammant le formulaire ne puisse pas
épuiser le quota qui sert à se connecter.

## Médias

**Rien de ce que le client envoie n'est conservé tel quel** : chaque image est
ré-encodée par sharp avant stockage, ce qui neutralise les fichiers polyglottes
et les charges utiles en métadonnées sans avoir à les reconnaître.

Autour de cette règle :

- taille limitée à 10 Mo
- type vérifié sur les **octets réels**, jamais sur l'extension ni sur le
  `Content-Type` annoncé
- nom de fichier dérivé de l'empreinte du contenu, jamais le nom d'origine
  (vecteur de traversée de chemin)
- EXIF supprimé, ce qui efface aussi la géolocalisation
- redimensionnement à 2560 px maximum

**SVG interdit au téléversement** : c'est un document XML pouvant contenir du
JavaScript, donc une XSS permanente sur le site public. Les logos vectoriels
sont déposés dans le dépôt.

Les médias vivent dans `public/media/`, versionnés avec le contenu : un
`git revert` restaure texte et images ensemble. Le nom dérivé de l'empreinte
déduplique au passage — remplacer dix fois la même image ne la stocke qu'une
fois. Git ne supprimant jamais rien, le seuil de vigilance reste 200 Mo par
site.

**Texte alternatif obligatoire** au téléversement, et traduisible.

**Point focal** réglable (transformé en `object-position`) plutôt qu'un outil de
recadrage : cela résout les visages coupés pour une fraction du travail.

La suppression d'un média encore référencé est refusée.
