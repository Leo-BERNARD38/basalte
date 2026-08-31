# Sécurité

## Modèle de menace

Par probabilité décroissante :

| Menace | Réponse |
|---|---|
| Robots opportunistes balayant Internet | Aucun CMS connu à attaquer, aucune faille publique à rejouer, limitation de débit. Le panel ne cède qu'à une authentification, jamais à la discrétion de ses routes |
| Robots remplissant le formulaire de contact | Champ leurre, plafond par adresse, plafond pour le site ; un leurre rempli reçoit la réponse d'un envoi réussi et n'écrit rien (`services.md`) |
| Bourrage d'identifiants (mot de passe réutilisé) | Mot de passe généré, jamais choisi → jamais réutilisé ; code email en second facteur |
| Hameçonnage du client | Code email en second facteur ; notification à chaque nouvel appareil |
| Code de connexion classé en spam | `doctor` sonde SPF, DKIM et DMARC du domaine d'expédition, et refuse une signature manquante (D129) |
| Attaquant ciblé | Isolation par VPS ; plafond de dégâts borné |

Les deux menaces du milieu passent par le client, pas par le code. Une
authentification par mot de passe irréprochable ne protège que de la première.

## Plafond de dégâts

Un intrus dans le panel peut modifier les textes et images d'**un** site. Il ne
peut pas :

- atteindre les autres clients — VPS séparés, aucun compte commun, une clé de
  déploiement par dépôt
- injecter du code — le contenu est un format fermé validé par schéma
- toucher aux composants — ils vivent dans le package, pas dans le contenu
- rester discret — chaque modification est un commit horodaté
- rendre les dégâts permanents — `git revert` restaure le site en une minute,
  et la protection de branche empêche de réécrire l'historique

Une seule adresse est ouverte à un visiteur anonyme : `POST /api/contact`. Elle
n'écrit qu'une ligne de message, ne lit rien, et ne renvoie jamais autre chose
qu'une redirection vers une page du site — l'adresse de retour est reconstruite
depuis les pages du dépôt, jamais recopiée de ce que le formulaire a envoyé
(D79).

Elle déclenche en revanche **une requête sortante** quand le site déclare une
adresse de notification (`LEAD_WEBHOOK_URL`, D126). L'adresse vient du `.env`,
donc de toi : c'est le même niveau de confiance qu'une clé de fournisseur, et
ce n'est pas un levier qu'un visiteur choisit. Trois gardes l'encadrent quand
même, parce qu'une adresse se recopie mal :

- **`https` obligatoire** — le message porte le nom, l'adresse et le texte du
  visiteur, et les laisser traverser en clair les donnerait à qui écoute ;
- **aucune redirection suivie** — elle mènerait ailleurs que là où le client a
  consenti à envoyer ses messages ;
- **dix secondes de délai**, comme le fournisseur d'email : la requête du
  visiteur attend cet appel.

Une adresse mal écrite est refusée au démarrage et dite sur la sortie d'erreur ;
le site sert, les messages arrivent au panel, et `doctor` la nomme. L'adresse
elle-même ne s'affiche jamais dans le panel — seul son hôte paraît.

**Ce que le webhook fait sortir de la machine.** Le message d'un visiteur part
chez un service que le client a choisi, et y reste. C'est la même chose que
l'email de notification, avec un tiers de plus, et cela se dit dans la mention
de consentement du formulaire. L'adresse IP et le navigateur du visiteur, eux,
n'en sortent pas : ils ne quittent déjà pas le panel, et aucun service au bout
n'en a l'usage.

**Le panel est coupable à tout moment** sans interrompre le site, puisque
celui-ci est statique. En cas d'incident : couper l'édition, laisser les
visiteurs servis, enquêter. Le formulaire de contact s'arrête avec le panel ;
les visites, non.

## Invariants

Ces règles portent tout ce qui précède. Les enfreindre donne un projet qui
fonctionne et une garantie détruite — c'est ce qui les rend dangereuses.

1. **Jamais de HTML libre dans le contenu.** Texte échappé au rendu. Pour du
   gras et des liens : Markdown restreint assaini au build. Cette règle est ce
   qui rend vraie la section précédente.
2. **SVG refusé au téléversement.**
3. **L'image stockée n'est jamais celle reçue** — ré-encodage systématique.
   Un PDF y échappe, et lui seul : voir « Le document, seule exception à
   l'invariant 3 » ci-dessous.
4. **Aucun `^` dans les dépendances**, `npm ci` au déploiement.
5. **Le site public n'embarque aucun JavaScript par défaut.**
6. **Le panel est une island React unique.**
7. **Un bloc = un dossier, deux fichiers**, aucun registre central.
8. **Aucun code du socle copié dans un dépôt client.**
9. **Les langues sont imbriquées dans les champs.**
10. **`id` de bloc stable**, jamais l'index de position.
11. **Le build ne remplace jamais le site en place.**
12. **Le mot de passe initial ne transite jamais par email** — l'email porte
    déjà le second facteur.

