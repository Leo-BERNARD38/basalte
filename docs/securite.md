# Sécurité

## Modèle de menace

Par probabilité décroissante :

| Menace | Réponse |
|---|---|
| Robots opportunistes balayant Internet | Aucun CMS connu à attaquer, aucune faille publique à rejouer, limitation de débit. Le panel ne cède qu'à une authentification, jamais à la discrétion de ses routes |
| Bourrage d'identifiants (mot de passe réutilisé) | Mot de passe généré, jamais choisi → jamais réutilisé ; code email en second facteur |
| Hameçonnage du client | Code email en second facteur ; notification à chaque nouvel appareil |
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

## Chaîne d'approvisionnement

Deux dépôts à protéger, pas un.

**Le socle** est la seule surface commune à tous les VPS : 2FA sur le compte,
protection de branche, versions figées par lockfile, `npm ci` au déploiement.
Son caractère public supprime tout secret à distribuer.

**Chaque dépôt client** reçoit une clé de déploiement qui lui est propre,
jamais un jeton de ton compte, et la protection de branche y est activée aussi.

## En-têtes

Via Caddy : CSP stricte, HSTS, `X-Frame-Options`. HTTPS et renouvellement de
certificats automatiques, sans certbot ni cron à surveiller.

## Données personnelles

Trois gisements, une même purge automatique configurée par site :

- les **leads** du formulaire (12 mois par défaut, voir `services.md`)
- le **journal de connexion** du panel (date, IP, navigateur)
- les **logs d'accès Caddy** qui alimentent l'analytics, IP anonymisées à la
  source
