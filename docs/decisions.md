# Décisions

Quinze décisions actées en brainstorming, avec l'alternative écartée et sa
raison. Les détails d'application sont dans les documents thématiques.

| # | Décision | Alternative écartée et raison |
|---|---|---|
| D1 | Un dépôt et un VPS par client, socle commun partagé | Multi-tenant mutualisé : inutile à cette échelle, et supprime l'isolation qui répond à C3 |
| D2 | Contenu en fichiers, panel hébergé sur le VPS du client | CMS SaaS ou base de données : ajoute une surface d'attaque et rend le contenu invisible depuis le dépôt (C4) |
| D3 | Le client édite les contenus, réordonne et masque les sections ; il n'en ajoute pas et ne crée pas de pages | Liberté totale : impose de gérer URLs, navigation et sitemap, et fragilise la DA |
| D4 | Périmètre : formulaire de contact, analytics léger, multilingue. Pas de blog | — |
| D5 | Le socle est un package installé depuis git par tag, doublé d'un CLI | Template de dépôt : les améliorations ne redescendent jamais. Registre npm privé : infra inutile à cette échelle |
| D6 | Panel d'édition maison, formulaires générés depuis les schémas | Keystatic, Sveltia, Decap : aucun ne couvre « panel authentifié sur VPS écrivant sur disque », et l'authentification reste à écrire dans tous les cas |
| D7 | TypeScript partout ; Astro pour le rendu ; React + Mantine pour le panel ; CSS natif, pas de Tailwind | Tailwind : ferait un troisième paradigme de style à côté de Mantine, pour le même résultat par un chemin plus long |
| D8 | Chaînes d'interface non éditables ; contenu traduisible imbriqué dans les champs ; structure de page partagée entre langues | Un fichier par langue : la structure s'écrit deux fois, donc elle diverge |
| D9 | Authentification : email + mot de passe généré + code à usage unique par email ; appareil de confiance 30 jours | Passkeys seules : iCloud ne sort pas de l'écosystème Apple et seuls 29 % des utilisateurs vont au bout du rattrapage par QR code |
| D10 | Enregistrer et publier sont deux actions distinctes ; preview du brouillon | Publication automatique : le client ne peut pas préparer un chantier, et chaque état intermédiaire devient public |
| D11 | Publication par bascule atomique de lien symbolique entre versions datées | Écriture en place : un build interrompu casse un site en production |
| D12 | Toute image téléversée est ré-encodée ; SVG interdit à l'upload | Conserver le fichier reçu : laisse passer les fichiers polyglottes et les charges utiles en métadonnées |
| D13 | Email via Brevo par défaut, derrière une interface agnostique | Resend : société américaine, or les leads sont des données personnelles. Postmark : meilleure délivrabilité mais 100 emails/mois gratuits |
| D14 | Analytics par analyse des logs Caddy, rapport dans le panel | GoatCounter ou Umami : ajoutent un script sur les pages ou un runtime supplémentaire sur la machine |
| D15 | Déploiement par Docker Compose | Bare metal : plus léger, mais le provisionnement diverge d'un VPS à l'autre — le défaut même que ce socle corrige |
