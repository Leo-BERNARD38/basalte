# Panel d'édition

## Structure

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

## Authentification

Flux : email + mot de passe, puis code à six chiffres reçu par email.

- **Mot de passe généré** par le socle à la création du compte, modifiable
  ensuite. Minimum 12 caractères, refus des mots de passe les plus courants via
  une liste embarquée (aucun appel réseau). Hachage Argon2id.
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
`git revert` restaure texte et images ensemble. Seuil de vigilance autour de
200 Mo par site.

**Texte alternatif obligatoire** au téléversement, et traduisible.

**Point focal** réglable (transformé en `object-position`) plutôt qu'un outil de
recadrage : cela résout les visages coupés pour une fraction du travail.

La suppression d'un média encore référencé est refusée.
