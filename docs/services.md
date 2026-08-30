# Services

## Formulaire de contact

Le bloc `contact` produit un **formulaire HTML ordinaire** : `method="post"`,
`action="/api/contact"`, et pas une ligne de JavaScript (D76). Le site public
n'en embarque aucun (invariant 5), et un lead perdu parce qu'un script n'a pas
chargé coûterait plus cher que tout le reste.

Le serveur répond par une redirection vers la page d'origine, suivie d'un
fragment que la feuille de style révèle :

| Fragment | Ce que le visiteur lit |
|---|---|
| `#message-envoye` | le message est arrivé |
| `#message-refuse` | le formulaire n'était pas valable |
| `#message-attente` | trop d'envois depuis cette connexion |

Les trois paragraphes sont dans la page, masqués, et `:target` révèle celui que
l'URL désigne. C'est le seul canal de réponse dont dispose une page statique.

Il en découle une contrainte assumée : **un refus perd ce que le visiteur avait
écrit.** C'est pourquoi la validation du navigateur porte l'essentiel du travail
— `required`, `type="email"`, `minlength`, `maxlength` arrêtent une saisie
incomplète avant qu'elle ne quitte la page. Le serveur ne voit donc guère que ce
qui n'est pas parti d'un navigateur.

L'adresse de retour est **reconstruite depuis les pages du dépôt**, jamais
recopiée de ce que le formulaire a envoyé (D79) : une redirection ouverte n'est
pas possible, et une page inconnue ramène à la racine.

### Anti-spam, sans CAPTCHA

Trois défenses (D77), et le délai minimum de remplissage a été abandonné : il
demande une horloge posée au chargement, donc du JavaScript.

- **un champ leurre**, hors de l'écran plutôt que masqué — un robot qui lit le
  HTML le remplit, un lecteur d'écran l'ignore
- **cinq envois par quart d'heure et par adresse**, large pour un humain
- **soixante envois par heure pour le site entier**, ce qui protège le quota
  d'email du client

Un leurre rempli reçoit la réponse d'un envoi réussi, et rien n'est écrit
(D78) : le robot n'apprend pas quel champ le trahit. Une limite atteinte, elle,
se dit franchement — un visiteur réel doit savoir que son message n'est pas
parti.

Un CAPTCHA ajouterait un tiers dans la page, un obstacle d'accessibilité et des
visiteurs perdus, pour arrêter ce que le leurre arrête déjà.

### Les messages ne se perdent pas

**Un message est écrit en base avant toute tentative d'envoi** (D80). L'email
n'est qu'une notification : un incident chez le fournisseur, un classement en
spam, une clé expirée — rien de cela ne fait perdre un lead.

La ligne porte l'état de la notification, et le panel affiche « non transmis par
email » quand elle n'est pas partie. Un envoi n'est jamais « en cours » : il
part pendant la requête, et un processus tué au milieu laisse une ligne qui dit
vrai.

L'email de notification part avec l'adresse du visiteur en `Reply-To` : le
client répond depuis sa boîte, sans recopier une adresse.

### Libellés et langues

Les libellés du formulaire et les trois réponses sont des **champs du bloc**,
vides par défaut ; le composant retombe alors sur le français (D82). Un site
anglophone les traduit depuis le panel, sans que le socle porte une table de
traductions qu'il faudrait modifier pour chaque nouvelle langue.

### RGPD par construction

Mention de consentement sur le formulaire — un champ du bloc, que le client
formule. Purge automatique après une durée configurée dans `site.config.ts` :

```ts
leads: { purgeAfterMonths: 12 }
```

Et un bouton de suppression sur chaque message dans le panel. La suppression est
définitive : la base n'est pas versionnée.

La même durée couvre les trois gisements de données personnelles — les messages,
le journal de connexion du panel, et les logs d'accès de Caddy.

**C'est le processus du panel qui purge** (D83), au démarrage puis chaque jour.
Il tourne déjà en permanence, là où un cron dans le conteneur serait un composant
de plus à provisionner. Une machine éteinte ne purge pas ; elle rattrape au
démarrage suivant, ce qui suffit à une durée qui se compte en mois. Les logs
d'accès, eux, appartiennent à Caddy, qui fait tourner ses fichiers lui-même :
la durée s'y règle par `roll_keep_for` (`deploiement.md`).

