# Services

## Formulaire de contact

Validation Zod côté serveur. Anti-spam **sans CAPTCHA** : champ leurre
invisible, délai minimum de remplissage (un humain met plus de trois secondes),
limitation par IP. Cela arrête l'essentiel des robots sans dégrader
l'expérience, sans problème d'accessibilité et sans envoyer les visiteurs chez
un tiers.

**Les messages sont stockés localement en plus d'être envoyés.** Un incident
d'envoi ou un classement en spam ne doit pas faire perdre un lead. Ils sont
consultables dans le panel.

**RGPD par construction** : mention de consentement sur le formulaire, purge
automatique après une durée configurée (12 mois par défaut), bouton de
suppression. La même purge couvre le journal de connexion du panel et les logs
d'accès Caddy, qui sont aussi des données personnelles.

## Email

Brevo par défaut : société française, données traitées en UE, 300 emails/jour
gratuits en permanence — largement le volume de trois sites.

**Le socle n'est pas marié à un fournisseur.** Une interface `EmailProvider`
avec deux implémentations (une API et un SMTP générique) rend le fournisseur
configurable par site depuis `site.config.ts`.

Le **nom** du fournisseur vit dans `site.config.ts`, versionné ; la **clé** vit
dans `.env`, jamais versionné. Trois lignes en tout, et `basalte doctor` prouve
qu'un email part vraiment — voir `depot-client.md`.

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
anonymisées à la source.

Couvre : volume de visites, provenance, pages consultées, envois de formulaire
(qui sont eux-mêmes des requêtes journalisées).

Limites assumées : comptage des visiteurs uniques approximatif, filtrage des
robots à maintenir par liste de user-agents. C'est un ordre de grandeur, pas
une mesure exacte.