## Le document, seule exception à l'invariant 3

Un PDF ne se ré-encode pas : rien ne sait le reconstruire en neutralisant ce
qu'il transporte, comme sharp le fait d'une image. Le socle l'accepte tout de
même, parce qu'un client qui a des conditions générales signées ne peut pas les
retranscrire — mais à six conditions, et elles tiennent ensemble :

1. **Un site l'accepte, ou ne l'accepte pas.** La capacité `documents` de
   `site.config.ts` vaut `false` par défaut ; le téléversement est refusé tant
   qu'elle n'est pas déclarée.
2. **Le type est lu sur les octets réels** — l'en-tête `%PDF-` — jamais sur
   l'extension ni sur le `Content-Type` annoncé.
3. **Le nom vient de l'empreinte du contenu.** Le nom d'origine ne sert qu'à
   l'affichage dans le panel, débarrassé de tout chemin.
4. **Il est servi en pièce jointe**, avec `Content-Disposition: attachment` et
   `X-Content-Type-Options: nosniff` — par le Caddyfile en production, par la
   route du panel avant publication.
5. **Aucun composant ne l'incruste dans une page.** La CSP porte déjà
   `object-src 'none'`, et le seul bloc qui le sert produit un lien.
6. **Il vit dans `public/documents/`**, hors du chemin des images : les règles
   de cache et d'en-têtes des deux ne se mélangent pas.

Ce qui reste : un PDF téléchargé est ouvert par le lecteur du visiteur, avec ce
que ce lecteur accepte de faire. C'est le même risque qu'un fichier reçu par
email, et il n'est pas réduit par le socle. Ce que le socle garantit, c'est
qu'aucun PDF ne s'exécute dans l'origine du site.

## Ce qui n'est pas couvert, et pourquoi

Une faiblesse connue, mesurée et acceptée.

**L'énumération des comptes après plusieurs échecs.** Un mot de passe faux et
une adresse inconnue donnent le même refus, mot pour mot et pour le même temps
de calcul. Au sixième essai sur une adresse qui existe, le message devient
« la connexion est bloquée quelques minutes » : qui a fait cinq essais sur la
bonne adresse apprend donc qu'elle existe. Le prix de la fermer serait de ne
plus dire au client pourquoi il n'entre pas — or c'est précisément
l'information qui lui manque à ce moment-là. La limitation par adresse IP borne
l'exercice à vingt essais par quart d'heure.

Le jeton de secours, lui, passait par l'URL et donc par les logs d'accès de
Caddy. Le Caddyfile généré le retire désormais des lignes journalisées, par le
filtre `query { delete token }` (`deploiement.md`).

## Chaîne d'approvisionnement

Deux dépôts à protéger, pas un.

**Le socle** est la seule surface commune à tous les VPS : 2FA sur le compte,
protection de branche, versions figées par lockfile, `npm ci` au déploiement.
Son caractère public supprime tout secret à distribuer.

**Chaque dépôt client** reçoit une clé de déploiement qui lui est propre,
jamais un jeton de ton compte, et la protection de branche y est activée aussi.

Cette clé **naît sur la machine** au premier `deploy` : sa moitié privée n'en
sort jamais, et seule sa moitié publique remonte vers GitHub — enregistrée par
ton jeton s'il est là, affichée à recopier sinon (D91). Le jeton, lui, reste sur
ta machine. Une machine compromise n'ouvre donc que le dépôt de son propre site,
et la reprise après sinistre engendre une clé neuve sans rien avoir à
transporter.

## En-têtes

Via Caddy : CSP stricte, HSTS, `X-Frame-Options`. HTTPS et renouvellement de
certificats automatiques, sans certbot ni cron à surveiller.

## Données personnelles

Trois gisements, une même durée configurée par site — `leads.purgeAfterMonths`
dans `site.config.ts`, douze mois par défaut :

- les **messages** du formulaire, effacés par le panel
- le **journal de connexion** du panel (date, IP, navigateur), effacé par le
  panel
- les **logs d'accès Caddy** qui alimentent l'analytics, IP anonymisées à la
  source par `ip_mask` et tournés par `roll_keep_for`

C'est le processus du panel qui purge les deux premiers (D83), au démarrage puis
chaque jour : il tourne déjà en permanence, là où un cron dans le conteneur
serait un composant de plus à surveiller. Le décompte est en mois calendaires et
en temps universel — douze mois, c'est la même date l'an prochain.

Le client peut en outre supprimer un message à la main depuis le panel. La
suppression est définitive : la base n'est pas versionnée.

Une copie échappe à cette purge, et il faut le savoir : **ce qu'un webhook a
livré appartient au service qui l'a reçu.** Supprimer un message dans le panel
n'efface pas la notification arrivée dans une conversation, pas plus que l'email
déjà dans la boîte du client. La durée de conservation porte sur ce que la
machine détient.