## Email

Brevo par défaut : société française, données traitées en UE, 300 emails/jour
gratuits en permanence — largement le volume de trois sites.

**Le socle n'est pas marié à un fournisseur.** L'interface `EmailProvider` est
posée depuis la phase 2, dans `src/server/email/` : un nom, une méthode `send`,
rien d'autre. Trois implémentations existent — `brevo` par un simple `fetch`
sur son API transactionnelle, `console` qui écrit au lieu d'envoyer, et
`memory` qui retient, dont les tests se servent. Le fournisseur se choisit par
site depuis `site.config.ts`.

`basalte doctor`, lui, **envoie pour de bon** : une clé présente mais fausse
passe un contrôle de forme, et se découvre le jour où le client ne peut plus se
connecter (D30, D93). `--no-email` saute cet unique envoi quand le quota du jour
compte plus que la preuve.

Le **nom** du fournisseur vit dans `site.config.ts`, versionné ; la **clé** vit
dans `.env`, jamais versionné. Les deux destinataires de la machine y vivent
aussi :

| Variable | Où partent les emails |
|---|---|
| `CONTACT_EMAIL` | les messages du formulaire — l'adresse du client (D81) |
| `EMAIL_ADMIN` | les erreurs de la machine — la tienne |

Sans `CONTACT_EMAIL`, un message reste dans le panel et rien ne part : il n'est
jamais perdu, il n'est simplement pas notifié. `basalte doctor` prouve qu'un
email part vraiment — voir `depot-client.md`.

**Un site peut le déclarer plutôt que le subir.** La capacité `notifyLeads`,
posée à `false` dans `site.config.ts`, dit que ce site ne notifie pas ses
messages : ils restent dans le panel, et `doctor` cesse de réclamer une adresse
de contact au lieu d'avertir qu'il en manque une. La différence est celle d'un
réglage et d'un oubli, et elle se lit.

**Couper la notification ne coupe pas l'authentification.** Le code à six
chiffres part par email (D9) : un site sans `notifyLeads` garde son canal de
connexion, et un réglage qui promettrait un site sans aucun email mentirait.

L'email porte **aussi les codes de connexion**, pas seulement les leads. Trois
conséquences :

- la délivrabilité n'est pas un confort : un code qui arrive en spam ou trop
  tard, c'est un client bloqué
- il faut une voie de secours hors email (`basalte admin:login`, voir `panel.md`)
- les emails d'authentification empruntent un canal distinct de ceux du
  formulaire

## Analytics

Analyse des logs d'accès Caddy, rapport affiché dans le panel.

Aucun service supplémentaire, aucune base, **aucun script sur le site public** —
donc aucun impact sur les performances et aucun bandeau cookies. Les IP sont
anonymisées à la source, par le filtre `ip_mask` du Caddyfile : le socle ne
reçoit déjà plus d'adresse complète, et n'a rien à anonymiser lui-même.

Couvre, sur les trente derniers jours : visites, visiteurs, envois de formulaire
(qui sont eux-mêmes des requêtes journalisées), volume jour par jour, pages les
plus vues, et provenances.

Le rapport lit le **fichier courant seulement**, par la fin et sur huit
méga-octets au plus (D84) : les fichiers déjà tournés par Caddy sont compressés,
et les décompresser pour une donnée d'appoint mettrait la mémoire du panel à la
merci d'un log volumineux. Quand le fichier n'est pas lisible, le panel le dit
au lieu d'afficher des zéros.

Ne comptent ni les fichiers servis avec une page, ni les adresses du panel et de
l'API, ni les réponses en erreur.

Limites assumées, et écrites sur l'écran lui-même : un visiteur est reconnu par
son adresse masquée et son navigateur — deux personnes derrière la même box
comptent pour une, la même personne sur deux appareils compte pour deux — et le
filtrage des robots se fait sur une liste de signatures qui vieillit. C'est un
ordre de grandeur, pas une mesure exacte.
