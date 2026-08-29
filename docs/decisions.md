# Décisions

Trente et une décisions actées, avec l'alternative écartée et sa raison. Les
détails d'application sont dans les documents thématiques.

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
| D16 | Le socle est un dépôt **public** | Privé : chaque VPS aurait besoin d'une clé de lecture GitHub, donc un secret de plus à distribuer, pour une confidentialité qui ne fait pas partie du modèle de sécurité |
| D17 | Le panel commit à chaque enregistrement, mais ne pousse qu'à la publication | Pousser à chaque enregistrement : l'enregistrement dépend alors du réseau, et l'historique distant ne correspond plus à ce qui est en ligne |
| D18 | Une langue s'active d'abord en préparation (`draft`) ; elle n'exige ses traductions qu'une fois en ligne | Activation directe : tout le site devient invalide d'un coup et le client ne peut plus rien publier tant qu'il n'a pas tout traduit |
| D19 | Les blocs de base sont une référence technique — un bloc par mécanique du socle — pas un catalogue de sections | Catalogue : les variantes visuelles sont du sur-mesure client, elles n'enseignent rien et se maintiennent pour rien |
| D20 | Le mot de passe initial n'est jamais transmis par email | Envoi par email : les deux facteurs arrivent dans la même boîte, le second facteur ne protège plus de rien |
| D21 | Un commentaire décrit l'existant ; le pourquoi d'un choix va dans ce fichier | Commentaires d'historique : ils vieillissent, personne ne les supprime, et ils noient les rares commentaires utiles |
| D22 | Pas de `utils.ts` ni de dossier `helpers/` : un helper vit dans le dossier de son domaine | Fourre-tout : personne ne le lit, tout le monde y ajoute — c'est là que la duplication s'accumule |
| D23 | Une mise à jour est atomique : elle aboutit entièrement, ou le dépôt revient à l'état d'avant | Suite d'étapes manuelles : un site à moitié migré est le pire état possible |
| D24 | Caddy comme reverse proxy | nginx : certificats à gérer avec certbot et son renouvellement, configuration quatre fois plus longue, en-têtes de proxy faciles à oublier |
| D25 | Le panel emploie le vocabulaire du client (« section », « mettre en ligne »), jamais celui du code | Vocabulaire technique : le client doit apprendre un modèle mental qui n'est pas le sien pour utiliser son propre site |
| D26 | Configuration en deux fichiers : `site.config.ts` versionné, `.env` non versionné | Tout dans un seul fichier : soit les clés partent sur GitHub, soit la DA cesse d'être versionnée |
| D27 | La doc agent du dépôt client est régénérée à chaque `npm install` dans `.claude/basalte.md`, importée par un `CLAUDE.md` écrit à la main | Doc générée une seule fois à l'init : fausse dès la première montée de version. Doc laissée dans `node_modules` : un agent ne la lit pas de façon fiable |
| D28 | Un bloc ne contient aucune valeur de style en dur : tout passe par un token | Valeurs en dur : la DA n'est plus pilotable depuis `site.config.ts` et chaque bloc dérive |
| D29 | La mise en production est une commande idempotente lancée depuis ta machine | Guide de provisionnement : jamais à jour, et chaque VPS finit différent — le défaut que D15 corrige |
| D30 | `basalte doctor` prouve la configuration au lieu de la vérifier : email réellement envoyé, DNS réellement résolu | Contrôle de forme : une clé présente mais fausse passe, et se découvre le jour où le client ne peut plus se connecter |
| D31 | Trois niveaux d'engagement — invariant, décidé, hypothèse — et le *comment* d'une phase se décide dans la phase | Tout figer d'avance : des choix pris sans pouvoir les évaluer, suivis par discipline, payés en dette. Ne rien figer : les invariants se perdent |
