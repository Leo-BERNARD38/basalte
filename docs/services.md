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

**Un succès a une adresse à lui quand le dépôt porte `content/merci.json`**
(D132). L'envoi mène alors à `/merci`, page ordinaire que le client édite : une
conversion mesurable pour qui paie de la publicité, un lien à partager, et assez
de place pour dire autre chose qu'une ligne sous un formulaire. `basalte init`
la pose ; la supprimer ramène le fragment, sans qu'un réglage soit à défaire.

Un refus et une limite atteinte, eux, ne quittent jamais le formulaire : le
visiteur doit retrouver le champ où recommencer. Le fragment reste donc la
réponse par défaut, et un site plus ancien que cette page se comporte comme
avant.

C'est une **page de service** : elle existe pour qui vient d'agir, pas pour qui
cherche le site. Elle est écartée du menu déduit, du sitemap et de l'index par
un seul prédicat, `isServiceRoute` dans `src/content/naming.ts` (D133) — trois
conditions écrites à la main auraient divergé, et l'oubli aurait été muet.

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

### Un second canal, qui ne passe pas par l'email

Un artisan n'ouvre pas son panel tous les jours, et une boîte encombrée noie un
lead. D'où une **adresse web appelée à chaque message**, en plus de l'email
(D126) :

```
LEAD_WEBHOOK_URL=https://…
```

Le socle ne connaît aucun service : il envoie un JSON à l'adresse qu'on lui
donne, comme il envoie un email au fournisseur qu'on lui nomme (D13). Une
conversation d'équipe, un service de notification sur téléphone, un automate —
tout ce qui accepte un `POST` convient.

Le corps porte **le message entier** (D127). `text` et `content` y disent la
même phrase, à côté des champs structurés : c'est ce qui fait qu'un webhook
affiche quelque chose sans intermédiaire, Discord lisant `content` là où Slack
et Mattermost lisent `text`.

```json
{ "text": "…", "content": "…", "name": "…", "email": "…",
  "message": "…", "page": "/contact", "language": "fr", "at": 1756…  }
```

**L'adresse IP et le navigateur du visiteur n'y entrent pas.** Ils ne sortent
déjà pas du panel, et aucun service au bout n'en a l'usage.

Trois gardes, écrites dans `securite.md` : `https` obligatoire, aucune
redirection suivie, et dix secondes de délai. L'adresse elle-même est un secret
— elle ne s'affiche jamais dans le panel, et `doctor` n'en montre que l'hôte.

**Les deux canaux sont indépendants.** L'un tombe sans emporter l'autre, et
c'est tout l'intérêt d'en avoir deux. La ligne du message retient ce qu'ils ont
donné ensemble (D128) :

| État | Ce qu'il veut dire | Ce que le panel montre |
|---|---|---|
| transmis | au moins un canal a confirmé | rien |
| manqué | tous ceux qui ont été tentés ont échoué | « non transmis » |
| sans objet | il n'y avait personne à prévenir | rien |

**Le webhook ne dépend d'aucune capacité** : sa présence suffit. Un site en
`notifyLeads: false` qui déclare une adresse est donc prévenu quand même — c'est
même le cas que la phase 11 visait.

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
| `EMAIL_ADMIN` | les erreurs de la machine — la tienne, et ce que le panel affiche au client sous « Besoin d'aide » |

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

Et **le second facteur reste l'email** (D130). Le webhook des messages n'en est
pas un : il aboutit dans une conversation que plusieurs personnes lisent, et un
code partagé n'est plus un second facteur. Ce qui manquait à l'email n'était pas
un remplaçant, c'était la preuve qu'il arrive.

### Prouver qu'un email arrive, pas seulement qu'il part

`doctor` envoie pour de bon : la clé est bonne, le fournisseur accepte. Cela ne
dit rien de ce qui décide, chez le destinataire, entre la boîte de réception et
les indésirables — et c'est là que se joue un code de connexion.

Il sonde donc trois enregistrements, **sur le domaine qui expédie** et non sur
celui du site : `EMAIL_FROM` porte SPF, DKIM et DMARC, et `AUTH_EMAIL_FROM` est
sondé à part quand il expédie d'ailleurs.

| Enregistrement | Constat | Niveau |
|---|---|---|
| **DKIM** | aucune clé sur les sélecteurs connus | **erreur** |
| SPF | aucun `v=spf1` sur le domaine | avertissement |
| DMARC | pas de `v=DMARC1` sur `_dmarc.<domaine>` | avertissement |

**C'est DKIM qui refuse, pas SPF** (D129), et c'est contre-intuitif. Brevo
expédie sous son propre domaine d'enveloppe : le SPF du client n'est jamais
aligné, sa documentation dit de ne pas ajouter d'`include` pour lui, et c'est
la signature DKIM qui authentifie — DMARC s'alignant sur elle. Un SPF absent
reste un défaut, parce qu'un domaine sans SPF est moins bien reçu partout ; il
n'est pas ce qui manque quand un email de Brevo tombe en spam.

Chaque sonde qui échoue donne **le texte exact à coller chez le registrar**, et
`doctor` nomme le domaine dans son étiquette :

```
✗ DKIM (exemple.fr) — aucune clé sur « brevo1 », « brevo2 », « mail »
    → publie les enregistrements que ton fournisseur affiche ; si son sélecteur
      diffère, déclare-le dans site.config.ts, sous « email: { dkim: [...] } ».
⚠ DMARC (exemple.fr) — absent — rien ne dit aux boîtes quoi faire d'un faux
    → ajoute un TXT sur _dmarc.exemple.fr : « v=DMARC1; p=none; rua=mailto:… ».
```

**Le sélecteur DKIM dépend du compte.** Le socle connaît ceux que Brevo
distribue ; un compte qui en a un autre le déclare plutôt que de faire échouer
la sonde :

```ts
email: { provider: 'brevo', dkim: ['maison'] }
```

`doctor` éprouve aussi l'adresse de notification, et par un appel réel : une
adresse bien formée mais morte passe tous les contrôles de forme, et ne se
découvre qu'au premier message perdu. `--no-email` saute tous les envois réels,
celui-ci compris.

**L'expéditeur n'est pas mutualisé** (D131). Un sous-domaine du mainteneur
supprimerait toute cette configuration chez le client, au prix d'un message qui
ne part pas de chez lui — et ôterait leur raison d'être aux sondes qui rendent
son domaine utilisable.

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
